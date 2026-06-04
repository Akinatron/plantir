# Phase 15: QA, Security Review, and Deployment

This document prepares Plantir MVP for a realistic staging release. It is intentionally operational: checklists, commands, and release gates.

Reference docs:

- Expo EAS Build: https://docs.expo.dev/build/eas-json/
- Expo EAS environment variables: https://docs.expo.dev/eas/environment-variables/
- Expo EAS Submit: https://docs.expo.dev/submit/introduction/
- Sentry React Native: https://docs.sentry.io/platforms/react-native/
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

## Release Gate

Do not release to staging unless all are true:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test -- --runInBand` passes.
- Supabase migrations apply cleanly to staging.
- Required Edge Functions deploy cleanly to staging.
- RLS manual verification passes for at least two users and two trips.
- Invite, date poll, destination voting, expenses, settlements, tasks, notifications, and activity work on a staging build.
- Service role key is not present in client env, app config, build logs, or source.
- Staging app points to staging Supabase only.

## Full Test Plan

### Automated

```sh
npm install
npm run typecheck
npm run lint
npm test -- --runInBand
```

Before a staging candidate, also run:

```sh
npx expo-doctor
npx expo install --check
npx expo export --platform all
```

### Supabase Local Smoke

Requires Supabase CLI and Docker.

```sh
supabase start
supabase db reset
supabase functions serve create-trip-invite --env-file .env.local
supabase functions serve accept-trip-invite --env-file .env.local
```

Use local Supabase credentials in `.env.local`:

```sh
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
```

### Staging Smoke

```sh
eas env:pull --environment preview .env.local
npm run start
eas build --profile staging --platform ios
eas build --profile staging --platform android
```

## Unit Test Checklist

- Auth validation accepts valid email/password and rejects weak inputs.
- Profile validation normalizes locale/currency/timezone fields.
- Trip validation enforces title, timezone, and date order.
- Date poll algorithm:
  - ranks by availability count
  - applies deterministic tie-breakers
  - handles required members
  - handles pending policy
  - handles min/max trip days
- Destination voting algorithm:
  - single-choice winner
  - tie detection
  - zero-vote handling
- Expenses algorithm:
  - equal split
  - excluded members
  - multiple payers
  - completed settlement payments
  - optimized settlements
  - per-currency zero-sum final balances
- Money helpers:
  - parse cents without floats
  - reject invalid money input
  - format integer cents clearly
- Planning validation:
  - task due dates
  - note content
  - packing quantity
- Component tests:
  - empty states render correct text
  - shared UI components keep accessibility labels

Recommended next automated tests:

- Add service tests with mocked Supabase client for notification preference updates.
- Add regression test for `TripProgressStepper` status mapping.
- Add route-level smoke tests once E2E tooling is introduced.

## Integration Test Checklist

Use two accounts: `owner@example.com` and `member@example.com`.

- Auth:
  - sign up
  - log in
  - log out
  - session restore after app restart
- Profiles:
  - create profile after signup
  - edit display name, locale, currency, timezone
  - upload avatar if storage is configured
- Trips:
  - owner creates trip
  - trip appears only for owner
  - second user cannot read trip before joining
- Invites:
  - owner creates invite with expiry and max uses
  - member opens invite while logged out
  - member logs in and accepts automatically
  - invite max use limit is enforced
  - revoked invite cannot be accepted
- Date poll:
  - owner creates date poll
  - member saves date availability
  - member cannot vote for another user
  - owner computes results
  - owner closes poll
  - final trip dates are saved
- Destination voting:
  - owner creates destination poll
  - member creates proposal when setting allows
  - member votes for one proposal
  - changing vote updates previous vote
  - tie requires manual owner/admin resolution
  - selected proposal snapshot is saved
- Expenses:
  - member creates expense when setting allows
  - equal split excludes selected members
  - balances compute by currency
  - settlement paid updates balances without deleting original records
- Planning:
  - member creates task
  - assignee updates status
  - completing task logs activity
  - notes and packing list are visible to members
- Notifications:
  - in-app notification row appears for selected events
  - actor is not notified for own action
  - push token registration stores token
  - disabled preferences suppress future notifications
- Activity:
  - trip activity shows important events
  - non-members cannot read activity

## Manual QA Checklist

### General

- App starts with no crash on a clean install.
- App handles missing Supabase env with a clear error state.
- All screens work in portrait mobile layout.
- Back navigation returns to the expected previous screen.
- No screen has overlapping text at small viewport widths.
- Primary buttons are easy to find and not duplicated.
- Success notices appear after in-place saves.
- Loading states do not flash forever.
- Error states show a useful next action or retry path.

### Auth and Profile

- Login failure text is understandable.
- Signup success tells the user to check or continue based on configured auth flow.
- Profile edit form preserves existing values.
- Avatar upload failure does not corrupt profile text fields.

### Trip Dashboard

- Progress stepper reflects lifecycle:
  - Group
  - Dates
  - Place
  - Plan
  - Expenses
- Main CTA changes by trip status.
- Secondary actions are grouped and not overwhelming.

### Empty States

- No trips: offers create trip.
- No members: tells user to create/share invite.
- No date poll: tells admin to start poll.
- No date votes/results: asks members to save availability.
- No proposals: asks group to add options.
- No expenses: explains that balances need expenses.
- No tasks: asks user to create first task.
- No notifications/activity/files: explains what will appear later.

### Decisions

- Closing date poll shows confirmation.
- Closing destination poll shows confirmation.
- Destination tie resolution clearly names proposals.
- Final date and selected place are visible after closing.
- Results are not silently changed after closing.

### Money

- Amount fields accept normal decimal input.
- Displayed amounts use currency codes/symbols consistently.
- Settlement paid confirmation states that original expenses remain.
- Balances by currency do not mix currencies.

### Accessibility

- Buttons have 44px or larger target height.
- Text contrast is readable on light backgrounds.
- Screen reader can identify main buttons, vote controls, checklist items, notifications, and trip cards.
- Dynamic text does not clip in buttons/cards.

## RLS Verification Checklist

Run against staging with two users and at least two trips.

### Membership Boundary

- User A cannot select trips where User A is not a joined `trip_member`.
- User A cannot select polls, proposals, expenses, tasks, notes, packing items, settlements, notifications, or activity from User B-only trips.
- Removed members lose access.

### Role Boundaries

- Member cannot update trip settings.
- Member cannot close polls.
- Member cannot manage roles.
- Owner/admin can manage settings and close polls.
- Owner/admin can reactivate/reopen where supported.

### Voting

- User cannot insert/update date vote rows for another `user_id`.
- User cannot insert/update destination vote rows for another `user_id`.
- Destination vote remains single-choice per poll.
- Closed polls reject new client writes.

### Expenses

- Members can create expenses only when trip setting allows.
- Members cannot create expenses for non-member payer/split users.
- Users can read only expenses from joined trips.
- Settlement payments are restricted to payer/receiver/admin by Edge Function.

### Notifications and Activity

- User can read only own notifications.
- User can update only own notification status.
- Direct client writes to `activity_log` fail.
- Trip activity reads require trip membership.

### Example Manual SQL Checks

Use Supabase SQL editor with auth simulation or write small client scripts with each user JWT.

```sql
select * from public.trips;
select * from public.activity_log where trip_id = '<foreign-trip-id>';
insert into public.activity_log(trip_id, actor_user_id, actor_type, event_type)
values ('<trip-id>', '<user-id>', 'user', 'manual_client_insert');
```

Expected:

- Foreign trip reads return zero rows.
- Direct `activity_log` insert is denied for authenticated client role.

## Storage Policy Verification Checklist

Buckets:

- `avatars`
- `trip-covers`
- `proposal-images`
- `receipts`
- `trip-files`

Verify:

- Avatar:
  - user can upload/update own avatar path
  - another user cannot overwrite avatar path
- Trip covers:
  - members can read cover for joined trip
  - owner/admin can update
  - non-member cannot read
- Proposal images:
  - member can upload proposal image only for joined trip
  - non-member cannot read
- Receipts:
  - member can upload receipt only under joined trip path
  - non-member cannot read
- Trip files:
  - member can upload/read under joined trip path
  - owner/admin can update/delete
  - non-member denied

Manual commands:

```sh
supabase storage ls avatars
supabase storage ls trip-files
```

Also test through the app because Storage RLS depends on object paths.

## Security Review

### Dependency Audit

Current command:

```sh
npm audit --audit-level=high
```

Current result at Phase 15:

- High/critical gate: pass.
- Moderate advisories remain through Expo/Sentry transitive dependencies around `uuid`/`xcode`.
- `npm audit fix --force` currently proposes a breaking Expo downgrade, so do not apply it blindly.

Staging decision:

- Accept for internal staging.
- Re-check before production.
- Track Expo SDK and `@sentry/react-native` updates.
- Do not ship public production if high/critical advisories appear.

### Secrets

- Only `EXPO_PUBLIC_*` variables are bundled into the app.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` is acceptable in the client because RLS enforces access.
- Never put `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, store credentials, or `SENTRY_AUTH_TOKEN` in `EXPO_PUBLIC_*`.
- Do not commit `.env`, `.env.local`, service account JSON, certificates, provisioning profiles, or keystores.

Commands:

```sh
git grep -n "SERVICE_ROLE\\|service_role\\|SENTRY_AUTH_TOKEN\\|SUPABASE_ACCESS_TOKEN\\|PRIVATE_KEY"
git status --ignored --short
```

### Service Role Key

- Service role key is used only in Supabase Edge Function environment.
- Edge Functions authenticate incoming requests before privileged operations.
- Client never receives service role key.
- Build logs must not print service role env.

Deploy function secret:

```sh
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### RLS

