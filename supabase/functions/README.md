# Edge Functions — Plantir

> Carpeta placeholder. Las Edge Functions se crean en **Fase 3**.
>
> Lista planificada (de `docs/02-briefing.md` §"Salidas esperadas" + análisis de
> la matriz de RLS):
>
> | Función | Trigger | Auth | Service role |
> |---|---|---|---|
> | `create-trip-invite` | Cliente (organizer) | `authenticated` | sí (genera token, hashea) |
> | `accept-trip-invite` | Cliente (cualquiera con token) | `authenticated` o `anon` | sí (crea membership, bump counter) |
> | `fetch-link-metadata` | Cliente (preview de URL) | `authenticated` | sí (SSRF protection + cache) |
> | `compute-date-poll-results` | Cliente (organizer) al cerrar | `authenticated` | sí (snapshot en `date_poll_results`) |
> | `close-date-poll` | Cliente (organizer) | `authenticated` | sí (transición atómica de estado) |
> | `compute-destination-results` | Cliente (organizer) al cerrar | `authenticated` | sí (snapshot en `destination_*_results`) |
> | `close-destination-poll` | Cliente (organizer) | `authenticated` | sí (transición atómica) |
> | `compute-trip-balances` | Cliente | `authenticated` | sí (settlement suggestions) |
> | `mark-settlement-paid` | Cliente (cobrador) | `authenticated` | sí (settlement_payments) |
> | `send-trip-notification` | Trigger Postgres / cliente | `service_role` | sí (inserts en `notifications`) |
>
> En esta fase (Fase 2) **no se implementan**. Se deja el directorio vacío
> con este README para que `supabase deploy functions` no falle.
