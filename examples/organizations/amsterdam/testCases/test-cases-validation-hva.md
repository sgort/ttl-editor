# Test Case Validation — `HvA_full_dmn_export-patched.dmn`

**DMN:** `examples/organizations/amsterdam/HvA_full_dmn_export-patched.dmn`  
**Test cases:** `examples/organizations/amsterdam/testCases/test-cases-hva-full-dmn-export.json`  
**Deployed at:** `http://localhost:8081/engine-rest` (deployment `HvA_full_dmn_export-patched`)  
**peildatum:** 2025-06-01 (all cases, unless noted otherwise)

All `expected` values below were captured by evaluating the corresponding case live against the deployed DMN, not hand-computed — the reasoning explains _why_ each result is correct (cross-checked against the decision table's own rule content), not a prediction that happened to match. See [`hva-full-dmn-export-feel-evaluation-fix.md`](../hva-full-dmn-export-feel-evaluation-fix.md) for why this required a patched copy of the DMN in the first place — including issues (interval-notation ranges, `not "string"`, and a `hitPolicy` gap on two decisions) that this test suite itself surfaced while it was being written.

## Running these tests yourself

```bash
cd examples/organizations/amsterdam/testCases
./test-cases-hva.sh
```

The script deploys `HvA_full_dmn_export-patched.dmn` to a local Operaton instance (default `http://localhost:8081/engine-rest`, override with `OPERATON_URL`) and runs every case in `test-cases-hva-full-dmn-export.json` against it, printing a pass/fail summary — same idea as `examples/organizations/toeslagen/test-cases-zorgtoeslag.sh`, adapted for per-case decision routing: each case in this suite targets a different decision within the same DRD (via its own `decision` field), rather than one shared decision key. Requires `curl` and `jq`. You can also load the JSON file directly into the CPSV Editor's DMN tab ("Run All Test Cases") against any already-deployed instance, without the script.

If you're only editing `test-cases-hva-full-dmn-export.json` (adding or tweaking cases) and the DMN itself hasn't changed, skip the redeploy on repeat runs:

```bash
SKIP_DEPLOY=1 ./test-cases-hva.sh
```

## Scope

Full coverage of all 25 decisions in the DRD: MC/DC-style one-case-per-rule for the 11 self-contained leaf decisions (tables whose inputs are all raw applicant facts or simple numeric lookups), plus representative true/false integration coverage — typically one case per qualifying "route" through the table's rules, plus one disqualifying case — for the 13 composite decisions that chain through those leaves via `requiredDecision`, plus the DRD root. Composite decisions with many overlapping rules (e.g. `minimabeleid kind`'s 13 rules) get 2-3 representative cases rather than one case per individual rule, to keep the suite reviewable; each case's description names which specific rule it exercises.

Every `requestBody.variables` object is the **full 52-variable baseline** (every raw input the DRD can ever need, set to a neutral/disqualifying default) with only the fields relevant to that case overridden — see "Baseline" below. Every case is self-contained and safe to run standalone or as part of the full suite, and composite-decision cases exercise the _real_ `requiredDecision` chain (Operaton auto-evaluates the sub-decisions), not a hand-substituted shortcut.

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

## Several composite "kind" decisions share a common **kind-qualifies** override set (`kindGeboortedatum` young enough to be `minderjarig`, `kindIngeschrevenWoonadresOuderAanvraagt=true`, `npOntvangtKinderbijslagKind=true`, a schuldregeling flag `true`) that makes `kindEenBeleidsregelsMinimakind` ("minimabeleid kind") true via its rule 2 — reused across `kindtegoed`, `Stadspas van kind`, `PC-voorziening`, `reiskostenvergoeding kind`, `tegemoetkoming identiteitskaart kind`, `aanvullend kindtegoed`, `minimabeleid kind` itself, and `scholier`, since all of them require it as a precondition.

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

## `Beslistabel bepalen langdurig laag inkomen`

`_299e6c91-3fe5-49aa-88cc-efd03583ae87`

### TC_langdurigLaagInkomen_true

**Expected:** `npLangdurigLaagInkomen` = true

All 3 years' income comfortably under the respective loongrens thresholds (alleenstaand) -> true

### TC_langdurigLaagInkomen_false

**Expected:** `npLangdurigLaagInkomen` = false

Baseline: all 3 incomes far above threshold -> false

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

## `Beslistabel bepalen aanspraak op kindtegoed`

`_1934cfb6-91ef-4ef0-99ac-78a8ef0c5de4`

### TC_kindtegoed_true

**Expected:** `npAanspraakKindtegoed` = true

