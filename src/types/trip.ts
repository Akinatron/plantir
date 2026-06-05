export type TripStatus =
  | 'group_created'
  | 'voting_dates'
  | 'date_decided'
  | 'voting_place'
  | 'place_decided'
  | 'planning'
  | 'on_trip'
  | 'settling_expenses'
  | 'closed';

export type TripMemberRole = 'owner' | 'admin' | 'member';
export type TripMemberStatus = 'joined' | 'removed';
export type SettlementMarkPaidPolicy = 'owner_admin_only' | 'participants';

export type Trip = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  timezone: string;
  status: TripStatus;
  startsOn: string | null;
  endsOn: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  confirmedNote: string | null;
  memberCanCreateProposals: boolean;
  memberCanCreateExpenses: boolean;
  memberCanSeeDateResults: boolean;
  memberCanSeePlaceResults: boolean;
  memberCanModifyPlaceFields: boolean;
  settlementMarkPaidPolicy: SettlementMarkPaidPolicy;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  timezone: string;
  status: TripStatus;
  starts_on: string | null;
  ends_on: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  confirmed_note: string | null;
  member_can_create_proposals: boolean;
  member_can_create_expenses: boolean;
  member_can_see_date_results: boolean;
  member_can_see_place_results: boolean;
  member_can_modify_place_fields: boolean;
  settlement_mark_paid_policy: SettlementMarkPaidPolicy;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TripMember = {
  id: string;
  tripId: string;
  userId: string;
  role: TripMemberRole;
  status: TripMemberStatus;
  joinedAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type TripMemberRow = {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripMemberRole;
  status: TripMemberStatus;
  joined_at: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type TripInvite = {
  id: string;
  tripId: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
  createdAt: string;
};

export type TripInviteRow = {
  id: string;
  trip_id: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
  created_at: string;
};

export function mapTripRow(row: TripRow): Trip {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    timezone: row.timezone,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    confirmedNote: row.confirmed_note,
    memberCanCreateProposals: row.member_can_create_proposals,
    memberCanCreateExpenses: row.member_can_create_expenses,
    memberCanSeeDateResults: row.member_can_see_date_results,
    memberCanSeePlaceResults: row.member_can_see_place_results,
    memberCanModifyPlaceFields: row.member_can_modify_place_fields,
    settlementMarkPaidPolicy: row.settlement_mark_paid_policy,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTripMemberRow(row: TripMemberRow): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    displayName: row.profiles?.display_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
  };
}

export function mapTripInviteRow(row: TripInviteRow): TripInvite {
  return {
    id: row.id,
    tripId: row.trip_id,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    useCount: row.use_count,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}
