# Plantir Product Requirements Document

## 1. Product Vision

Plantir is a mobile app that helps groups of friends organize trips from the first idea to final expense settlement.

The product should replace the scattered workflow of WhatsApp chats, date polls, booking links, notes, spreadsheets, and expense-splitting tools with one guided mobile-first process.

The MVP must be practical, clear, and focused on the most painful parts of friend-group trips:

- Getting everyone into one shared trip space.
- Finding the best date.
- Choosing the house or accommodation.
- Tracking shared expenses.
- Showing who owes whom.

Plantir should feel social and friendly, but it must be especially clear around decisions, money, votes, and responsibilities.

## 2. Problem Statement

Friend-group trips are difficult to organize because the planning process is spread across disconnected tools.

Common problems:

- Trip discussion happens in chat, but decisions get buried.
- Date availability is hard to compare.
- Accommodation links are scattered across messages.
- People forget who voted for what.
- Tasks and responsibilities are unclear.
- Expenses are tracked manually or in a separate app.
- Payment responsibilities create confusion or arguments.

Plantir solves this by giving the group one shared trip workflow with visible progress, structured decisions, and transparent expenses.

## 3. Target Users

### Primary MVP Users

- Friend groups aged 18 to 35.
- Groups organizing weekend trips.
- Groups booking country houses or shared accommodation.
- University friend groups.
- Summer getaway groups.
- Larger groups where coordinating dates and money is difficult.

### Secondary Future Users

These are not the MVP focus:

- Couples.
- Families.
- Work groups.
- Recurring travel groups.

## 4. Core Value Proposition

Create the group, find the best date, choose the place, organize the trip, and split expenses in one single app.

Plantir reduces confusion by making each trip decision visible, structured, and shared.

## 5. Main User Journeys

### Journey 1: Create a Trip

1. User signs up or logs in.
2. User creates a trip.
3. User becomes the trip owner.
4. User lands on the trip dashboard.
5. Dashboard shows current status and next action.

### Journey 2: Invite Friends

1. Owner/admin creates an invite link.
2. Owner/admin configures expiration by time, number of uses, both, or neither.
3. Owner/admin shares the link or QR code.
4. Friend opens the invite.
5. Friend signs up or logs in if needed.
6. Friend joins the trip as a member.

### Journey 3: Vote on Dates

1. Owner/admin starts one active date poll.
2. Members mark dates they are available.
3. Unmarked dates are treated as unavailable.
4. The app calculates candidate date ranges.
5. The app automatically determines the winning date range.
6. Owner/admin closes or reopens the poll, but does not manually choose the date winner.

Date poll tie-breakers:

1. Highest number of available members.
2. Highest percentage of available members.
3. Date range closest to the configured preferred duration, if a preferred duration exists.
4. Earliest start date if still tied.

### Journey 4: Propose and Vote on Accommodation

1. Members create destination or accommodation proposals if the trip setting allows it.
2. Members view proposal details.
3. Each member votes for one proposal.
4. The proposal with the most votes wins.
5. If proposals are tied, owner/admin manually resolves the destination tie.
6. Owner/admin closes or reopens destination voting.

### Journey 5: Add Expenses

1. Member adds an expense if the trip setting allows it.
2. Member enters amount, currency, payer, date, participants, and exclusions.
3. App creates equal split rows.
4. Balances update.

### Journey 6: View Balances and Settlements

1. Member opens balances.
2. App shows who paid more or less than their share.
3. App suggests optimized payments to settle debts.
4. Members can see who should pay whom.

### Journey 7: Close or Reopen Trip

1. Owner/admin closes the trip when planning and settlement are done.
2. Closed trip becomes read-only.
3. Members cannot add or edit votes, proposals, expenses, or planning items.
4. Owner/admin can reactivate or reopen the trip.

## 6. MVP Scope

The MVP includes:

- English-only mobile app for iOS and Android.
- Authentication.
- Basic user profiles.
- Create multiple trips.
- Belong to multiple trips.
- Trip dashboard with status and next action.
- Owner/admin/member roles.
- Invite members by secure link.
- Invite expiration by time.
- Invite expiration by number of uses.
- Join trip by invite link.
- One active date poll per trip.
- Available/unavailable date voting.
- Automatic winning date range calculation.
- Deterministic date tie-breakers.
- Destination/accommodation proposals.
- Proposal photos.
- Proposal links and basic metadata.
- Single-choice destination voting.
- Manual owner/admin resolution for tied destination proposals.
- Basic expenses.
- Equal expense splitting.
- Excluding selected members from an expense.
- Balances.
- Optimized settlement suggestions.
- Closed trips as read-only.
- Owner/admin trip reactivation.
- Security rules that prevent users from accessing trips they do not belong to.
- Algorithm tests for date polls, destination voting, money, expenses, and settlements.
- Loading, empty, error, and success states.
- Basic accessibility.

