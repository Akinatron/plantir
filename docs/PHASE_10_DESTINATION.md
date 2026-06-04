# Phase 10: Destination Proposals and Voting

## Implemented Scope

- Destination setup screen.
- Proposals list screen.
- Create proposal screen.
- Proposal detail screen.
- Destination results screen.
- Proposal fields:
  - title
  - URL
  - description
  - location name
  - total price
  - currency
  - price per person
  - capacity
  - bedrooms
  - bathrooms
  - pros
  - cons
  - one MVP image upload
- Proposal images stored in Supabase Storage bucket `proposal-images`.
- Edge Functions:
  - `fetch-link-metadata`
  - `compute-destination-results`
  - `close-destination-poll`
- Persisted ranking rows in `destination_poll_results`.
- Selected proposal saved on trip:
  - `final_destination_proposal_id`
  - `selected_destination_proposal_id`
  - `selected_destination_snapshot`
- Trip status changes to `place_decided` when the destination poll is closed.
- Activity log event:
  - `destination_poll_closed`

## Voting Decision

- Decision: MVP destination voting uses single-choice voting.
- Reason: This matches the approved product decision and is easiest for groups to understand: each member chooses one proposal, and the proposal with the most votes wins.
- Alternatives: Ranked voting, score voting, yes/no/maybe.
- Risk: Single-choice voting can hide second-choice consensus.
- Mitigation: The pure algorithm still supports other modes for later phases. MVP keeps the product simple and reliable.

## Tie Handling

- The app computes ranking by vote count.
- If one proposal has the most votes, owner/admin can close the poll and save that winner.
- If multiple proposals tie for first place, the results screen shows the tied proposals and owner/admin must select one tied proposal.
- Non-tied proposals cannot be selected during tie resolution.

## Storage

Bucket: `proposal-images`

Path convention:

```text
{tripId}/{proposalId}/{timestamp}.{extension}
```

This matches existing storage policies that derive trip and proposal ids from the first two path segments.

## Edge Function Contracts

### `fetch-link-metadata`

Request:

```json
{
  "url": "https://example.com/listing"
}
```

Response:

```json
{
  "title": "Listing title",
  "description": "Listing description",
  "imageUrl": "https://example.com/image.jpg",
  "finalUrl": "https://example.com/listing"
}
```

SSRF protections:

- Allows only `http` and `https`.
- Rejects credentials in URLs.
- Allows only standard ports `80` and `443`.
- Rejects `localhost`.
- Resolves DNS and rejects private, loopback, link-local, multicast, and reserved IPv4/IPv6 ranges.
- Uses manual redirect handling and validates every redirect target.
- Uses a timeout and limited HTML read size.

### `compute-destination-results`

Request:

```json
{
  "pollId": "uuid"
}
```

Behavior:

- Requires owner/admin.
- Reads active destination proposals, votes, and trip members.
- Applies single-choice vote counting.
- Replaces prior persisted result rows.
- Marks a unique winner or tied winners.

### `close-destination-poll`

Request without tie:

```json
{
  "pollId": "uuid",
  "selectedProposalId": null
}
```

Request with tie:

```json
{
  "pollId": "uuid",
  "selectedProposalId": "uuid-of-tied-proposal"
}
```

Behavior:

- Requires owner/admin.
- Recomputes results before closing.
- If tied, requires selected proposal to be one of the tied winners.
- Saves selected proposal id and snapshot on `trips`.
- Sets poll status to `closed`.
- Sets trip status to `place_decided`.
- Writes `activity_log.destination_poll_closed`.

## RLS and Permission Checks

Manual staging checks:

1. External users cannot read destination proposals, votes, images, or results.
2. Joined members can read proposals and proposal images for their own trips.
3. Members can create proposals only while the destination poll is active and the trip setting allows proposals.
4. Members can vote only for themselves and only once per destination poll.
5. Members can update their own vote while the poll is active.
6. Members cannot compute or close destination results.
7. Owner/admin can compute results.
8. Owner/admin can close a non-tied poll without selecting a proposal.
9. Owner/admin must choose one tied proposal if there is a tie.
10. Service role key exists only in Supabase Edge Function secrets.

## MVP Limitations

- Create proposal supports one image at creation time. The schema supports more images; multi-image management can come later.
- Metadata fetch is best effort and does not integrate directly with Airbnb, Booking, or other providers.
- Owner/admin controls are visible in the MVP UI, but Edge Functions enforce permissions.
- Proposal editing/deletion UI is not implemented yet.
- Notifications are deferred to the notification module.