- RLS is enabled on exposed tables.
- Activity log direct writes are blocked.
- Notifications are user-scoped.
- Membership helper functions use `security definer` patterns already reviewed in Phase 5.

### Edge Function Validation

Current Edge Functions validate:

- HTTP method
- auth bearer token
- required body fields
- membership/admin permissions
- poll/trip ownership relationships
- invite token hash and expiry/max-use state
- destination metadata URL constraints

Before staging, manually test malformed bodies:

```sh
curl -i -X POST "$SUPABASE_URL/functions/v1/close-date-poll" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 400 with clear error.

### SSRF Protection

`fetch-link-metadata` must continue to:

- allow only `http` and `https`
- reject localhost/private IP ranges
- reject redirects to private networks
- apply timeout
- limit response size
- parse only metadata

Staging tests:

```sh
curl -i -X POST "$SUPABASE_URL/functions/v1/fetch-link-metadata" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"url":"http://127.0.0.1:54321"}'
```

Expected: blocked.

### Rate Limiting Recommendations

MVP does not include hard rate limiting yet. Add before public launch:

- Edge Function per-user rate limits for:
  - invite creation
  - invite acceptance
  - metadata fetching
  - notification sending
  - poll closing
- Store counters in Postgres or Upstash Redis.
- Add CAPTCHA or email verification before accepting broad public invite abuse.
- Add server-side idempotency keys for actions that create records.

Recommended MVP staging limits:

- invite creation: 10 per trip per hour
- metadata fetch: 30 per user per hour
- notification send: 20 per trip per hour
- settlement mark paid: 30 per trip per hour

### File Upload Validation

Current Storage policies and bucket MIME limits exist for core buckets, but client upload UX is incomplete for files/receipts. Before public launch:

- validate MIME type client-side and server-side where possible
- enforce size limits per bucket
- generate deterministic paths under trip/user IDs
- never trust filename extensions
- strip EXIF metadata from images where privacy matters
- block executable/script uploads in `trip-files`
- use signed URLs, not public buckets, for private trip assets

### Privacy

- Trip membership is tenant boundary.
- Invite links use hashed tokens in database.
- Activity log should not include private notes, exact emails, payment identifiers, or raw invite tokens.
- Sentry setup disables `sendDefaultPii`.
- Avoid logging Supabase JWTs, service keys, push tokens, or raw URLs with private query params.
- Notifications should include summaries, not sensitive payment details.

## Performance Review

Current MVP is acceptable for small friend groups. Watch:

- dashboard queries: currently loads trip, members, and planning summary
- balance queries: computation runs through Edge Function and can be expensive for large expense sets
- notifications tab: capped to 100 rows
- activity tab: capped to 100 rows
- storage list: capped to 50 files
- proposal image signed URLs should be cached carefully

Recommended indexes already exist for:

- trip membership
- trip-scoped tables
- notification status
- activity created_at
- settlement and expense relationships

Before production:

- Add pagination for expenses, activity, notifications, proposals, and tasks.
- Add pull-to-refresh instead of repeated automatic recomputation where possible.
- Monitor slow Postgres queries in Supabase.
- Consider materialized balance snapshots if expense count grows.

## Error Handling Review

Current:

- Forms surface validation errors.
- Screens have loading/error/empty states.
- Important decisions show confirmations.
- Non-critical notifications/activity logging are non-blocking.

Before staging:

- Confirm every Edge Function returns JSON error shape.
- Confirm app does not expose raw Postgres details to normal users for common errors.
- Confirm retry behavior does not duplicate writes.
- Confirm offline/network errors are understandable.

Recommended later:

- Add global error boundary with Sentry capture.
- Add offline banner.
- Add idempotency for create actions.

## Observability

### Sentry Setup

Installed package:

```sh
npx expo install @sentry/react-native
```

Runtime init is in:

```text
src/lib/observability/sentry.ts
```

Public env:

```sh
EXPO_PUBLIC_SENTRY_DSN=https://public-key@o000000.ingest.sentry.io/000000
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
EXPO_PUBLIC_APP_ENV=staging
```

The Sentry Expo config plugin is present in `app.json`:

```json
"@sentry/react-native"
```

For source map upload, create the Sentry org/project and set EAS secrets:

```sh
eas env:create --environment preview --name SENTRY_AUTH_TOKEN --value <token> --visibility secret
eas env:create --environment production --name SENTRY_AUTH_TOKEN --value <token> --visibility secret
eas env:create --environment preview --name SENTRY_ORG --value <org> --visibility plaintext
eas env:create --environment production --name SENTRY_ORG --value <org> --visibility plaintext
eas env:create --environment preview --name SENTRY_PROJECT --value plantir-mobile --visibility plaintext
eas env:create --environment production --name SENTRY_PROJECT --value plantir-mobile --visibility plaintext
```

### Edge Function Logs

Supabase dashboard:

- Functions -> function -> Logs

CLI:

```sh
supabase functions logs send-trip-notification --project-ref <project-ref>
supabase functions logs fetch-link-metadata --project-ref <project-ref>
```

Log events to watch:

- auth failures
- permission denials
- metadata fetch rejects
- balance computation errors
- notification push API failures

### Useful Analytics Events

Add privacy-safe analytics later:

- `trip_created`
- `invite_created`
- `invite_accepted`
- `date_poll_created`
- `date_vote_saved`
- `date_poll_closed`
- `destination_poll_created`
- `proposal_created`
- `destination_vote_saved`
- `destination_poll_closed`
- `expense_created`
- `balances_computed`
- `settlement_marked_paid`
- `task_created`
- `task_completed`
- `notification_preference_changed`

Do not send:

- raw invite tokens
- emails
- payment identifiers
- exact note bodies
- raw URLs with query params

## Local Development Instructions

```sh
npm install
cp .env.example .env.local
npm run start
```

Run platforms:

```sh
npm run ios
npm run android
npm run web
```

Quality checks:

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
```

