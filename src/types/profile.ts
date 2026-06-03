export type Profile = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    locale: row.locale,
    defaultCurrency: row.default_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