## 7. Explicitly Excluded From MVP

The MVP does not include:

- Real payments.
- Payment provider integration.
- Advanced multi-currency conversion.
- Direct Airbnb, Booking, or travel-platform integration.
- Full chat.
- AI destination recommendations.
- AI proposal summaries.
- External calendar integration.
- Full offline mode.
- Advanced itinerary.
- Advanced split types.
- Tasks.
- Receipts.
- Push notifications.
- Income/refunds.
- Proposal comments.
- Decision history.
- PDF/CSV export.
- Trip templates.
- Web app mode.

## 8. V1 Scope

V1 may add:

- Tasks.
- Receipts.
- Push notifications.
- Income/refunds.
- Advanced splits.
- Decision history.
- PDF/CSV export.
- Comments on proposals.
- Payment confirmation.
- More complete planning tools.

## 9. V2 Scope

V2 may consider:

- Multi-currency with conversion.
- AI proposal summaries.
- AI destination suggestions.
- Calendar integration.
- Recurring polls.
- Common pot.
- Real payments.
- Map.
- Full itinerary.
- Trip templates.
- Web mode.

## 10. User Roles and Permissions

### Owner

The owner is the user who creates the trip.

Owner permissions:

- Edit trip settings.
- Delete the trip.
- Close, reopen, or reactivate the trip.
- Manage members.
- Promote or demote admins.
- Create, regenerate, revoke, and manage invite links.
- Configure invite expiration.
- Configure, close, and reopen polls.
- Confirm app-determined results.
- Resolve tied destination proposals.
- Manage proposals and expenses when needed.

### Admin

Admins are trusted members with elevated trip permissions.

Admin permissions:

- Edit operational trip settings.
- Close, reopen, or reactivate the trip.
- Manage members, except owner removal or ownership transfer.
- Create, regenerate, revoke, and manage invite links.
- Configure invite expiration.
- Configure, close, and reopen polls.
- Confirm app-determined results.
- Resolve tied destination proposals.
- Manage proposals and expenses when needed.

### Member

Members are joined trip participants.

Member permissions:

- View trips they belong to.
- View members of their trips.
- Mark their own date availability.
- Vote only as themselves.
- Create destination proposals when enabled.
- Vote for one destination proposal.
- Add expenses when enabled.
- View expenses, balances, and settlements.

### Permission Rules

- A user can only view trips where they are a joined member.
- A user cannot vote for another user.
- A user cannot submit date availability for another user.
- Only owner/admin can manage invite links.
- Only owner/admin can close or reopen polls.
- Owner/admin do not manually resolve date poll ties.
- Only owner/admin can manually resolve destination ties.
- Member proposal creation is enabled by default, but owner/admin can disable it.
- Member expense creation is enabled by default, but owner/admin can disable it.
- Closed trips are read-only for members.

## 11. Trip Lifecycle Statuses

Trip statuses:

1. Group created.
2. Voting on dates.
3. Date decided.
4. Voting on place.
5. Place decided.
6. Planning.
7. On trip.
8. Settling expenses.
9. Closed.

Status requirements:

- The dashboard must show the current status.
- The dashboard must show the next recommended action.
- Blocked states must be visible.
- Reopening a poll or trip must be explicit.
- Closed trips must be read-only until reopened by owner/admin.

## 12. Feature List by Module

### Authentication and Profile

- Sign up.
- Log in.
- Log out.
- Basic profile.
- Avatar support in MVP if storage is ready.

### Trips

- Create trip.
- View trip list.
- View trip dashboard.
- Edit trip settings.
- Close trip.
- Reopen trip.
- Track trip status.
- Show next action.

### Invitations

- Generate invite link.
- Regenerate invite link.
- Revoke invite link.
- Configure expiration time.
- Configure maximum uses.
- Accept invite.
- Show expired invite state.
- Show fully used invite state.

### Members and Roles

- View member list.
- Show role labels.
- Owner/admin member management.
- Owner/admin role management.

