import { loginSchema, signupSchema } from './auth';

describe('auth validation', () => {
  it('accepts valid login values', () => {
    expect(loginSchema.parse({ email: 'friend@example.com', password: 'password' })).toEqual({
      email: 'friend@example.com',
      password: 'password',
    });
  });

  it('rejects invalid login email', () => {
    expect(() => loginSchema.parse({ email: 'not-email', password: 'password' })).toThrow();
  });

  it('requires a strong enough signup password', () => {
    expect(() =>
      signupSchema.parse({
        displayName: 'Pablo',
        email: 'pablo@example.com',
        password: 'short',
      }),
    ).toThrow();
  });
});
