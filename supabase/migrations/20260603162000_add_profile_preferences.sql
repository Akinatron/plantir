-- Phase 7 profile preferences.
-- Locale and default currency are edited in the profile screen, so they live on profiles.

alter table public.profiles
  add column locale text not null default 'en',
  add column default_currency char(3) not null default 'EUR',
  add constraint profiles_locale_not_blank check (length(btrim(locale)) > 0),
  add constraint profiles_default_currency_uppercase check (default_currency = upper(default_currency));

comment on column public.profiles.locale is 'User interface locale preference. MVP defaults to English.';
comment on column public.profiles.default_currency is 'Default ISO 4217 currency for new trip expenses.';