Supabase local:

```sh
supabase start
supabase db reset
supabase functions serve --env-file .env.local
```

Deploy a single function to staging:

```sh
supabase functions deploy create-trip-invite --project-ref <staging-project-ref>
```

Deploy all functions:

```sh
supabase functions deploy accept-trip-invite --project-ref <staging-project-ref>
supabase functions deploy close-date-poll --project-ref <staging-project-ref>
supabase functions deploy close-destination-poll --project-ref <staging-project-ref>
supabase functions deploy compute-date-poll-results --project-ref <staging-project-ref>
supabase functions deploy compute-destination-results --project-ref <staging-project-ref>
supabase functions deploy compute-trip-balances --project-ref <staging-project-ref>
supabase functions deploy create-task --project-ref <staging-project-ref>
supabase functions deploy create-trip-invite --project-ref <staging-project-ref>
supabase functions deploy fetch-link-metadata --project-ref <staging-project-ref>
supabase functions deploy log-trip-activity --project-ref <staging-project-ref>
supabase functions deploy mark-settlement-paid --project-ref <staging-project-ref>
supabase functions deploy send-trip-notification --project-ref <staging-project-ref>
supabase functions deploy update-task-status --project-ref <staging-project-ref>
```

## Staging Setup

1. Create a Supabase staging project.
2. Apply migrations.
3. Deploy Edge Functions.
4. Set secrets.
5. Create EAS preview environment values.
6. Build staging app.
7. Run manual QA.

