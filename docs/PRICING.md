# Pricing model (working notes)

## Students see tokens

$1 = 1,000 tokens by default (`orgs.tokens_per_dollar`, admin-editable). Students and instructors only ever see
tokens: budget rings, spend, estimates. The admin sees money and the rate. Real cost stays in the ledger in
cents, so the token rate can change without moving money.

## The unit is generated minutes, not seats

Two ways a class can use the platform:

| Mode | Shape | Generation load |
|---|---|---|
| **Cohort film** | 25 students, one project, one five-minute film | ~1× |
| **Individual films** | 25 students, 25 projects, five minutes each | ~25× |

Per-seat pricing either overcharges the cohort mode or loses money on the individual mode. So the price has
two parts:

1. **Per-seat platform fee**, small: accounts, review queue, evidence export, storage, support.
2. **Generation envelope**, priced on minutes of *finished* output with the take-to-keep ratio built in.
   If students generate ten takes to keep one, a five-minute film is ~50 minutes of generation; the
   envelope is sized and priced on that, with the lane mix (explore is cheap, finish is not) in the estimate.

## What Pegasus already does

MAP apprentices make **both** individual and group films inside one nine-month programme, and the programme is
free to them. So for the first org the answer is two plans of one product, not two products: a cohort
envelope for the group film (the Collaboration frame, months 5–8) and a small personal envelope per
apprentice for individual work (Self-Awareness frame, months 3–4). The payer is PMP and its funders, not the
student, so the price is a programme fee sized on total generated minutes across both, not a per-seat
subscription. The four MAP frames map naturally onto course modules.

## The database already models both

- `project_budgets` = the shared cohort envelope.
- `personal_budgets` = the per-student envelope.
- The ledger debits whichever exists for the job; the budget ring shows the one that applies.
- Both can coexist in one cohort (a shared film plus a small personal explore allowance).
- `org_model_profiles.budget_cap_cents` caps spend per route per org on top of either envelope.

## Resource angle

Cohort mode is not just cheaper; it is the low-footprint mode, and the receipt-level resource estimate
(see RESOURCE_NEUTRALITY.md) lets the platform show that next to the budget ring rather than assert it.
The clip-length scaling finding (energy ~4× when length doubles) also argues for pricing and coaching
towards shorter takes.

## Open

- Actual numbers: seat fee, cents per finished minute per lane, take-to-keep assumption per module.
- Whether the two modes are two products or two plans of one (affects the outline for Pegasus Media Project, the design-partner org; MAP is free to students, so the payer is PMP/grants, not the apprentice).
- Credit purchase (Model B) vs org-supplied keys (Model A) pass-through margin.

## Plans (2026-09-13, first cut, in the database as `public.plans`)

| Plan | Price | People | Generation included | Notes |
|---|---|---|---|---|
| Cohort | $250 / month | 30 | $200 / month ($600 over a three-month term) | one cohort |
| School | $1,000 / month | 100 | $750 / month | several cohorts |

Admins see the plan, people used, generation used this month (money and tokens), and can upgrade or
switch on the Organisation screen. Overages past the allowance need a card; card payments and invoices
are not connected yet (Stripe is the obvious next step), so plans are invoiced by hand for now.
