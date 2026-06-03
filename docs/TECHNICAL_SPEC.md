# Plantir Technical Architecture

## 1. Final Chosen Stack

### Mobile Frontend

- React Native.
- Expo.
- TypeScript strict mode.
- Expo Router.
- React Hook Form.
- Zod.
- TanStack Query.
- Zustand only for small local UI state when useful.
- date-fns.
- Expo SecureStore where sensitive local values are needed.
- Expo Image Picker for proposal photos.
- Expo Linking for invite links.
- Expo Notifications reserved for V1 unless pulled forward.

### Backend

- Supabase Auth.
- Supabase PostgreSQL.
- Row Level Security on all exposed tables.
- Supabase Storage.
- Supabase Realtime where useful.
- Supabase Edge Functions in TypeScript/Deno.

### DevOps and Quality

- Supabase CLI with versioned migrations.
- EAS Build.
- EAS Submit.
- GitHub Actions or equivalent CI.
- Jest.
- React Native Testing Library.
- Edge Function integration tests where useful.
- Sentry.

## 2. Technology Decisions

### Decision: Use React Native with Expo.

- Decision: Build Plantir with React Native and Expo.
- Reason: Expo gives fast mobile iteration, reliable native module access, EAS build support, and good iOS/Android parity.
- Alternatives: Native Swift/Kotlin, Flutter, React Native without Expo.
- Risk: Some native customization may be harder inside Expo.
- Mitigation: Stay within Expo-supported modules for MVP and use config plugins or prebuild only if required later.

### Decision: Use TypeScript strict mode.

- Decision: TypeScript strict mode is mandatory.
- Reason: Plantir has money, roles, permissions, and decision logic where weak typing creates avoidable bugs.
- Alternatives: Standard TypeScript settings or JavaScript.
- Risk: Strict mode slows early setup.
- Mitigation: Define shared domain types early and avoid broad abstractions.

### Decision: Use Expo Router.

- Decision: Use Expo Router for file-based navigation.
- Reason: The app has many nested trip routes, and file-based routing keeps navigation discoverable.
- Alternatives: React Navigation configured manually.
- Risk: Dynamic trip routes can become messy.
- Mitigation: Keep route files thin and move logic into feature modules.

### Decision: Use TanStack Query for server state.

- Decision: All remote data fetching, caching, refetching, and optimistic updates go through TanStack Query.
- Reason: Trips, votes, proposals, expenses, and balances are server-owned collaborative data.
- Alternatives: Zustand for everything, raw component effects, Apollo.
- Risk: Query keys and invalidation can become inconsistent.
- Mitigation: Centralize query keys per feature module.

### Decision: Use React Hook Form with Zod.

- Decision: Forms use React Hook Form and Zod schemas.
- Reason: The app has many validated forms, and the same validation concepts can map to Edge Functions later.
- Alternatives: Formik, uncontrolled forms, manual validation.
- Risk: Schema duplication between app and Edge Functions.
- Mitigation: Keep validation schemas structured by feature and mirror server validation intentionally.

### Decision: Use Supabase as the backend platform.

- Decision: Use Supabase Auth, PostgreSQL, RLS, Storage, Realtime, and Edge Functions.
- Reason: Plantir needs auth, relational data, permissions, files, and server-side workflows. Supabase gives these without building a custom backend first.
- Alternatives: Firebase, custom Node backend, Appwrite.
- Risk: RLS complexity is high.
- Mitigation: Treat RLS as a first-class implementation phase and test permission boundaries.

### Decision: Store money as integer cents.

- Decision: All money values use integer cents and ISO 4217 currency codes.
- Reason: Floating point math is unsafe for balances and settlement calculations.
- Alternatives: Decimal values in the client, floats.
- Risk: Rounding and split remainders still need careful handling.
- Mitigation: Use pure tested money utilities and deterministic remainder assignment.

## 3. UI Library Choice

