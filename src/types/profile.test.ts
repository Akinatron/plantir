import { mapProfileRow } from './profile';

describe('profile mapping', () => {
  it('maps database profile rows to app profile shape', () => {
    expect(
      mapProfileRow({
        id: 'user-1',
        display_name: 'Pablo',
        username: null,
        avatar_url: 'user-1/avatar.jpg',
        timezone: 'Europe/Madrid',
        locale: 'en',
        default_currency: 'EUR',
        created_at: '2026-06-03T12:00:00Z',
        updated_at: '2026-06-03T12:00:00Z',
      }),
    ).toEqual({
      id: 'user-1',
      displayName: 'Pablo',
      username: null,
      avatarUrl: 'user-1/avatar.jpg',
      timezone: 'Europe/Madrid',
      locale: 'en',
      defaultCurrency: 'EUR',
      createdAt: '2026-06-03T12:00:00Z',
      updatedAt: '2026-06-03T12:00:00Z',
    });
  });
});
