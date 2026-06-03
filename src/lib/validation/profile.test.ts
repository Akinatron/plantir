import { profileSchema } from './profile';

describe('profile validation', () => {
  it('normalizes default currency to uppercase', () => {
    expect(
      profileSchema.parse({
        displayName: 'Pablo',
        avatarUrl: null,
        locale: 'en',
        defaultCurrency: 'eur',
        timezone: 'Europe/Madrid',
      }),
    ).toMatchObject({ defaultCurrency: 'EUR' });
  });

  it('rejects invalid currency codes', () => {
    expect(() =>
      profileSchema.parse({
        displayName: 'Pablo',
        avatarUrl: null,
        locale: 'en',
        defaultCurrency: 'EURO',
        timezone: 'Europe/Madrid',
      }),
    ).toThrow();
  });
});