### Decision: Use a small custom UI layer built on React Native primitives.

- Decision: Build Plantir's MVP UI with local reusable components, design tokens, and React Native primitives instead of a heavy UI kit.
- Reason: Plantir needs a friendly but clear mobile product language. A small internal UI layer gives control over status cards, voting states, expense rows, accessibility, and mobile spacing without fighting a large component library.
- Alternatives: React Native Paper, Tamagui, NativeWind.
- Risk: Custom components can become inconsistent.
- Mitigation: Create a limited set of primitives first: `Screen`, `Text`, `Button`, `IconButton`, `TextField`, `Card`, `ListItem`, `EmptyState`, `ErrorState`, `LoadingState`, `StatusPill`, `RoleBadge`, and form wrappers.

Use icons from a React Native compatible icon package, preferably `lucide-react-native`, for actions and navigation affordances.

## 4. Textual Architecture Diagram

```text
Mobile App (Expo + React Native)
  |
  |-- Expo Router screens
  |-- Feature modules
  |-- UI components
  |-- Hooks
  |-- Zod validation
  |-- Pure algorithms
  |-- TanStack Query cache
  |
  v
Supabase Client
  |
  |-- Auth session
  |-- PostgREST queries guarded by RLS
  |-- Storage uploads/downloads guarded by policies
  |-- Realtime subscriptions for active collaborative screens
  |-- Edge Function calls for sensitive workflows
  |
  v
Supabase Backend
  |
  |-- Auth
  |-- PostgreSQL tables
  |-- RLS helper functions and policies
  |-- Storage buckets
  |-- Realtime
  |-- Edge Functions
  |
  v
External Services
  |
  |-- Sentry
  |-- Link metadata fetch targets
  |-- EAS / app stores
```

## 5. Frontend Architecture

### App Routing

Routes are grouped by product area and kept thin. Route files should compose feature screens and pass route params only.

Auth:

- `/welcome`
- `/login`
- `/signup`
- `/auth/callback`

Tabs:

- `/(tabs)/trips`
- `/(tabs)/notifications`
- `/(tabs)/profile`

Trips:

- `/trips/create`
- `/trips/[tripId]`
- `/trips/[tripId]/settings`
- `/trips/[tripId]/members`
- `/trips/[tripId]/invite`
- `/trips/[tripId]/activity`

Date poll:

- `/trips/[tripId]/date-poll/setup`
- `/trips/[tripId]/date-poll/vote`
- `/trips/[tripId]/date-poll/results`

Destination:

- `/trips/[tripId]/destination/setup`
- `/trips/[tripId]/destination/proposals`
- `/trips/[tripId]/destination/proposals/create`
- `/trips/[tripId]/destination/proposals/[proposalId]`
- `/trips/[tripId]/destination/results`

Expenses:

- `/trips/[tripId]/expenses`
- `/trips/[tripId]/expenses/create`
- `/trips/[tripId]/expenses/[expenseId]`
- `/trips/[tripId]/balances`
- `/trips/[tripId]/settlements`

Invitation:

- `/invite/[token]`

Planning routes are deferred until the planning feature is implemented.

### Screens

Screens should be feature-specific and state-complete.

Each screen must handle:

- Loading.
- Empty.
- Error.
- Success.
- Permission denied.
- Closed trip/read-only state where relevant.

Examples:

- `TripsListScreen`
- `TripDashboardScreen`
- `CreateTripScreen`
- `TripInviteScreen`
- `DatePollSetupScreen`
- `DatePollVoteScreen`
- `DatePollResultsScreen`
- `DestinationProposalListScreen`
- `DestinationProposalDetailScreen`
- `DestinationResultsScreen`
- `ExpenseListScreen`
- `CreateExpenseScreen`
- `BalancesScreen`

### Components

Component layers:

