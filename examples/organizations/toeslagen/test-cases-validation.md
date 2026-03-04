# Test Case Validation — Zorgtoeslag Expected Results

**DMN:** `resultaat_zorgtoeslag_operaton_compat.dmn`  
**Source rules:** `Zorgtoeslag-no-DMN.ttl`  
**datumBerekening:** 2026-02-17 (all cases)

## Parameters in effect

| Parameter | Value |
|---|---|
| STANDAARDPREMIE | € 1987.00 |
| DREMPELINKOMEN | € 26819.00 |
| NORMPREMIE_OVER_DREMPEL_ZP | € 503.93 |
| OVERSCHOT_PCT_ZP | 13.67 % |
| DOELMATIGHEIDSGRENS | € 23.50 |
| MAX_ZORGTOESLAG_ZP | € 1483.00 |
| MEERDERJARIGHEIDSLEEFTIJD | 18 |

---

## TC1 — `TC1_Eligible_NL_insured_moderate_income`

**Expected:** `eligible=true, amountYear>0`

**Age check (Regelgroep 007)**  
geboortedatum 2000-01-10 → leeftijdOpDatumBerekening = 26 ✓

**meerderjarigDezeMaand (Regelgroep 012)**  
leeftijdOpLaatsteDagVorigeMaand (26) < 18 → false → `meerderjarigDezeMaand = false`

**rechtgevendeLeeftijd**  
26 ≥ 18 AND meerderjarigDezeMaand = false → `true`

**statusRouteOk (Regelgroep 009)**  
rechtmatigVerblijfNL = true AND statusZorgverzekerd = "Binnenlands zorgverzekerd" → `true`

**inLeven (Regelgroep 008)**  
overlijdensdatum = null → `true`

**eligible** → `true` ✓

**Amount (Regelgroep 002–005)**

| Step | Calculation | Result |
|---|---|---|
| woonlandfactor | statusZorgverzekerd = "Binnenlands" → 1 | **1.00** |
| standaardpremie | 1987 × 1.00 | **€ 1987.00** |
| inkomenBovenDrempel | max(30000 − 26819, 0) | **€ 3181.00** |
| normpremie | 503.93 + (13.67/100 × 3181) | **€ 938.72** |
| jaarbedragToeslagBasis | 1987.00 − 938.72 | **€ 1048.28** |
| doelmatigheidsgrens check | 1048.28 > 23.50 | pass |
| max cap check | 1048.28 < 1483.00 | pass |
| **amountYear** | | **€ 1048.28** |

**Verdict: ✅ CORRECT** — `amountYear > 0` is satisfied.

---

## TC2 — `TC2_Not_eligible_detained`

**Expected:** `eligible=false, amountYear=0`

**Regelgroep 009 (recht op toeslag)**  
gedetineerd = true → eligible = false

**jaarbedragToeslagBasis**  
rechtOpToeslagAanvraag = false → 0; 0 < DOELMATIGHEIDSGRENS → `amountYear = 0`

**Verdict: ✅ CORRECT** — gedetineerd is the sole disqualifier.

---

## TC3 — `TC3_Not_eligible_became_18_this_month`

**Expected:** `eligible=false, amountYear=0`

**Age inputs**  
geboortedatum 2008-02-10, datumBerekening 2026-02-17 (birthday already passed this month)

| Input | Value | Rationale |
|---|---|---|
| leeftijdOpDatumBerekening | 18 | Feb 10 < Feb 17 — birthday has occurred |
| leeftijdOpLaatsteDagVorigeMaand | 17 | Jan 31 < Feb 10 — not yet 18 |
| leeftijdOpLaatsteDagHuidigeMaand | 18 | Feb 28 > Feb 10 — already 18 |

**meerderjarigDezeMaand (Regelgroep 012)**  
leeftijdOpLaatsteDagVorigeMaand (17) < 18 AND leeftijdOpLaatsteDagHuidigeMaand (18) = 18 → `true`

