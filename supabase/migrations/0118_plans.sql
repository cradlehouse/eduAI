-- 0118: plans and the org's subscription. Money stays admin-only in the UI; plan prices are public.
-- Billing (card, overages, invoices) is not connected yet — this models the plan so the Organisation
-- screen can show what the school is on, what it includes, and what it has used.
create table public.plans (
  key                    text primary key,
  name                   text not null,
  monthly_cents          integer not null check (monthly_cents >= 0),
  seats                  integer not null check (seats > 0),
  token_cents_per_month  integer not null check (token_cents_per_month >= 0),
  blurb                  text not null default '',
  sort                   smallint not null default 0
);
comment on table public.plans is 'Public price list. token_cents_per_month = the generation allowance included each month, in cents; shown to admins as money, to everyone else as tokens.';
alter table public.plans enable row level security;
create policy plans_select on public.plans for select to authenticated using (true);
grant select on public.plans to authenticated;

insert into public.plans (key, name, monthly_cents, seats, token_cents_per_month, blurb, sort) values
  ('cohort', 'Cohort', 25000,  30,  20000, 'One cohort: up to 30 people, $600 of generation across a three-month term ($200 a month).', 1),
  ('school', 'School', 100000, 100, 75000, 'The whole school: up to 100 people, $750 of generation every month, several cohorts.', 2);

alter table public.orgs
  add column plan             text not null default 'cohort' references public.plans (key),
  add column plan_started_on  date not null default current_date,
  add column card_on_file     boolean not null default false,
  add column overage_allowed  boolean not null default false,
  add column billing_email    text;
comment on column public.orgs.overage_allowed is 'When true and a card is on file, generation may continue past the monthly allowance at the token rate. Not enforced until billing is connected.';

-- Org-wide spend, admin-only: what the whole school has used, by month, in cents.
create or replace view public.org_spend_monthly as
select l.org_id, date_trunc('month', l.created_at)::date as month,
       coalesce(sum(l.cents) filter (where l.kind <> 'grant'), 0)::integer as spent_cents
from public.ledger l
where eduai.is_org_admin(l.org_id)
group by 1, 2;
grant select on public.org_spend_monthly to authenticated;
revoke select on public.org_spend_monthly from anon;