- UI primitives: buttons, text, inputs, cards, badges, screen shell.
- Domain components: `TripStatusProgress`, `NextActionPanel`, `MemberRow`, `DateAvailabilityCalendar`, `DestinationProposalCard`, `ExpenseRow`, `BalanceSummary`.
- Form components: fields integrated with React Hook Form.
- Feedback components: empty, error, loading, permission, closed-state banners.

Rules:

- Keep route files thin.
- Keep screens readable.
- Extract reusable domain components only when the same behavior appears more than once.
- Do not place business logic inside UI primitives.

### Hooks

Hooks should wrap queries, mutations, and reusable feature behavior.

Examples:

- `useSession`
- `useProfile`
- `useTrips`
- `useTripDashboard`
- `useTripMembers`
- `useCreateTrip`
- `useInvite`
- `useAcceptInvite`
- `useDatePoll`
- `useSubmitDateAvailability`
- `useDestinationProposals`
- `useDestinationVote`
- `useExpenses`
- `useBalances`
- `useTripPermissions`

### Services

Services wrap Supabase calls and Edge Function calls.

Examples:

- `authService`
- `profileService`
- `tripService`
- `inviteService`
- `datePollService`
- `destinationService`
- `expenseService`
- `balanceService`
- `storageService`

Services should not contain React code.

### Validation

Use Zod schemas for:

- Sign up.
- Login.
- Profile update.
- Trip creation/update.
- Invite create/regenerate.
- Date poll setup.
- Date availability submission.
- Destination proposal create/update.
- Destination vote.
- Expense creation/update.
- Trip settings.
- Close/reopen actions.

Validation is required in the client for UX and repeated in Edge Functions or database constraints for security.

### Algorithms

Pure algorithms live under `src/lib/algorithms`.

Required files:

- `datePoll.ts`
- `destinationVoting.ts`
- `expenses.ts`
- `money.ts`

Rules:

- No UI imports.
- No Supabase imports.
- No network calls.
- Deterministic outputs.
- Unit-tested edge cases.

Date poll algorithm:

- Uses available/unavailable votes.
- Missing dates are unavailable.
- Determines winning date range automatically.
- Tie-breakers:
  1. highest available member count
  2. highest available percentage
  3. closest to preferred duration, if configured
  4. earliest start date

Destination voting algorithm:

- Single-choice.
- One vote per member.
- Highest vote count wins.
- Ties are returned for owner/admin resolution.

Expense algorithms:

- Equal split with exclusions.
- Integer-cent split rows.
- Deterministic remainder assignment.
- Net balances.
- Optimized settlements.

### State Management

Server state:

- TanStack Query.

Local form state:

- React Hook Form.

Local UI state:

- Component state first.
- Zustand only for small cross-screen UI state if needed.

Do not duplicate server-owned trip data in Zustand.

## 6. Backend Architecture

### Supabase Auth

Supabase Auth handles:

- Email/password auth for MVP unless another provider is later approved.
- Session management.
- Auth user identity used by RLS through `auth.uid()`.
- Invite flows that require login before joining.

Profiles are stored in `public.profiles`, keyed by `auth.users.id`.

### PostgreSQL

PostgreSQL stores:

- Profiles.
- Trips.
- Trip members.
- Invites.
- Polls.
- Date availability.
- Date results.
- Destination proposals.
- Destination votes.
- Expenses.
- Expense payers.
- Expense splits.
- Settlement suggestions.
- Settlement payments.
- Activity log.

Guidelines:

- UUID primary keys.
- Foreign keys on ownership and membership relationships.
- Indexed foreign keys.
- Indexed RLS lookup columns.
- Check constraints for positive money amounts and valid ranges.
- Soft delete where records need auditability.

### RLS

RLS is mandatory on exposed tables.

Helper functions:

- `is_trip_member(trip_id, user_id)`
- `is_trip_admin(trip_id, user_id)`
- `can_manage_trip(trip_id, user_id)`
- `can_vote_poll(poll_id, user_id)`
- `can_create_destination_proposal(poll_id, user_id)`
- `can_manage_expense(expense_id, user_id)`
- `is_trip_read_only(trip_id)`

