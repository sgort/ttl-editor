# Test Case Validation — `HvA_full_dmn_export-patched.dmn`

**DMN:** `examples/organizations/amsterdam/HvA_full_dmn_export-patched.dmn`  
**Test cases:** `examples/organizations/amsterdam/testCases/test-cases-hva-full-dmn-export.json`  
**Deployed at:** `http://localhost:8081/engine-rest` (deployment `HvA_full_dmn_export-patched`)  
**peildatum:** 2025-06-01 (all cases, unless noted otherwise)

All 40 `expected` values below were captured by evaluating the corresponding case live against the deployed DMN, not hand-computed — the reasoning columns explain _why_ each result is correct (cross-checked against the decision table's own rule content), not a prediction that happened to match. See [`hva-full-dmn-export-feel-evaluation-fix.md`](../hva-full-dmn-export-feel-evaluation-fix.md) for why this required a patched copy of the DMN in the first place.

## Scope

MC/DC-style coverage (one case per rule) for the 10 self-contained leaf decisions — tables whose inputs are all raw applicant facts, no dependency on another decision's result. Plus integration coverage for 4 composite decisions that chain through those leaves via `requiredDecision`, including the DRD root.

Every `requestBody.variables` object is the **full 52-variable baseline** (every raw input the DRD can ever need, set to a neutral/disqualifying default) with only the fields relevant to that case overridden — see the "Baseline" section below. This means every case is self-contained and safe to run standalone or as part of the full suite, and composite-decision cases exercise the _real_ `requiredDecision` chain (Operaton auto-evaluates the sub-decisions), not a hand-substituted shortcut.

## Baseline

Every case starts from this neutral set, overridden per case (see the JSON file for the exact merged `requestBody` of each case):

| Field(s)                                  | Default          | Why                                                                                       |
| ----------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| All boolean flags                         | `false`          | "No" is the safe default for every yes/no eligibility fact                                |
| All income/vermogen numbers               | `999999`         | Comfortably above every threshold in the DRD — disqualifies by default                    |
| `npGezinssituatie`                        | `"alleenstaand"` | A valid lookup key everywhere it's used                                                   |
| `npBurgerservicenummer`                   | `"123456789"`    | A non-null value for `not(null)` checks                                                   |
| `npGeboortedatum`, `partnerGeboortedatum` | `1970-01-01`     | Adult                                                                                     |
| `kindGeboortedatum`                       | `2000-01-01`     | Adult — keeps `kindMinderjarig` (and everything gated on it) `false` by default           |
| `*EindeGeldigheidNederlandsPaspoort...*`  | `2030-01-01`     | Far enough in the future that the "expires within 8 weeks" check never accidentally fires |
| `peildatum`                               | `2025-06-01`     | Matches the only year (2025) every loongrens/vermogensgrens lookup table has rows for     |

---

## `Beslistabel bepalen aanspraak op bijzondere bijstand`

`_5ff6a88e-fea3-4dc7-8863-e1bf542f2513`

### TC_bijstand_R1

**Expected:** `npAanspraakBijzondereBijstand` = true

MC/DC rule 1: bijzondere omstandigheden true, financiele draagkracht false, verwacht lening false, kan beroep false, kosten buitengesloten false -> true

### TC_bijstand_R2

**Expected:** `npAanspraakBijzondereBijstand` = true

MC/DC rule 2: same as R1 but kan beroep=true (breaks R1), verwacht reservering=false + kosten niet nodig=true (breaks R3) isolates rule 2 (verwacht lening / verwacht reservering route)

### TC_bijstand_R3

**Expected:** `npAanspraakBijzondereBijstand` = true

MC/DC rule 3: kan beroep doen=true breaks R1 and R2 (both need it false), verwacht reservering=true breaks R2 too; verwacht lening (wildcard for R3) left true, kosten niet nodig=false + kosten buitengesloten=false satisfies rule 3 (col2 verwacht lening is wildcard, col3 verwacht reservering wildcard for R3)

### TC_bijstand_R4

**Expected:** `npAanspraakBijzondereBijstand` = true

MC/DC rule 4: kan beroep=true breaks R1/R3, verwacht reservering=false breaks R2, isolates rule 4

### TC_bijstand_default

**Expected:** `npAanspraakBijzondereBijstand` = false

Default rule: no bijzondere omstandigheden at all -> false

---

## `Bepalen van toepassing zijnde loongrens vorig jaar voor volwassenen`

`_1fd5fa9b-4052-477d-9837-f18f59e0b1be`

### TC_loongrensVolwassenenVorig_alleenstaand

**Expected:** `vanToepassingZijndeLoongrensVorigJaarVolwassenen` = 26664

Lookup for gezinssituatie='alleenstaand', peildatum year 2025 -> 26664

### TC_loongrensVolwassenenVorig_alleenstaand_met_kinderen

**Expected:** `vanToepassingZijndeLoongrensVorigJaarVolwassenen` = 32715

Lookup for gezinssituatie='alleenstaand met kinderen', peildatum year 2025 -> 32715

### TC_loongrensVolwassenenVorig_met_partner

**Expected:** `vanToepassingZijndeLoongrensVorigJaarVolwassenen` = 36350

Lookup for gezinssituatie='met partner', peildatum year 2025 -> 36350

---

## `Beslistabel bepalen schuldregeling`

`_47e5f1bc-2557-44f3-9aa2-07e520126f33`

### TC_schuldregeling_R1

**Expected:** `npEenSchuldregeling` = true

MC/DC: gemeente-aangewezen schuldregeling alone -> true

### TC_schuldregeling_R2

**Expected:** `npEenSchuldregeling` = true

MC/DC: minnelijke schuldregeling alone -> true

### TC_schuldregeling_R3

**Expected:** `npEenSchuldregeling` = true

MC/DC: WSNP schuldregeling alone -> true

### TC_schuldregeling_default

**Expected:** `npEenSchuldregeling` = false

Default: no schuldregeling of any kind -> false

---

## `Beslistabel bepalen natuurlijke persoon is meerderjarig`

`_70476381-08ed-4db9-8602-edcc50341607`

### TC_meerderjarig_true

**Expected:** `npMeerderjarig` = true

Age ~25 (born 2000-01-10) -> true

### TC_meerderjarig_false

**Expected:** `npMeerderjarig` = false

Age ~10 (born 2015-01-10) -> false

---

## `Bepalen van toepassing zijnde vermogensgrens`

`_912d27e0-1b8f-47bd-98cf-1863354ef321`

### TC_vermogensgrens_alleenstaand

**Expected:** `vanToepassingZijndeVermogensgrens` = 7575

Lookup for gezinssituatie='alleenstaand', berekeningsjaar-1=2024 -> 7575

### TC_vermogensgrens_alleenstaand_met_kinderen

**Expected:** `vanToepassingZijndeVermogensgrens` = 15150

Lookup for gezinssituatie='alleenstaand met kinderen', berekeningsjaar-1=2024 -> 15150

### TC_vermogensgrens_met_partner

**Expected:** `vanToepassingZijndeVermogensgrens` = 15150

Lookup for gezinssituatie='met partner', berekeningsjaar-1=2024 -> 15150

---

## `Bepaal pensioengerechtigde leeftijd`

`_adcd1d42-b570-4e57-854b-ce5444975185`

### TC_pensioengerechtigd_2025

**Expected:** `pensioengerechtigdeLeeftijd` = 67

peildatum year 2025 -> 67

### TC_pensioengerechtigd_2026

**Expected:** `pensioengerechtigdeLeeftijd` = 67

peildatum year 2026 -> 67

---

## `Bepalen van toepassing zijnde loongrens vorig jaar voor kinderen`

`_d4786c58-c3ce-42c5-b8fa-d7deabd40823`

### TC_loongrensKinderenVorig_alleenstaand

**Expected:** `vanToepassingZijndeLoongrensVorigJaarKinderen` = 0

Lookup for gezinssituatie='alleenstaand', peildatum year 2025 -> 0

### TC_loongrensKinderenVorig_alleenstaand_met_kinderen

**Expected:** `vanToepassingZijndeLoongrensVorigJaarKinderen` = 37750

Lookup for gezinssituatie='alleenstaand met kinderen', peildatum year 2025 -> 37750

### TC_loongrensKinderenVorig_met_partner

**Expected:** `vanToepassingZijndeLoongrensVorigJaarKinderen` = 41950

Lookup for gezinssituatie='met partner', peildatum year 2025 -> 41950

---

## `Beslistabel bepalen kind is minderjarig`

`_e86e55be-0483-4f64-971d-bbae860e6709`

### TC_minderjarig_true

**Expected:** `kindMinderjarig` = true

Age ~10 (born 2015-01-10) -> true

### TC_minderjarig_false

**Expected:** `kindMinderjarig` = false

Age ~25 (born 2000-01-10) -> false

---

## `Bepalen van toepassing zijnde loongrens drie jaar geleden`

`_3cf65a11-8b0b-49a5-a90b-c1c5d8f0916f`

### TC_loongrensDrieJaarGeleden_alleenstaand

**Expected:** `vanToepassingZijndeLoongrensDrieJaarGeledenVolwassenen` = 22000

Lookup for gezinssituatie='alleenstaand', peildatum year 2025 -> 22000

### TC_loongrensDrieJaarGeleden_alleenstaand_met_kinderen

**Expected:** `vanToepassingZijndeLoongrensDrieJaarGeledenVolwassenen` = 27000

Lookup for gezinssituatie='alleenstaand met kinderen', peildatum year 2025 -> 27000

### TC_loongrensDrieJaarGeleden_met_partner

**Expected:** `vanToepassingZijndeLoongrensDrieJaarGeledenVolwassenen` = 30000

Lookup for gezinssituatie='met partner', peildatum year 2025 -> 30000

---

## `Bepalen van toepassing zijnde loongrens twee jaar geleden`

`_ac0ec9fc-d8f9-4195-b7f6-b9036e61eab1`

### TC_loongrensTweeJaarGeleden_alleenstaand

**Expected:** `vanToepassingZijndeLoongrensTweeJaarGeledenVolwassenen` = 24720

Lookup for gezinssituatie='alleenstaand', peildatum year 2025 -> 24720

### TC_loongrensTweeJaarGeleden_alleenstaand_met_kinderen

**Expected:** `vanToepassingZijndeLoongrensTweeJaarGeledenVolwassenen` = 30330

Lookup for gezinssituatie='alleenstaand met kinderen', peildatum year 2025 -> 30330

### TC_loongrensTweeJaarGeleden_met_partner

**Expected:** `vanToepassingZijndeLoongrensTweeJaarGeledenVolwassenen` = 33700

Lookup for gezinssituatie='met partner', peildatum year 2025 -> 33700

---

## `Beslistabel bepalen aanspraak op individuele inkomenstoeslag`

`_bca439b7-fdb8-40e3-8a1d-3bb95571c65c`

### TC_iit_route_langdurigLaagInkomen

**Expected:** `npAanspraakIndividueleInkomenstoeslag` = true

Route 1 (langdurig laag inkomen): woonachtig true, leeftijd 35 (21<=x<67), uitzicht inkomensverbetering false, income well under all 3 loongrens thresholds (langdurig laag inkomen -> true), vermogen under vermogensgrens, gezinssituatie alleenstaand (not partner) -> true

### TC_iit_route_schuldregeling

**Expected:** `npAanspraakIndividueleInkomenstoeslag` = true

Route 2 (schuldregeling): same base but income too high for langdurig laag inkomen (forces route 1 to fail), npEenSchuldregelingDoorGemeenteAangewezenGemandateerde=true -> schuldregeling route qualifies -> true

### TC_iit_false

**Expected:** `npAanspraakIndividueleInkomenstoeslag` = false

Not woonachtig in de gemeente -> false (no route can qualify)

---

## `Beslistabel bepalen aanspraak op individuele inkomenstoeslag partner`

`_5d364321-409e-432f-83f2-f04cc26035fc`

### TC_iitPartner_true

**Expected:** `partnerAanspraakIndividueleInkomenstoeslag` = true

Partner route 1: woonachtig true, leeftijd 35, langdurig laag inkomen true, vermogen under threshold -> true

### TC_iitPartner_false

**Expected:** `partnerAanspraakIndividueleInkomenstoeslag` = false

Partner not woonachtig in de gemeente -> false

---

## `Beslistabel bepalen aanspraak op een stadspas`

`_6041f4d4-35e8-4377-993d-5b2a879c31e4`

### TC_stadspas_route_inkomen

**Expected:** `npAanspraakStadspas` = true

Income route: woonachtig+meerderjarig true, bsn present, income/vermogen under thresholds, no onderwijs -> true

### TC_stadspas_route_schuldregeling

**Expected:** `npAanspraakStadspas` = true

Schuldregeling route: income too high for the income route, but has a schuldregeling -> true

### TC_stadspas_false

**Expected:** `npAanspraakStadspas` = false

Not woonachtig in de gemeente -> false

---

## `Bepalen aanspraken (DRD root)`

`_bad36e9e-ac9d-4d78-b0be-2f1c58cbf3c5`

### TC_root_no_match

**Expected:** empty result (no matching rule)

Baseline (nothing qualifies for anything) -> empty result set (RULE ORDER has no catch-all rule)

### TC_root_bijzondereBijstand_only

**Expected:** `aanspraken` = 'Aanspraak op bijzondere bijstand'

Only bijzondere bijstand's own rule 1 triggers; all 11 other direct sub-decisions independently disqualified by baseline (npWoonachtig=false, partnerWoonachtig=false, kind is an adult) -> aanspraken = ['Aanspraak op bijzondere bijstand']

---

## Summary

| Decision                                                               | Cases | Kind                    |
| ---------------------------------------------------------------------- | ----- | ----------------------- |
| `Beslistabel bepalen aanspraak op bijzondere bijstand`                 | 5     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens vorig jaar voor volwassenen`  | 3     | leaf (MC/DC)            |
| `Beslistabel bepalen schuldregeling`                                   | 4     | leaf (MC/DC)            |
| `Beslistabel bepalen natuurlijke persoon is meerderjarig`              | 2     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde vermogensgrens`                         | 3     | leaf (MC/DC)            |
| `Bepaal pensioengerechtigde leeftijd`                                  | 2     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens vorig jaar voor kinderen`     | 3     | leaf (MC/DC)            |
| `Beslistabel bepalen kind is minderjarig`                              | 2     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens drie jaar geleden`            | 3     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens twee jaar geleden`            | 3     | leaf (MC/DC)            |
| `Beslistabel bepalen aanspraak op individuele inkomenstoeslag`         | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op individuele inkomenstoeslag partner` | 2     | composite (integration) |
| `Beslistabel bepalen aanspraak op een stadspas`                        | 3     | composite (integration) |
| `Bepalen aanspraken (DRD root)`                                        | 2     | composite (integration) |

**Total: 40 cases across 14 decisions.**

**Not covered by this suite:** the remaining 11 composite decisions (`aanspraak op kindtegoed`, `aanspraak Stadspas van kind`, `aanspraak op PC-voorziening`, `aanspraak op regeling tegemoetkoming meerkosten`, `aanspraak op reiskostenvergoeding kind`, `aanspraak op tegemoetkoming identiteitskaart` (both variants), `aanvullend kindtegoed`, `langdurig laag inkomen`, `minimabeleid kind`, `scholier`) — each follows the same MC/DC-over-its-own-rules pattern demonstrated above and can be added the same way; left out here to keep this pass to a reviewable size, per the leaves-plus-key-integration scope agreed before writing this suite.
