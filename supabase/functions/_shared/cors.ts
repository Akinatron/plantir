/**
 * CORS headers para Edge Functions de Supabase.
 *
 * En producción, restringe `Access-Control-Allow-Origin` al dominio de tu
 * app. En desarrollo, `*` es OK.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function preflightResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}