### Date Poll

- Configure one active date poll.
- Optional preferred duration.
- Mark available dates.
- Treat unmarked dates as unavailable.
- Calculate winning date range automatically.
- Apply deterministic tie-breakers.
- Show result explanation.
- Close poll.
- Reopen poll.

### Destination Proposals

- Create proposal.
- Add title.
- Add description.
- Add link.
- Add location text.
- Add estimated price.
- Add photos.
- View proposal list.
- View proposal detail.
- Edit own proposal if allowed.
- Owner/admin moderation.

### Destination Voting

- Single-choice voting.
- One vote per member.
- Change own vote while voting is active.
- Count votes.
- Determine winner by vote count.
- Show tied proposals.
- Owner/admin tie resolution.
- Close voting.
- Reopen voting.

### Expenses

- Add expense.
- Add amount in integer cents.
- Add ISO 4217 currency.
- Select payer.
- Select participants.
- Exclude members.
- Equal split.
- Edit or void expense if allowed.
- View expense list.
- View expense detail.

### Balances and Settlements

- Calculate member balances.
- Show who owes and who is owed.
- Suggest optimized settlements.
- Preserve net balances.
- Minimize number of payments where practical.

### Security and Permissions

- Restrict trip data to joined members.
- Enforce role permissions.
- Prevent users acting as other users.
- Protect closed trips from member edits.
- Prevent direct client writes to sensitive system records.

## 13. Acceptance Criteria

### Auth

- User can sign up.
- User can log in.
- User can log out.
- Authenticated user has a profile.
- Unauthenticated invite users are redirected to auth before joining.

### Trip Creation

- Authenticated user can create a trip.
- User can create more than one trip.
- Creator becomes owner.
- Trip appears in user's trip list.
- Trip dashboard shows "Group created".
- Trip dashboard shows next recommended action.

### Invitations

- Owner/admin can create an invite link.
- Owner/admin can set expiration by time.
- Owner/admin can set maximum uses.
- Owner/admin can revoke or regenerate an invite.
- Valid invite lets a user join the trip.
- Expired invite cannot be used.
- Fully used invite cannot be used.
- Existing members are not duplicated.

### Date Poll

- Owner/admin can create one active date poll.
- Members can mark available dates.
- Unmarked dates are unavailable.
- Users can only edit their own availability.
- App calculates candidate date ranges.
- App automatically determines the winning date range.
- Date poll ties are resolved by deterministic tie-breakers.
- Owner/admin cannot manually choose the date winner.
- Owner/admin can close or reopen the poll.

### Destination Proposals

- Trip members can view proposals.
- Members can create proposals by default.
- Owner/admin can disable member proposal creation.
- Proposal includes required basic fields.
- Proposal can include link and photos.
- Creator/admin can edit or moderate while trip is not closed.
- Closed trips block proposal changes.

### Destination Voting

- Voting is single-choice in the MVP.
- Each member can vote for one proposal.
- Members can vote only as themselves.
- The proposal with most votes wins.
- Tied proposals are shown clearly.
- Owner/admin can manually resolve destination ties.
- Owner/admin can close or reopen destination voting.

### Expenses

- Members can add expenses by default.
- Owner/admin can disable member expense creation.
- Expense requires amount, currency, payer, date, and participants.
- Money is stored as integer cents.
- Currency uses ISO 4217 code.
- Equal split is supported.
- Exclusions are supported.
- Closed trips block expense changes.

### Balances

- App calculates balances from expenses, payers, and splits.
- Balances are deterministic.
- Settlement suggestions preserve net balances.
- Settlement suggestions minimize payments where practical.
- Money calculations do not use floats.

### Security

- Users cannot view trips they do not belong to.
- Users cannot view expenses for trips they do not belong to.
- Users cannot vote as another user.
- Users cannot submit availability as another user.
- Members cannot modify closed trips.
- Clients cannot bypass critical permissions through frontend-only checks.
- Sensitive actions are enforced by backend/database permissions.

## 14. Decisions

### Decision: MVP is English only.

- Decision: Ship MVP in English only.
- Reason: Reduces product and QA complexity.
- Alternatives: Spanish-only, bilingual.
- Risk: Spanish-speaking users may prefer Spanish.
- Mitigation: Keep copy structured so localization can be added later.

### Decision: Users can create and belong to multiple trips.