**rechtgevendeLeeftijd**  
leeftijdOpDatumBerekening (18) ≥ 18 BUT meerderjarigDezeMaand = true → `false`

meerderjarigDezeMaand is the **sole disqualifier**. leeftijdOpDatumBerekening = 18 would otherwise qualify.

**eligible = false, amountYear = 0**

**Verdict: ✅ CORRECT** — Regelgroep 012 is properly isolated.

---

## TC4 — `TC4_Eligible_treaty_abroad_missing_income`

**Expected:** `eligible=true, amountYear=null`

**statusRouteOk (Regelgroep 009)**  
woonachtigNL = false AND statusZorgverzekerd = "Buitenlands verdragsgerechtigd" → second clause fires → `true`

**rechtgevendeLeeftijd**  
leeftijdOpDatumBerekening = 35 ≥ 18, meerderjarigDezeMaand = false → `true`

**inLeven, niet gedetineerd** → both `true` → **eligible = true** ✓

**Amount (Regelgroep 001)**  
toetsingsinkomen = null → inkomenBovenDrempel = null → normpremie = null  
→ jaarbedragToeslagBasis = null → jaarbedragToeslag = null → `amountYear = null`

This correctly implements Regelgroep 001: *jaarbedrag toeslag = leeg indien recht op toeslag = waar AND toetsingsinkomen = leeg.*

**Verdict: ✅ CORRECT**

---

## TC5 — `TC5_Not_eligible_deceased`

**Expected:** `eligible=false, amountYear=0`

**inLeven (Regelgroep 008)**  
overlijdensdatum = 2026-01-10 ≠ null → `inLeven = false`

All other conditions are satisfied (age 45, binnenlands verzekerd, niet gedetineerd), making inLeven the **sole disqualifier**.

**eligible = false, amountYear = 0**

**Verdict: ✅ CORRECT** — Regelgroep 008 is properly isolated.

---

## TC6 — `TC6_Not_eligible_no_valid_insurance_route`

**Expected:** `eligible=false, amountYear=0`

**statusRouteOk (Regelgroep 009)**

| Clause | Condition | Result |
|---|---|---|
| Domestic | rechtmatigVerblijfNL = false AND statusZorgverzekerd = "Niet verzekerd" | ❌ fails |
| Treaty abroad | woonachtigNL = true (must be false) AND statusZorgverzekerd = "Niet verzekerd" | ❌ fails |

Neither clause fires → `statusRouteOk = false` → **eligible = false**

All other conditions (age 40, alive, niet gedetineerd) are satisfied, making statusRouteOk the **sole disqualifier**.

**amountYear = 0**

**Verdict: ✅ CORRECT** — statusRouteOk branching is properly isolated.

---

## TC7 — `TC7_Eligible_amount_capped_at_maximum`

**Expected:** `eligible=true, amountYear=1483`

**eligible** — all conditions satisfied (age 20, binnenlands verzekerd, alive, niet gedetineerd) → `true` ✓

**Amount (Regelgroep 002–005)**

| Step | Calculation | Result |
|---|---|---|
| woonlandfactor | statusZorgverzekerd = "Binnenlands" → 1 | **1.00** |
| standaardpremie | 1987 × 1.00 | **€ 1987.00** |
| inkomenBovenDrempel | max(0 − 26819, 0) | **€ 0.00** |
| normpremie | 503.93 + (13.67/100 × 0) | **€ 503.93** |
| jaarbedragToeslagBasis | 1987.00 − 503.93 | **€ 1483.07** |
| doelmatigheidsgrens check | 1483.07 > 23.50 | pass |
| max cap check | 1483.07 > 1483.00 → cap applies | **€ 1483.00** |
| **amountYear** | | **€ 1483.00** |

**Verdict: ✅ CORRECT** — upper cap of MAX_ZORGTOESLAG_ZP is triggered.

---

## TC8 — `TC8_Eligible_amount_zeroed_by_doelmatigheidsgrens`

**Expected:** `eligible=true, amountYear=0`

