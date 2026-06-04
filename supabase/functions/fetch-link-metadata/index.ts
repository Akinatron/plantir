import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

const maxBytes = 300_000;
const maxRedirects = 3;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const serviceClient = createServiceClient();
    await authenticateRequest(request, serviceClient);
    const url = parseUrl(await request.json());
    const result = await fetchMetadata(url);

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Metadata fetch failed.' }, 400);
  }
});

async function fetchMetadata(urlText: string, redirectCount = 0): Promise<{
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  finalUrl: string;
}> {
  if (redirectCount > maxRedirects) {
    throw new Error('Too many redirects.');
  }

  const url = new URL(urlText);
  await assertSafeUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'PlantirMetadataBot/1.0',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location) {
        throw new Error('Redirect without location.');
      }

      return fetchMetadata(new URL(location, url).toString(), redirectCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().includes('text/html')) {
      throw new Error('Metadata URL must return HTML.');
    }

    const html = await readLimitedText(response);

    return {
      title: readMeta(html, 'og:title') ?? readTitle(html),
      description: readMeta(html, 'og:description') ?? readMetaName(html, 'description'),
      imageUrl: resolveMaybeUrl(readMeta(html, 'og:image'), url),
      finalUrl: url.toString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function assertSafeUrl(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS URLs are allowed.');
  }

  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed.');
  }

  if (url.port && !['80', '443'].includes(url.port)) {
    throw new Error('Only standard HTTP and HTTPS ports are allowed.');
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Localhost URLs are not allowed.');
  }

  const addresses = await resolveHost(hostname);

  if (addresses.length === 0) {
    throw new Error('Could not resolve URL host.');
  }

  if (addresses.some(isBlockedIp)) {
    throw new Error('URL resolves to a private or reserved address.');
  }
}

async function resolveHost(hostname: string): Promise<string[]> {
  const addresses: string[] = [];

  try {
    addresses.push(...(await Deno.resolveDns(hostname, 'A')));
  } catch {
    // IPv4 may not exist.
  }

  try {
    addresses.push(...(await Deno.resolveDns(hostname, 'AAAA')));
  } catch {
    // IPv6 may not exist.
  }

  return addresses;
}

function isBlockedIp(address: string): boolean {
  if (address.includes(':')) {
    const normalized = address.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80') ||
      normalized === '::' ||
      normalized.startsWith('0:')
    );
  }

  const parts = address.split('.').map(Number);
  const [a = 0, b = 0] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function readLimitedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) {
    return '';
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (total < maxBytes) {
    const { value, done } = await reader.read();

    if (done || !value) {
      break;
    }

    chunks.push(value);
    total += value.byteLength;
  }

  return new TextDecoder().decode(concatBytes(chunks, Math.min(total, maxBytes)));
}

function concatBytes(chunks: Uint8Array[], total: number): Uint8Array {
  const output = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk.slice(0, Math.max(0, total - offset)), offset);
    offset += chunk.byteLength;

    if (offset >= total) {
      break;
    }
  }

  return output;
}

function readTitle(html: string): string | null {
  return decodeHtml(firstMatch(html, /<title[^>]*>(.*?)<\/title>/is));
}

function readMeta(html: string, property: string): string | null {
  const escaped = escapeRegExp(property);
  return decodeHtml(
    firstMatch(
      html,
      new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    ) ??
      firstMatch(
        html,
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
      ),
  );
}

function readMetaName(html: string, name: string): string | null {
  const escaped = escapeRegExp(name);
  return decodeHtml(
    firstMatch(
      html,
      new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    ),
  );
}

function firstMatch(html: string, pattern: RegExp): string | null {
  return pattern.exec(html)?.[1]?.trim() ?? null;
}

function decodeHtml(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()
    .slice(0, 500);
}

function resolveMaybeUrl(value: string | null, baseUrl: URL): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseUrl(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const url = (value as Record<string, unknown>).url;

  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('URL is required.');
  }

  return url.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
