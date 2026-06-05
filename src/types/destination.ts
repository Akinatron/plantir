export type DestinationPollStatus = 'draft' | 'active' | 'closed' | 'reopened';
export type DestinationCustomFieldType = 'text' | 'number' | 'money' | 'boolean' | 'url';

export type DestinationPoll = {
  id: string;
  tripId: string;
  status: DestinationPollStatus;
  createdBy: string;
  closedAt: string | null;
  createdAt: string;
};

export type DestinationPollRow = {
  id: string;
  trip_id: string;
  status: DestinationPollStatus;
  created_by: string;
  closed_at: string | null;
  created_at: string;
};

export type DestinationProposal = {
  id: string;
  tripId: string;
  pollId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  url: string | null;
  locationName: string | null;
  totalPriceCents: number | null;
  currencyCode: string | null;
  pricePerPersonCents: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  pros: string[];
  cons: string[];
  selectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DestinationCustomField = {
  id: string;
  tripId: string;
  pollId: string | null;
  createdBy: string;
  name: string;
  emoji: string | null;
  fieldType: DestinationCustomFieldType;
  showOnCard: boolean;
  required: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DestinationCustomFieldRow = {
  id: string;
  trip_id: string;
  poll_id: string | null;
  created_by: string;
  name: string;
  emoji: string | null;
  field_type: DestinationCustomFieldType;
  show_on_card: boolean;
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DestinationCustomFieldValue = {
  id: string;
  proposalId: string;
  fieldId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueMoneyCents: number | null;
  valueBoolean: boolean | null;
  valueUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DestinationCustomFieldValueRow = {
  id: string;
  proposal_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_money_cents: number | null;
  value_boolean: boolean | null;
  value_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DestinationProposalRow = {
  id: string;
  trip_id: string;
  poll_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  url: string | null;
  location_text: string | null;
  estimated_price_cents: number | null;
  currency_code: string | null;
  price_per_person_cents: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  pros: string[];
  cons: string[];
  selected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DestinationProposalImage = {
  id: string;
  proposalId: string;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
};

export type DestinationProposalImageRow = {
  id: string;
  proposal_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

export type DestinationVote = {
  id: string;
  tripId: string;
  pollId: string;
  proposalId: string;
  userId: string;
};

export type DestinationVoteRow = {
  id: string;
  trip_id: string;
  poll_id: string;
  proposal_id: string;
  user_id: string;
};

export type DestinationPollResult = {
  id: string;
  pollId: string;
  proposalId: string;
  voteCount: number;
  totalMemberCount: number;
  score: number;
  rank: number;
  isWinner: boolean;
  isTiedWinner: boolean;
  computedAt: string;
};

export type DestinationPollResultRow = {
  id: string;
  poll_id: string;
  proposal_id: string;
  vote_count: number;
  total_member_count: number;
  score: number;
  rank: number;
  is_winner: boolean;
  is_tied_winner: boolean;
  computed_at: string;
};

export type DestinationPollBundle = {
  poll: DestinationPoll | null;
  proposals: DestinationProposal[];
};

export type LinkMetadata = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  finalUrl: string;
};

export function mapDestinationPollRow(row: DestinationPollRow): DestinationPoll {
  return {
    id: row.id,
    tripId: row.trip_id,
    status: row.status,
    createdBy: row.created_by,
    closedAt: row.closed_at,
    createdAt: row.created_at,
  };
}

export function mapDestinationProposalRow(row: DestinationProposalRow): DestinationProposal {
  return {
    id: row.id,
    tripId: row.trip_id,
    pollId: row.poll_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    url: row.url,
    locationName: row.location_text,
    totalPriceCents: row.estimated_price_cents,
    currencyCode: row.currency_code,
    pricePerPersonCents: row.price_per_person_cents,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    pros: row.pros,
    cons: row.cons,
    selectedAt: row.selected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDestinationCustomFieldRow(row: DestinationCustomFieldRow): DestinationCustomField {
  return {
    id: row.id,
    tripId: row.trip_id,
    pollId: row.poll_id,
    createdBy: row.created_by,
    name: row.name,
    emoji: row.emoji,
    fieldType: row.field_type,
    showOnCard: row.show_on_card,
    required: row.required,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDestinationCustomFieldValueRow(
  row: DestinationCustomFieldValueRow,
): DestinationCustomFieldValue {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    fieldId: row.field_id,
    valueText: row.value_text,
    valueNumber: row.value_number,
    valueMoneyCents: row.value_money_cents,
    valueBoolean: row.value_boolean,
    valueUrl: row.value_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDestinationProposalImageRow(row: DestinationProposalImageRow): DestinationProposalImage {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    storagePath: row.storage_path,
    altText: row.alt_text,
    sortOrder: row.sort_order,
  };
}

export function mapDestinationVoteRow(row: DestinationVoteRow): DestinationVote {
  return {
    id: row.id,
    tripId: row.trip_id,
    pollId: row.poll_id,
    proposalId: row.proposal_id,
    userId: row.user_id,
  };
}

export function mapDestinationPollResultRow(row: DestinationPollResultRow): DestinationPollResult {
  return {
    id: row.id,
    pollId: row.poll_id,
    proposalId: row.proposal_id,
    voteCount: row.vote_count,
    totalMemberCount: row.total_member_count,
    score: row.score,
    rank: row.rank,
    isWinner: row.is_winner,
    isTiedWinner: row.is_tied_winner,
    computedAt: row.computed_at,
  };
}