Commands:

```sh
supabase login
supabase link --project-ref <staging-project-ref>
supabase db push
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

eas login
eas build:configure
eas env:create --environment preview --name EXPO_PUBLIC_APP_ENV --value staging --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<staging-project-ref>.supabase.co --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <staging-anon-key> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value <staging-sentry-dsn> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE --value 0.2 --visibility plaintext

eas build --profile staging --platform ios
eas build --profile staging --platform android
```

Staging data:

- create test owner account
- create test member account
- create one trip with full lifecycle data
- create one closed trip
- create one trip where current user is not a member for negative RLS checks

## Production Setup

1. Create separate Supabase production project.
2. Enable email/auth settings and allowed redirect URLs.
3. Apply migrations.
4. Deploy all Edge Functions.
5. Set production secrets.
6. Configure backups and PITR if available.
7. Configure Sentry production project.
8. Configure app store credentials.
9. Build production binaries.
10. Submit to app stores.

Commands:

```sh
supabase link --project-ref <production-project-ref>
supabase db push
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

eas env:create --environment production --name EXPO_PUBLIC_APP_ENV --value production --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<production-project-ref>.supabase.co --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <production-anon-key> --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <production-sentry-dsn> --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE --value 0.05 --visibility plaintext

eas build --profile production --platform ios
eas build --profile production --platform android
```

