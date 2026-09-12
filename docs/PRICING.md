# Pricing model (working notes)

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
- Whether the two modes are two products or two plans of one (affects the Pegasus outline).
- Credit purchase (Model B) vs org-supplied keys (Model A) pass-through margin.
