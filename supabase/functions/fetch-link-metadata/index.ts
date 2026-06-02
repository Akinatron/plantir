/**
 * fetch-link-metadata — Edge Function.
 *
 * Recibe una URL, hace un GET seguro (SSRF protection), parsea el HTML
 * y extrae title, description, image y domain.
 *
 * Decisión: la lógica de scraping es mínima y defensiva. No ejecutamos
 * JS, no seguimos redirects a IPs privadas, timeout 5s, max 1MB.
 */

import { z } from 'npm:zod@3';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';
import { log } from '../_shared/logger.ts';

const InputSchema = z.object({
  url: z.string().url().max(2000),
});

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isPrivateHost(hostname: string): boolean {
  // IPv4 simple check.
  if (PRIVATE_IP_RANGES.some((rx) => rx.test(hostname))) return true;
  // localhost
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  return false;
}

async function safeResolveDns(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, 'A');
    return records;
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const { url } = InputSchema.parse(await req.json());
    const parsed = new URL(url);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return errorResponse('validation', 'Protocolo no permitido', 422);
    }
    if (isPrivateHost(parsed.hostname)) {
      return errorResponse('forbidden', 'Host bloqueado por política SSRF', 403);
    }
    // DNS pre-check para evitar DNS rebinding.
    const ips = await safeResolveDns(parsed.hostname);
    if (ips.length === 0) {
      return errorResponse('not_found', 'No se pudo resolver el host', 404);
    }
    for (const ip of ips) {
      if (isPrivateHost(ip)) {
        return errorResponse('forbidden', 'IP privada bloqueada', 403);
      }
    }

    // Fetch con timeout y max size.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PlantirBot/1.0 (+https://plantir.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return errorResponse('server', `HTTP ${res.status}`, res.status);
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml')) {
      return errorResponse('validation', 'Tipo de contenido no soportado', 422);
    }
    const text = (await res.text()).slice(0, 1_000_000);

    // Extracción con regex (suficiente para MVP; sin librería externa).
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch =
      text.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ??
      text.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const imageMatch =
      text.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ??
      text.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    const faviconMatch = text.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);

    const title = titleMatch?.[1]?.trim();
    const description = descriptionMatch?.[1]?.trim();
    const image = imageMatch?.[1]?.trim();
    let favicon = faviconMatch?.[1]?.trim();
    if (favicon && !favicon.startsWith('http')) {
      favicon = new URL(favicon, parsed).toString();
    }

    log('info', 'link.metadata.fetched', { url: parsed.hostname });

    return jsonResponse({
      url: parsed.toString(),
      domain: parsed.hostname.replace(/^www\./, ''),
      title: title ?? parsed.hostname,
      description: description ?? null,
      image: image ?? null,
      favicon: favicon ?? null,
    });
  } catch (err) {
    return handleError(err);
  }
});