RLS rules:

- Users can only read trips where they are joined members.
- Users can only read members for trips they belong to.
- Only owner/admin can manage members.
- Only owner can delete a trip.
- Only joined members can vote.
- Users cannot vote for another user.
- Only owner/admin can close or reopen polls.
- Members can create proposals only when the trip setting allows it.
- Members can create expenses only when the trip setting allows it.
- Closed trips block member writes.
- Activity log is not directly writable by clients.

### Storage

Buckets:

- `avatars`
- `trip-covers`
- `proposal-images`
- `receipts`
- `trip-files`

MVP priority:

- `avatars`
- `proposal-images`

Storage policies:

- Users can manage their own avatar.
- Trip members can read proposal images for their trips.
- Proposal creator/admin can upload/delete proposal images while trip is not closed.
- Receipts and trip files are V1 unless pulled forward.

### Realtime

Use Realtime where collaboration benefits are immediate:

- Date votes and date results.
- Destination proposals and votes.
- Expenses and balances when viewing the trip.

Do not subscribe globally to everything. Subscribe per active screen and clean up on unmount.

### Edge Functions

Edge Functions handle sensitive or coordinated operations:

- `create-trip-invite`
- `accept-trip-invite`
- `fetch-link-metadata`
- `compute-date-poll-results`
- `close-date-poll`
- `compute-destination-results`
- `close-destination-poll`
- `compute-trip-balances`
- `mark-settlement-paid`
- `send-trip-notification` for V1

Edge Functions must:

- Validate inputs.
- Check permissions.
- Avoid service role exposure.
- Avoid logging secrets.
- Return structured errors.

## 7. Data Flow Examples

### Creating a Trip

```text
CreateTripScreen
  -> Zod validates form
  -> useCreateTrip mutation
  -> tripService creates trip
  -> database creates trip row and owner membership
  -> RLS permits owner access
  -> TanStack Query invalidates trip list
  -> user navigates to TripDashboardScreen
```

Notes:

- The creator becomes owner.
- The trip starts at `group_created`.
- Dashboard computes next action from status and missing setup.

### Joining by Invite

```text
/invite/[token]
  -> user logs in if needed
  -> accept-trip-invite Edge Function
  -> hash token
  -> validate invite time and use count
  -> insert membership if needed
  -> increment use count
  -> return trip id
  -> navigate to trip dashboard
```

Notes:

- Raw invite tokens are never stored.
- Expired or fully used invites fail clearly.
- Existing members are not duplicated.

### Voting on Dates

```text
DatePollVoteScreen
  -> load active poll and allowed dates
  -> member marks available dates
  -> Zod validates dates
  -> useSubmitDateAvailability mutation
  -> write only current user's availability rows
  -> Realtime/query invalidation updates results
  -> compute-date-poll-results ranks date ranges
```

Notes:

- Missing dates are unavailable.
- Users can only edit their own availability.
- Winner is automatic and deterministic.

### Choosing a Destination

```text
DestinationProposalListScreen
  -> members create proposals if setting allows
  -> members cast one vote
  -> compute-destination-results counts votes
  -> if one winner, close-destination-poll selects it
  -> if tied, owner/admin chooses among tied proposals
  -> trip moves to place_decided
```

Notes:

- Destination voting is single-choice.
- The app determines the result by vote count.
- Only tied destination results are manually resolved.

### Adding an Expense

```text
CreateExpenseScreen
  -> Zod validates amount, currency, payer, participants
  -> money utility converts display amount to cents
  -> expense algorithm creates equal splits with exclusions
  -> useCreateExpense mutation
  -> write expense, payers, splits
  -> invalidate expenses and balances
```

Notes:

- Money uses integer cents.
- Excluded members receive no split row.
- Closed trips reject writes.

### Calculating Settlements