- Decision: Support multiple trips per user in MVP.
- Reason: This matches real usage and avoids a restrictive account model.
- Alternatives: One active trip per user.
- Risk: More complexity in trip list and permissions.
- Mitigation: Treat trip membership as the core access model.

### Decision: Date poll uses available/unavailable only.

- Decision: Members only mark available dates; unmarked dates are unavailable.
- Reason: Keeps voting fast and unambiguous.
- Alternatives: Available/maybe/unavailable.
- Risk: Some nuance is lost.
- Mitigation: Add maybe availability later if users need it.

### Decision: Date poll winner is always automatic.

- Decision: App determines the winning date range using deterministic rules.
- Reason: Avoids arguments and silent manual overrides.
- Alternatives: Owner/admin manually chooses among tied ranges.
- Risk: The automatic result may not match group preference in edge cases.
- Mitigation: Owner/admin can reopen or reactivate the poll; tie-breakers are transparent.

### Decision: Destination voting is single-choice.

- Decision: Each member votes for one proposal.
- Reason: Simple poll behavior is easy to understand.
- Alternatives: Multiple upvotes, ranked voting.
- Risk: Members cannot mark multiple acceptable options.
- Mitigation: Keep future voting model extensible.

### Decision: Destination ties are manually resolved by owner/admin.

- Decision: Owner/admin resolves tied proposal results.
- Reason: Accommodation decisions may need judgment beyond vote count.
- Alternatives: Earliest proposal, cheapest proposal, random deterministic tie-break.
- Risk: Tie resolution may feel subjective.
- Mitigation: Show tied proposals clearly and make the resolution explicit.

### Decision: Member proposal and expense creation are enabled by default.

- Decision: Members can create proposals and expenses unless owner/admin disables the setting.
- Reason: Friend trips need collaboration.
- Alternatives: Owner/admin-only creation.
- Risk: Members may add low-quality proposals or incorrect expenses.
- Mitigation: Owner/admin can disable settings and moderate content.

### Decision: Closed trips are read-only.

- Decision: Closing a trip prevents member edits.
- Reason: Closed trips should be stable records.
- Alternatives: Allow continued edits after closure.
- Risk: A group may need to fix something later.
- Mitigation: Owner/admin can reopen or reactivate the trip.

## 15. Risks and Assumptions

### Risks

- Date range scoring may need refinement after real usage.
- Expense mistakes could create trust issues.
- RLS and permission mistakes could expose private trip data.
- Invite links could be misused if expiration and revocation are unclear.
- MVP could become too broad if V1 features are pulled forward.
- Users may expect chat because group trips often happen in chat apps.

### Assumptions

- MVP users are comfortable using a mobile app for group coordination.
- English-only is acceptable for the initial version.
- Friend groups prefer simple voting over complex decision systems.
- Equal expense splitting with exclusions is enough for MVP.
- Real payments are not required for the first usable version.
- One active date poll per trip is enough for MVP.
- One active destination voting phase per trip is enough for MVP.

## 16. Prioritized Backlog

### P0: MVP Foundation

- Authentication.
- Profile creation.
- Trip creation.
- Trip list.
- Trip dashboard.
- Owner/admin/member roles.
- Trip member access control.
- Secure invite links.
- Invite expiration by time and use count.
- Join by invite link.

### P0: MVP Decisions

- Date poll setup.
- Available date marking.
- Automatic date result calculation.
- Deterministic date tie-breakers.
- Date poll close/reopen.
- Destination proposal creation.
- Destination proposal photos and links.
- Single-choice destination voting.
- Destination result calculation.
- Destination tie resolution by owner/admin.
- Destination voting close/reopen.

### P0: MVP Money

- Add expense.
- Equal split.
- Exclude members.
- Integer-cent money handling.
- Currency code support.
- Balance calculation.
- Optimized settlement suggestions.

### P0: MVP Quality and Security

- RLS and backend/database permission enforcement.
- Algorithm tests.
- Loading states.
- Empty states.
- Error states.
- Basic accessibility.
- Security review before deployment.

### P1: V1 Candidates

- Tasks.
- Receipts.
- Push notifications.
- Income/refunds.
- Advanced splits.
- Decision history.
- PDF/CSV export.
- Proposal comments.
- Payment confirmation.

### P2: V2 Candidates

- Multi-currency conversion.
- AI summaries.
- AI destination suggestions.
- Calendar integration.
- Common pot.
- Real payments.
- Map.
- Full itinerary.
- Trip templates.
- Web mode.

