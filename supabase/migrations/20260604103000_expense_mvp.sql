-- Phase 11: MVP expense details and settlement computation support.

alter table public.expenses
  add column description text,
  add column category text,
  add constraint expenses_category_not_blank check (category is null or length(btrim(category)) > 0);

comment on column public.expenses.description is 'Optional MVP expense note shown on the detail screen.';
comment on column public.expenses.category is 'Optional MVP category label such as lodging, groceries, transport, or activity.';