```text
BalancesScreen
  -> useBalances query
  -> compute-trip-balances Edge Function if stale or requested
  -> read expenses, payers, splits
  -> pure algorithm computes net balances
  -> pure algorithm suggests optimized settlements
  -> store/read settlement suggestions
  -> display who pays whom
```

Notes:

- Settlement suggestions preserve net balances.
- The algorithm minimizes payments where practical.
- No floating point calculations.

## 8. Security Architecture

Security is layered:

1. Client validation for user experience.
2. Database constraints for data integrity.
3. RLS for authorization.
4. Edge Functions for sensitive workflows.
5. Storage policies for files.

Key rules:

- Client permissions are never the only protection.
- Service role key is never available in the mobile app.
- RLS uses membership and role helper functions.
- Users cannot act as another user.
- Closed trips are read-only for members.
- Invite tokens are hashed at rest.
- Edge Function logs must not include raw tokens, auth tokens, or secrets.
- Activity log is written only by trusted backend paths.

Security-sensitive workflows:

- Accept invite.
- Create/regenerate invite.
- Close/reopen polls.
- Resolve destination tie.
- Compute balances.
- Mark settlement paid.
- Upload proposal images.

## 9. Testing Architecture

### Unit Tests

Use Jest for pure logic:

- `datePoll.test.ts`
- `destinationVoting.test.ts`
- `money.test.ts`
- `expenses.test.ts`

Required coverage:

- Date availability edge cases.
- Date tie-breaker order.
- Destination single-choice voting.
- Destination tied proposals.
- Equal splits.
- Exclusions.
- Remainder handling.
- Net balances.
- Optimized settlements.

### Component Tests

Use React Native Testing Library for:

- Auth forms.
- Create trip form.
- Invite error states.
- Date poll vote screen.
- Destination tied result state.
- Expense split form.
- Balance summary.
- Closed trip read-only states.

### Integration Tests

Use Supabase local environment and Edge Function tests where possible:

- Invite expiration by time.
- Invite expiration by use count.
- Duplicate invite acceptance.
- RLS membership boundaries.
- Vote-as-another-user prevention.
- Close date poll permission checks.
- Destination tie resolution permission checks.
- Expense creation permission checks.

### Manual QA

Run core mobile flows on iOS and Android simulators:

- Sign up/login.
- Create trip.
- Invite/join.
- Vote dates.
- Vote destination.
- Add expense.
- View balances.
- Close/reopen trip.

## 10. Deployment Architecture

### Mobile Builds

- EAS Build for iOS and Android.
- EAS Submit for app store submission when ready.
- Separate build profiles for development, staging, and production.

### Backend

- Supabase CLI migrations.
- Separate Supabase projects or isolated configurations for development, staging, and production.
- Edge Functions deployed per environment.
- Storage buckets and policies managed through migrations/configuration.

### CI

GitHub Actions or equivalent should run:

- TypeScript checks.
- Lint.
- Unit tests.
- Component tests where stable.
- Supabase migration validation.
- Edge Function tests when available.

### Observability

- Sentry for mobile crashes and runtime errors.
- Structured Edge Function logs.
- Minimal analytics only after privacy review.

## 11. Repository Structure

```text
Plantir 2/
  app/
    _layout.tsx
    welcome.tsx
    login.tsx
    signup.tsx
    auth/
      callback.tsx
    (tabs)/
      trips.tsx
      notifications.tsx
      profile.tsx
    trips/
      create.tsx
      [tripId]/
        index.tsx
        settings.tsx
        members.tsx
        invite.tsx
        activity.tsx
        date-poll/
          setup.tsx
          vote.tsx
          results.tsx
        destination/
          setup.tsx
          proposals/
            index.tsx
            create.tsx
            [proposalId].tsx
          results.tsx
        expenses/
          index.tsx
          create.tsx
          [expenseId].tsx
        balances.tsx
        settlements.tsx
    invite/
      [token].tsx
  src/
    components/
      ui/
      forms/
      feedback/
    features/
      auth/
      profiles/
      trips/
      invites/
      members/
      datePoll/
      destinations/
      expenses/
      balances/
    hooks/
    services/
    lib/
      algorithms/
      supabase/
      validation/
      dates/
      money/
    types/
    constants/
    test/
  supabase/
    migrations/
    functions/
      create-trip-invite/
      accept-trip-invite/
      fetch-link-metadata/
      compute-date-poll-results/
      close-date-poll/
      compute-destination-results/
      close-destination-poll/
      compute-trip-balances/
      mark-settlement-paid/
    seed.sql
  docs/
    PRD.md
    TECHNICAL_SPEC.md
```