Woonachtig true, bsn present (baseline), kind qualifies for minimabeleid AND for Stadspas (same overrides satisfy both sub-decisions' schuldregeling route) -> true

### TC_kindtegoed_false

**Expected:** `npAanspraakKindtegoed` = false

Not woonachtig in de gemeente -> false

---

## `Beslistabel bepalen aanspraak Stadspas van kind van natuurlijke persoon`

`_216b3e6c-c9eb-4def-bfe7-3b20b961de2d`

### TC_stadspasKind_route_schuldregeling

**Expected:** `kindAanspraakStadspas` = true

Kind minderjarig, ouder meerderjarig+woonachtig, bsn present, schuldregeling route -> true

### TC_stadspasKind_route_inkomen

**Expected:** `kindAanspraakStadspas` = true

Income route: gezinssituatie 'alleenstaand met kinderen' (loongrensKinderen=37750, vermogensgrens=15150), income/vermogen comfortably under both -> true

### TC_stadspasKind_false

**Expected:** `kindAanspraakStadspas` = false

Not woonachtig in de gemeente -> false

---

## `Beslistabel bepalen aanspraak op PC-voorziening`

`_a95ae1d9-eb21-4ef0-8e97-550cba6d5b27`

### TC_pc_route_basisschool

**Expected:** `npAanspraakPcVoorziening` = true

Kind qualifies for minimabeleid, ingeschreven op basisschool, age 10 (in [10,12]) -> true

### TC_pc_route_voortgezet

**Expected:** `npAanspraakPcVoorziening` = true

Kind qualifies for minimabeleid, ingeschreven op voortgezet onderwijs, no prior pc-voorziening in the past 4 years -> true

### TC_pc_false

**Expected:** `npAanspraakPcVoorziening` = false

Baseline: kind is an adult, minimabeleid false -> false

---

## `Beslistabel bepalen aanspraak op regeling tegemoetkoming meerkosten`

`_ae01d740-f954-4a84-8dd8-a28fc3660cc6`

### TC_meerkosten_route_inkomen

**Expected:** `npAanspraakRegelingTegemoetkomingMeerkosten` = true

Woonachtig, medische verklaring, aannemelijke meerkosten, minimuminkomen, vermogen under threshold -> true

### TC_meerkosten_route_schuldregeling

**Expected:** `npAanspraakRegelingTegemoetkomingMeerkosten` = true

Same base but schuldregeling route instead of minimuminkomen/vermogen -> true

### TC_meerkosten_false

**Expected:** `npAanspraakRegelingTegemoetkomingMeerkosten` = false

Not woonachtig in de gemeente -> false

---

## `Beslistabel bepalen aanspraak op reiskostenvergoeding kind`

`_9439cfee-4abb-447e-9002-a1254b59442c`

### TC_reiskosten_true

**Expected:** `npAanspraakReiskostenvergoedingKind` = true

Kind qualifies as scholier (minimabeleid + basisschool + age>=2), afstand tot school groter dan 9 km, geen andere voorliggende voorziening -> true

### TC_reiskosten_false

**Expected:** `npAanspraakReiskostenvergoedingKind` = false

Baseline: kind not a scholier -> false

---

## `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart`

`_8a0d9e20-95d2-4cff-ab6a-08dc1b17bfbc`

### TC_idkaartNp_route_expiryFuture

**Expected:** `npAanspraakTegemoetkomingIdentiteitskaart` = true

Has a Stadspas (schuldregeling route), Nederlandse nationaliteit, identiteitskaart still valid (expiry 2030, > peildatum), lost the previous one -> true

### TC_idkaartNp_route_expiringSoon

**Expected:** `npAanspraakTegemoetkomingIdentiteitskaart` = true

Same Stadspas/nationaliteit base, but identiteitskaart expires 2025-07-01 (~4 weeks after peildatum, <= 8 weeks) -> true

### TC_idkaartNp_false

**Expected:** `npAanspraakTegemoetkomingIdentiteitskaart` = false

Not woonachtig in de gemeente -> false

---

## `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart voor kind van natuurlijk persoon`

`_86cf13d6-facf-42c2-9ed2-3bf2c8e3baf0`

### TC_idkaartKind_route_expiryFuture

**Expected:** `kindAanspraakTegemoetkomingIdentiteitskaart` = true

Kind has a Stadspas (schuldregeling route), Nederlandse nationaliteit, identiteitskaart still valid, lost the previous one -> true

### TC_idkaartKind_route_expiringSoon

**Expected:** `kindAanspraakTegemoetkomingIdentiteitskaart` = true

Same base, identiteitskaart expires 2025-07-01 (<= 8 weeks away) -> true

### TC_idkaartKind_false

**Expected:** `kindAanspraakTegemoetkomingIdentiteitskaart` = false

Baseline: kind has no Stadspas -> false

---

## `Beslistabel aanspaak op aanvullend kindtegoed`

`_a92ecca0-d6bf-463b-809c-82aa3d0f95b0`

### TC_aanvullendKindtegoed_true

**Expected:** `npAanspraakAanvullendKindtegoed` = true

Has aanspraak op kindtegoed (reusing that decision's true-case overrides) and bewijs inschrijving voorschool -> true

### TC_aanvullendKindtegoed_false

**Expected:** `npAanspraakAanvullendKindtegoed` = false

Baseline: no aanspraak op kindtegoed -> false

---

## `Beslistabel bepalen of een kind een minimabeleid kind is`

`_52e3eb1b-1561-431c-9e8b-e9314f20836f`

### TC_minimakind_route_kinderbijslagSchuldregeling

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 2: minderjarig, ingeschreven op woonadres ouder, ontvangt kinderbijslag, schuldregeling -> true

### TC_minimakind_route_jeugdhulpVoedselpakketten

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 9: minderjarig, ingeschreven in instelling voor jeugdhulp met verblijf, ontvangt kinderbijslag, ontvangt voedselpakketten -> true

### TC_minimakind_false

**Expected:** `kindEenBeleidsregelsMinimakind` = false

Baseline: kind is an adult (not minderjarig) -> false

---

## `Beslistabel bepalen of een kind een scholier is`

`_8e0b94dc-e62c-45c7-b731-cc18bbf484cc`

### TC_scholier_route_basisschool

**Expected:** `kindEenBeleidsregelMinimakindScholier` = true

Kind qualifies for minimabeleid, age 10 (>= 2), ingeschreven op basisschool -> true

### TC_scholier_route_voortgezet

**Expected:** `kindEenBeleidsregelMinimakindScholier` = true

Kind qualifies for minimabeleid, age 10 (>= 2), ingeschreven op voortgezet onderwijs -> true

### TC_scholier_false

**Expected:** `kindEenBeleidsregelMinimakindScholier` = false

Baseline: kind is an adult, minimabeleid false -> false

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

| Decision                                                                                            | Cases | Kind                    |
| --------------------------------------------------------------------------------------------------- | ----- | ----------------------- |
| `Beslistabel bepalen aanspraak op bijzondere bijstand`                                              | 5     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens vorig jaar voor volwassenen`                               | 3     | leaf (MC/DC)            |
| `Beslistabel bepalen schuldregeling`                                                                | 4     | leaf (MC/DC)            |
| `Beslistabel bepalen natuurlijke persoon is meerderjarig`                                           | 2     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde vermogensgrens`                                                      | 3     | leaf (MC/DC)            |
| `Bepaal pensioengerechtigde leeftijd`                                                               | 2     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens vorig jaar voor kinderen`                                  | 3     | leaf (MC/DC)            |
| `Beslistabel bepalen kind is minderjarig`                                                           | 2     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens drie jaar geleden`                                         | 3     | leaf (MC/DC)            |
| `Bepalen van toepassing zijnde loongrens twee jaar geleden`                                         | 3     | leaf (MC/DC)            |
| `Beslistabel bepalen langdurig laag inkomen`                                                        | 2     | leaf (MC/DC)            |
| `Beslistabel bepalen aanspraak op individuele inkomenstoeslag`                                      | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op individuele inkomenstoeslag partner`                              | 2     | composite (integration) |
| `Beslistabel bepalen aanspraak op een stadspas`                                                     | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op kindtegoed`                                                       | 2     | composite (integration) |
| `Beslistabel bepalen aanspraak Stadspas van kind van natuurlijke persoon`                           | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op PC-voorziening`                                                   | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op regeling tegemoetkoming meerkosten`                               | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op reiskostenvergoeding kind`                                        | 2     | composite (integration) |
| `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart`                                  | 3     | composite (integration) |
| `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart voor kind van natuurlijk persoon` | 3     | composite (integration) |
| `Beslistabel aanspaak op aanvullend kindtegoed`                                                     | 2     | composite (integration) |
| `Beslistabel bepalen of een kind een minimabeleid kind is`                                          | 3     | composite (integration) |
| `Beslistabel bepalen of een kind een scholier is`                                                   | 3     | composite (integration) |
| `Bepalen aanspraken (DRD root)`                                                                     | 2     | composite (integration) |

**Total: 69 cases across 25 of the DRD's 25 decisions — full coverage.**
