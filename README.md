# Plantir

Plantir is a mobile app for planning group trips. It helps a group create a trip, invite members, choose dates, vote on accommodation, track shared expenses, settle balances, and manage post-decision planning.

## MVP Scope

- Email/password authentication with Supabase Auth.
- User profiles with display name, avatar, locale, currency, and timezone.
- Multiple trips per user.
- Secure invite links with expiration and max-use limits.
- Date poll with automatic deterministic winner.
- Destination/accommodation proposals with single-choice voting and tie resolution.
- Expenses using integer cents, equal splits, exclusions, balances, and settlement suggestions.
- Planning area with tasks, notes, packing list, and basic files list.
- In-app notifications, push token registration, and trip activity log.
- Supabase RLS and private Storage policies.

## Stack

- Expo + React Native
- TypeScript strict mode
- Expo Router
- React Hook Form + Zod
- TanStack Query
- Supabase Auth, PostgreSQL, Storage, RLS, and Edge Functions
- Expo Notifications
- Sentry React Native
- Jest + React Native Testing Library
- ESLint + Prettier
- EAS Build and EAS Submit

## Requirements

- Node.js 20+
- npm
- Expo CLI through `npx expo`
- EAS CLI for cloud builds
- Supabase CLI for database and Edge Function deployment
- iOS Simulator/Xcode or Android Studio for local device testing

## Local Setup

```sh
npm install
cp .env.example .env.local
npm run start
```

Fill `.env.local` with client-safe public values:

```sh
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0
```

Only `EXPO_PUBLIC_*` values are exposed to the mobile client. Never put service-role keys, Supabase access tokens, Sentry auth tokens, certificates, or store credentials in `EXPO_PUBLIC_*`.

## Scripts

```sh
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
npm run lint
npm run test
npm run test:watch
```

Release checks:

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo install --check
```

## Supabase

Migrations live in:

```text
supabase/migrations/
```

Edge Functions live in:

```text
supabase/functions/
```

Local Supabase:

```sh
supabase start
supabase db reset
```

Deploy migrations to a linked project:

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Deploy Edge Functions:

```sh
supabase functions deploy accept-trip-invite --project-ref <project-ref>
supabase functions deploy close-date-poll --project-ref <project-ref>
supabase functions deploy close-destination-poll --project-ref <project-ref>
supabase functions deploy compute-date-poll-results --project-ref <project-ref>
supabase functions deploy compute-destination-results --project-ref <project-ref>
supabase functions deploy compute-trip-balances --project-ref <project-ref>
supabase functions deploy create-task --project-ref <project-ref>
supabase functions deploy create-trip-invite --project-ref <project-ref>
supabase functions deploy fetch-link-metadata --project-ref <project-ref>
supabase functions deploy log-trip-activity --project-ref <project-ref>
supabase functions deploy mark-settlement-paid --project-ref <project-ref>
supabase functions deploy send-trip-notification --project-ref <project-ref>
supabase functions deploy update-task-status --project-ref <project-ref>
```

Set Edge Function secrets:

```sh
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The service role key must only exist in Supabase Edge Function secrets. It must never be exposed to the app.

## EAS Build

The project includes `eas.json` with development, staging, and production profiles.

```sh
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
eas build --profile staging --platform all
eas build --profile production --platform all
```

Configure EAS environment variables:

```sh
eas env:create --environment preview --name EXPO_PUBLIC_APP_ENV --value staging --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<staging-project-ref>.supabase.co --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <staging-anon-key> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value <staging-sentry-dsn> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE --value 0.2 --visibility plaintext
```

Production uses the `production` environment with production Supabase and Sentry values.

## EAS Submit

Replace placeholder App Store Connect values in `eas.json`, configure Google Play service account credentials in EAS, then run:

```sh
eas submit --profile staging --platform ios
eas submit --profile staging --platform android
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## Observability

Sentry is initialized in:

```text
src/lib/observability/sentry.ts
```

It is disabled unless `EXPO_PUBLIC_SENTRY_DSN` is set. PII collection is disabled.

The Sentry Expo config plugin is present in `app.json`. To enable native source map upload, create a Sentry org/project and set the EAS Sentry values described in `docs/PHASE_15_QA_SECURITY_DEPLOYMENT.md`.

## QA and Release

Use the Phase 15 release document before staging or production:

```text
docs/PHASE_15_QA_SECURITY_DEPLOYMENT.md
```

Minimum release gate:

- TypeScript passes.
- ESLint passes.
- Jest passes.
- Supabase migrations apply.
- Edge Functions deploy.
- RLS and Storage verification checklists pass.
- Manual QA checklist passes on staging builds.
- Sentry receives a staging test error.

## Project Structure

```text
app/                    Expo Router screens
src/components/         Shared UI and feedback components
src/features/           Feature-level providers
src/hooks/              TanStack Query hooks
src/lib/                Pure algorithms, validation, Supabase client, utilities
src/providers/          App-wide providers
src/services/           Supabase and Edge Function service wrappers
src/types/              App domain types
supabase/functions/     Edge Functions
supabase/migrations/    SQL migrations
docs/                   Product, technical, phase, QA, and deployment docs
```

## Security Notes

- RLS is the tenant boundary.
- Trip membership controls access to trip data.
- Activity log direct client writes are blocked.
- Invite tokens are hashed in the database.
- Money uses integer cents.
- Date fields use `date` for travel days and `timestamptz` for instants.
- Service role key stays server-side only.

## Current Branch

Active development branch:

```text
codex/phase-3-local-setup
```