## 12. Development Environments

### Development

Purpose:

- Local implementation and fast iteration.

Setup:

- Local Expo dev server.
- Supabase local stack where possible.
- Development Supabase project if local services are insufficient.
- Test users and seed data.
- Relaxed observability.

Rules:

- No production data.
- Local secrets only.
- Migrations are created and tested here first.

### Staging

Purpose:

- Production-like QA before release.

Setup:

- Separate Supabase project.
- EAS staging builds.
- Staging Edge Functions.
- Staging storage buckets.
- Sentry staging environment.

Rules:

- Schema must match production candidate.
- RLS policies must match production.
- Test data only.

### Production

Purpose:

- Real users and real trip data.

Setup:

- Production Supabase project.
- Production EAS builds.
- Production Edge Functions.
- Production Sentry environment.
- Restricted secrets access.

Rules:

- Migrations are reviewed before deploy.
- Service role secrets are server-side only.
- Logging must avoid sensitive data.

## 13. Main Technical Risks

### Risk: RLS policies become incorrect or too permissive.

- Decision: Make RLS a dedicated implementation phase and test access boundaries.
- Reason: Plantir stores private group trip, vote, and expense data.
- Alternatives: Rely on frontend filtering or Edge Functions only.
- Risk: A policy mistake could expose trip data.
- Mitigation: Use helper functions, indexed lookups, local Supabase tests, and explicit security QA.

### Risk: Date poll algorithm is misunderstood by users.

- Decision: Keep the algorithm deterministic and explain the winning result.
- Reason: Date decisions are central to the app.
- Alternatives: Manual owner/admin choice.
- Risk: Users may disagree with the automatic result.
- Mitigation: Show availability counts, tie-breaker explanation, and allow reopening the poll.

### Risk: Money bugs damage trust.

- Decision: Use integer cents and pure tested settlement algorithms.
- Reason: Expense correctness is a trust requirement.
- Alternatives: Floating point calculations or ad hoc UI math.
- Risk: Incorrect balances cause user conflict.
- Mitigation: Unit tests, deterministic rounding, and clear split display.

### Risk: Invite acceptance has race conditions.

- Decision: Accept invites through an Edge Function with transactional checks.
- Reason: Time and max-use expiration must be enforced server-side.
- Alternatives: Client-side invite validation.
- Risk: Two users could consume the last invite use at the same time.
- Mitigation: Use database transaction logic and row locking when incrementing invite use count.

### Risk: Realtime subscriptions create complexity.

- Decision: Use Realtime only on active collaborative screens.
- Reason: It improves voting and expenses but should not be global.
- Alternatives: Polling/refetch only, or app-wide subscriptions.
- Risk: Too many subscriptions can create bugs and battery/network overhead.
- Mitigation: Subscribe per screen and fall back to TanStack Query invalidation.

### Risk: Scope expands before MVP is stable.

- Decision: Keep tasks, receipts, notifications, comments, exports, and real payments out of MVP.
- Reason: The MVP is already broad enough.
- Alternatives: Build the full trip planning suite now.
- Risk: Slower delivery and weaker core flows.
- Mitigation: Use the PRD backlog and phase gates before adding V1/V2 features.