**eligible** — all conditions satisfied (age 37, binnenlands verzekerd, alive, niet gedetineerd) → `true` ✓

**Amount (Regelgroep 002–005)**

| Step | Calculation | Result |
|---|---|---|
| woonlandfactor | statusZorgverzekerd = "Binnenlands" → 1 | **1.00** |
| standaardpremie | 1987 × 1.00 | **€ 1987.00** |
| inkomenBovenDrempel | max(37594 − 26819, 0) | **€ 10775.00** |
| normpremie | 503.93 + (13.67/100 × 10775) | **€ 1976.85** |
| jaarbedragToeslagBasis | 1987.00 − 1976.85 | **€ 10.15** |
| doelmatigheidsgrens check | 10.15 < 23.50 → zeroed | **€ 0.00** |
| **amountYear** | | **€ 0.00** |

Person is eligible but receives nothing — the DOELMATIGHEIDSGRENS threshold eliminates the amount. This is a meaningful edge case: a positive but very small entitlement is suppressed by design.

**Verdict: ✅ CORRECT** — DOELMATIGHEIDSGRENS lower threshold is triggered.

---

## TC9 — `TC9_Eligible_treaty_abroad_with_income_reduced_woonlandfactor`

**Expected:** `eligible=true, amountYear=1185.02`

**statusRouteOk (Regelgroep 009)**  
woonachtigNL = false AND statusZorgverzekerd = "Buitenlands verdragsgerechtigd" → `true`

**eligible** — age 35, alive, niet gedetineerd → `true` ✓

**Amount (Regelgroep 002–005)**

| Step | Calculation | Result |
|---|---|---|
| woonlandfactor | statusZorgverzekerd = "Buitenlands verdragsgerechtigd" → woonlandfactorBuitenland | **0.85** |
| standaardpremie | 1987 × 0.85 | **€ 1688.95** |
| inkomenBovenDrempel | max(25000 − 26819, 0) | **€ 0.00** |
| normpremie | 503.93 + (13.67/100 × 0) | **€ 503.93** |
| jaarbedragToeslagBasis | 1688.95 − 503.93 | **€ 1185.02** |
| doelmatigheidsgrens check | 1185.02 > 23.50 | pass |
| max cap check | 1185.02 < 1483.00 | pass |
| **amountYear** | | **€ 1185.02** |

The reduced woonlandfactor (0.85) directly scales the standaardpremie downward, correctly lowering the entitlement compared to a domestic insured on the same income. Tests Regelgroep 005 end-to-end.

**Verdict: ✅ CORRECT**

---

## Summary

| # | Test case | Expected | Verdict | Rule(s) tested |
|---|---|---|---|---|
| TC1 | Eligible NL insured, moderate income | `eligible=true, amountYear=1048.28` | ✅ | Regelgroep 002–009 |
| TC2 | Not eligible — detained | `eligible=false, amountYear=0` | ✅ | Regelgroep 009 (gedetineerd) |
| TC3 | Not eligible — became 18 this month | `eligible=false, amountYear=0` | ✅ | Regelgroep 012 (meerderjarigDezeMaand) |
| TC4 | Eligible abroad — missing income | `eligible=true, amountYear=null` | ✅ | Regelgroep 001, 009 |
| TC5 | Not eligible — deceased | `eligible=false, amountYear=0` | ✅ | Regelgroep 008 (inLeven) |
| TC6 | Not eligible — no valid insurance route | `eligible=false, amountYear=0` | ✅ | Regelgroep 009 (statusRouteOk) |
| TC7 | Eligible — amount capped at maximum | `eligible=true, amountYear=1483` | ✅ | Regelgroep 002 (MAX cap) |
| TC8 | Eligible — amount zeroed by doelmatigheidsgrens | `eligible=true, amountYear=0` | ✅ | Regelgroep 002 (doelmatigheidsgrens) |
| TC9 | Eligible abroad — income with reduced woonlandfactor | `eligible=true, amountYear=1185.02` | ✅ | Regelgroep 005 (woonlandfactor) |