Production release gates:

- staging QA passed
- security checklist passed
- privacy copy reviewed
- app store metadata ready
- crash monitoring enabled
- rollback plan documented

## EAS Build Setup

Config file:

```text
eas.json
```

Profiles:

- `development`: internal dev client
- `staging`: internal distribution
- `production`: store-ready build with auto-increment

Commands:

```sh
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
eas build --profile staging --platform all
eas build --profile production --platform all
```

## EAS Submit Setup

Staging/internal:

```sh
eas submit --profile staging --platform android
eas submit --profile staging --platform ios
```

Production:

```sh
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Before running EAS Submit:

- Apple Developer account active.
- App Store Connect app created.
- `ascAppId` replaced in `eas.json`.
- Google Play app created.
- Google service account key configured in EAS.
- Android package name and iOS bundle identifier match store apps.

## App Store Checklist

- Bundle ID: `com.akinatron.plantir`
- App name: Plantir
- Category: Travel
- Age rating completed.
- Privacy policy URL live.
- Support URL live.
- Screenshots for required iPhone sizes.
- App description clear and not overclaiming.
- Data collection answers match reality:
  - account/profile data
  - trip planning data
  - photos/files if uploads enabled
  - diagnostics if Sentry enabled
- Sign in works for reviewers.
- Test credentials prepared if needed.
- Push notification purpose explained.
- No placeholder text or debug screens.
- Version and build number incremented.
- Export compliance answered.
- App review notes include invite link behavior.

## Google Play Checklist

- Package name: `com.akinatron.plantir`
- App name: Plantir
- App category: Travel & Local or Productivity, choose based on final positioning.
- Internal testing track configured.
- Privacy policy URL live.
- Data Safety form completed accurately.
- Content rating questionnaire completed.
- Screenshots and feature graphic uploaded.
- App signing configured.
- Target API level accepted by Play Console.
- Test credentials prepared if needed.
- Push notification disclosure matches behavior.
- Closed testing requirements reviewed for the target release market.
- Production track release notes written.

## Final MVP Acceptance Criteria

### Product

- User can sign up, log in, and maintain a profile.
- User can create multiple trips.
- Owner/admin can invite members with secure expiring/max-use links.
- Trip members can join through invite link.
- Date poll supports availability statuses and automatic deterministic winner.
- Owner/admin can close date poll; app saves final dates.
- Destination poll supports single-choice voting.
- App computes destination ranking; owner/admin resolves ties only.
- Selected destination snapshot is saved.
- Members can add MVP expenses with integer cents and equal split exclusions.
- App computes balances and optimized settlements.
- Settlements can be marked paid without deleting original debts.
- Planning area supports tasks, notes, packing list, and basic files list.
- Notifications and activity show important trip updates.
- Closed trips are read-only.

### Security

- External users cannot read trip data.
- Members access only their trips.
- Users cannot vote for another user.
- Non-admins cannot close polls or manage roles.
- Service role key is never exposed to client.
- Storage access is trip/member scoped.
- Activity log direct client writes are blocked.

### Quality

- All automated checks pass.
- Staging build installs on iOS and Android.
- Manual QA checklist passes.
- RLS/storage checklist passes.
- Sentry receives a test error in staging.
- Edge Function logs show no unexpected permission failures during QA.
