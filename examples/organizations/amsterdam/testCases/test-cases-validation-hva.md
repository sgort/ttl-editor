# Test Case Validation — `HvA_full_dmn_export-patched.dmn`

**DMN:** `examples/organizations/amsterdam/HvA_full_dmn_export-patched.dmn`  
**Test cases:** `examples/organizations/amsterdam/testCases/test-cases-hva-full-dmn-export.json`  
**Deployed at:** `http://localhost:8081/engine-rest` (deployment `HvA_full_dmn_export-patched`)  
**peildatum:** 2025-06-01 (all cases, unless noted otherwise)

For what legal source backs each decision's rules — as opposed to whether the rules evaluate correctly, which is what this document covers — see [`legal-sources-hva.md`](legal-sources-hva.md), generated from the original DMN and annotation export by [`extract-legal-sources.py`](extract-legal-sources.py).

All `expected` values below were captured by evaluating the corresponding case live against the deployed DMN, not hand-computed — the reasoning explains _why_ each result is correct (cross-checked against the decision table's own rule content), not a prediction that happened to match. See [`hva-full-dmn-export-feel-evaluation-fix.md`](../hva-full-dmn-export-feel-evaluation-fix.md) for why this required a patched copy of the DMN in the first place — including issues (interval-notation ranges, `not "string"`, and a `hitPolicy` gap on two decisions) that this test suite itself surfaced while it was being written.

## Running these tests yourself

```bash
cd examples/organizations/amsterdam/testCases
./test-cases-hva.sh
```

The script deploys `HvA_full_dmn_export-patched.dmn` to a local Operaton instance (default `http://localhost:8081/engine-rest`, override with `OPERATON_URL`) and runs every case in `test-cases-hva-full-dmn-export.json` against it, printing a pass/fail summary — same idea as `examples/organizations/toeslagen/test-cases-zorgtoeslag.sh`, adapted for per-case decision routing: each case in this suite targets a different decision within the same DRD (via its own `decision` field), rather than one shared decision key. Requires `curl` and `jq`. You can also load the JSON file directly into the CPSV Editor's DMN tab ("Run All Test Cases") against any already-deployed instance, without the script.

## Scope

Full rule coverage of all 25 decisions in the DRD: every one of the DRD's 99 rules (across the 11 self-contained leaf decisions, the 13 composite decisions that chain through those leaves via `requiredDecision`, and the DRD root) has at least one dedicated, empirically-verified test case that isolates it — carefully choosing each case's overrides so that no _earlier_ rule in the same table (`hitPolicy=FIRST`) matches first. This is what the rest of this document calls "MC/DC-style": not strict classic MC/DC (independent-effect testing of individual boolean conditions within one rule's expression), but rule/decision coverage — one case per rule, for every rule in the DRD.

This is a rule-coverage suite ("does every rule fire the way its own row says it should, in isolation from every earlier row"), not a condition-coverage suite ("does every individual boolean sub-condition inside a rule independently flip the outcome") — the latter would require substantially more cases per multi-condition rule and is not attempted here.

At the DRD root (`Bepalen aanspraken`, `hitPolicy=RULE ORDER`), "isolate the rule" sometimes isn't possible — several of the root's 12 output rows share qualifying leaf-level facts or have direct `requiredDecision` dependencies on each other, so triggering one legitimately triggers others in the same evaluation. Where that's the case, the test case's expected result is the full, verified multi-row output rather than a single isolated row — see "Structural couplings" below for exactly which rows are affected and why.

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

Several composite "kind" decisions share a common **kind-qualifies** override set (`kindGeboortedatum` young enough to be `minderjarig`, `kindIngeschrevenWoonadresOuderAanvraagt=true`, `npOntvangtKinderbijslagKind=true`, a schuldregeling flag `true`) that makes `kindEenBeleidsregelsMinimakind` ("minimabeleid kind") true via its rule 2 — reused across `kindtegoed`, `Stadspas van kind`, `PC-voorziening`, `reiskostenvergoeding kind`, `tegemoetkoming identiteitskaart kind`, `aanvullend kindtegoed`, `minimabeleid kind` itself, and `scholier`, since all of them require it as a precondition.

## Structural couplings

The DRD root, `Bepalen aanspraken`, has `hitPolicy=RULE ORDER`: it returns _every_ matching row, not just the first. Closing the rule-coverage gap surfaced that several of its 12 output rows cannot be triggered in isolation — either because one row's own decision table has a hard `requiredDecision`-chain dependency on another, or because two independent decisions share a qualifying leaf-level fact. Both are real properties of Amsterdam's benefit-eligibility rules as encoded in this DMN, verified live against Operaton — not test-design gaps or defects to fix. 6 of the 13 root test cases (`TC_root_*_coupled`) document a genuine multi-row result; the other 7 single-output cases (`TC_root_*_only`) were specifically constructed to avoid every coupling below, to also demonstrate that true isolation _is_ possible for the remaining rows.

**1. The schuldregeling cascade.** `npEenSchuldregelingDoorGemeenteAangewezenGemandateerde=true` (a household debt-restructuring arrangement) is an _alternative_ qualifying route — independent of the income route — in both `stadspas (natuurlijke persoon)` (rule 2) and `individuele inkomenstoeslag (natuurlijke persoon)` (rule 2). It's also part of the shared "kind qualifies" override set used to satisfy the kind-side minimabeleid route. Whenever a case sets this flag _and_ `npWoonachtigGemeenteAangevraagd=true` (needed by the parent-level rows), both `aanspraak op een stadspas` and `aanspraak op individuele inkomenstoeslag` fire alongside whatever kind-side row the case is really targeting — this is why `TC_root_kindtegoed_coupled`, `TC_root_aanvullendKindtegoed_coupled`, `TC_root_stadspasKind_coupled`, and `TC_root_tegemoetkomingIdentiteitskaartKind_coupled` each report 2 extra rows beyond their own target row. `TC_root_iitNp_coupled` shows a narrower version of the same idea without the kind-side facts: `individuele inkomenstoeslag`'s _langdurig-laag-inkomen_ route (3 years of low income) structurally implies `stadspas`'s single-year income route, so the two can never be split apart while that route is used.

**2. Direct `requiredDecision` chains among the kind-side rows.** `aanspraak op kindtegoed`'s own rule 1 has `kindAanspraakStadspas` (Stadspas van kind) as one of its AND-conditions — kindtegoed cannot be true unless Stadspas-kind already is. `aanvullend kindtegoed` in turn requires `kindtegoed=true`. `tegemoetkoming identiteitskaart voor kind` requires Stadspas-kind the same way `tegemoetkoming identiteitskaart (natuurlijke persoon)` requires the parent-level Stadspas. These are explicit, intentional prerequisite chains in the source decision tables, not coincidental fact-sharing — and they compose with coupling #1 above, since reaching Stadspas-kind in the first place goes through the same schuldregeling route.

| Root case                                            | Rows | Chain                                                                                                                |
| ---------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| `TC_root_iitNp_coupled`                              | 2    | individuele inkomenstoeslag (langdurig-laag-inkomen) → stadspas (shared income fact)                                 |
| `TC_root_kindtegoed_coupled`                         | 4    | kindtegoed → Stadspas-kind (direct dep.) → stadspas(np) + iit(np) (schuldregeling cascade)                           |
| `TC_root_aanvullendKindtegoed_coupled`               | 5    | aanvullend kindtegoed → kindtegoed → Stadspas-kind → stadspas(np) + iit(np)                                          |
| `TC_root_stadspasKind_coupled`                       | 3    | Stadspas-kind (schuldregeling route) → stadspas(np) + iit(np)                                                        |
| `TC_root_tegemoetkomingIdentiteitskaartNp_coupled`   | 2    | identiteitskaart(np) → stadspas(np) (direct dep., income route only — schuldregeling not used, so iit(np) stays out) |
| `TC_root_tegemoetkomingIdentiteitskaartKind_coupled` | 4    | identiteitskaart(kind) → Stadspas-kind → stadspas(np) + iit(np)                                                      |

By contrast, `TC_root_stadspasNp_only`, `TC_root_pcVoorziening_only`, `TC_root_meerkosten_only`, `TC_root_reiskostenvergoeding_only`, and `TC_root_partnerIit_only` show that `aanspraak op een stadspas`, `PC-voorziening`, `regeling tegemoetkoming meerkosten`, `reiskostenvergoeding kind`, and `individuele inkomenstoeslag partner` each _can_ be isolated to a single row — by deliberately picking a qualifying route (e.g. income rather than schuldregeling, voorschool rather than basisschool/BBL) that avoids every fact shared with another row's rules. See each case's own description for the specific route chosen and why it avoids overlap.

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

### TC_iit_R3_langdurigLaagInkomen_metPartner

**Expected:** `npAanspraakIndividueleInkomenstoeslag` = true

Rule 3: langdurig laag inkomen route, gezinssituatie 'met partner' — disambiguated from rule 1 via partnerUitzichtInkomensverbetering=false instead of the not('met partner') test

### TC_iit_R4_schuldregeling_metPartner

**Expected:** `npAanspraakIndividueleInkomenstoeslag` = true

Rule 4: schuldregeling route, gezinssituatie 'met partner'

---

## `Beslistabel bepalen aanspraak op individuele inkomenstoeslag partner`

`_5d364321-409e-432f-83f2-f04cc26035fc`

### TC_iitPartner_true

**Expected:** `partnerAanspraakIndividueleInkomenstoeslag` = true

Partner route 1: woonachtig true, leeftijd 35, langdurig laag inkomen true, vermogen under threshold -> true

### TC_iitPartner_false

**Expected:** `partnerAanspraakIndividueleInkomenstoeslag` = false

Partner not woonachtig in de gemeente -> false

### TC_iitPartner_R2_schuldregeling

**Expected:** `partnerAanspraakIndividueleInkomenstoeslag` = true

Rule 2: schuldregeling route instead of langdurig laag inkomen

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

### TC_stadspas_R3_voedselpakket

**Expected:** `npAanspraakStadspas` = true

Rule 3: voedselpakket route (income/vermogen/schuldregeling left at baseline-disqualifying levels so rules 1-2 can't match first)

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

### TC_stadspasKind_R2_income_jeugdhulp

**Expected:** `kindAanspraakStadspas` = true

Rule 2: income route + jeugdhulp verblijf (instead of woonadres ouder)

### TC_stadspasKind_R4_schuldregeling_jeugdhulp

**Expected:** `kindAanspraakStadspas` = true

Rule 4: schuldregeling route + jeugdhulp verblijf

### TC_stadspasKind_R5_voedselpakket_woonadres

**Expected:** `kindAanspraakStadspas` = true

Rule 5: voedselpakket route + woonadres ouder (income/schuldregeling left at baseline-disqualifying levels so rules 1-4 can't match first)

### TC_stadspasKind_R6_voedselpakket_jeugdhulp

**Expected:** `kindAanspraakStadspas` = true

Rule 6: voedselpakket route + jeugdhulp verblijf

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

### TC_minimakind_R1_kinderbijslag_woonadres_inkomen

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 1: kinderbijslag + woonadres ouder + income/vermogen under threshold

### TC_minimakind_R3_kinderbijslag_woonadres_voedselpakket

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 3: kinderbijslag + woonadres ouder + voedselpakketten

### TC_minimakind_R4_pleegkind_woonadres_inkomen

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 4: pleegkindvergoeding + woonadres ouder + income/vermogen under threshold

### TC_minimakind_R5_pleegkind_woonadres_schuldregeling

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 5: pleegkindvergoeding + woonadres ouder + schuldregeling

### TC_minimakind_R6_pleegkind_woonadres_voedselpakket

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 6: pleegkindvergoeding + woonadres ouder + voedselpakketten

### TC_minimakind_R7_kinderbijslag_jeugdhulp_inkomen

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 7: kinderbijslag + jeugdhulp verblijf + income/vermogen under threshold

### TC_minimakind_R8_kinderbijslag_jeugdhulp_schuldregeling

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 8: kinderbijslag + jeugdhulp verblijf + schuldregeling

### TC_minimakind_R10_pleegkind_jeugdhulp_inkomen

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 10: pleegkindvergoeding + jeugdhulp verblijf + income/vermogen under threshold

### TC_minimakind_R11_pleegkind_jeugdhulp_schuldregeling

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 11: pleegkindvergoeding + jeugdhulp verblijf + schuldregeling

### TC_minimakind_R12_pleegkind_jeugdhulp_voedselpakket

**Expected:** `kindEenBeleidsregelsMinimakind` = true

Rule 12: pleegkindvergoeding + jeugdhulp verblijf + voedselpakketten

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

### TC_scholier_R1_voorschool

**Expected:** `kindEenBeleidsregelMinimakindScholier` = true

Rule 1: kind qualifies for minimabeleid, age 10, ingeschreven op voorschool

### TC_scholier_R4_bbl

**Expected:** `kindEenBeleidsregelMinimakindScholier` = true

Rule 4: kind qualifies for minimabeleid, age 10, ingeschreven op BBL (onbetaalde stage)

---

## `Bepalen aanspraken (DRD root)`

`_bad36e9e-ac9d-4d78-b0be-2f1c58cbf3c5`

### TC_root_no_match

**Expected:** empty result (no matching rule)

Baseline (nothing qualifies for anything) -> empty result set (RULE ORDER has no catch-all rule)

### TC_root_bijzondereBijstand_only

**Expected:** `aanspraken` = 'Aanspraak op bijzondere bijstand'

Only bijzondere bijstand's own rule 1 triggers; all 11 other direct sub-decisions independently disqualified by baseline (npWoonachtig=false, partnerWoonachtig=false, kind is an adult) -> aanspraken = ['Aanspraak op bijzondere bijstand']

### TC_root_stadspasNp_only

**Expected:** `aanspraken` = 'Aanspraak op een stadspas'

Row 'aanspraak op een stadspas' in isolation: income route, no nationaliteit/schuldregeling/voedselpakket overlap with any other root row -> single output

### TC_root_iitNp_coupled

**Expected:** `aanspraken`: 2 matching rows -> 'Aanspraak op een stadspas' | 'Aanspraak op individuele inkomenstoeslag'

Row 'aanspraak op individuele inkomenstoeslag' via the langdurig-laag-inkomen route. VERIFIED LIVE to co-fire 'aanspraak op een stadspas': individuele inkomenstoeslag's langdurig-laag-inkomen route needs npFiscaalGezinsinkomenVorigJaar low, which is the exact same leaf fact stadspas(np)'s own income route checks against — a low income over 3 years structurally implies a low income over 1 year too. Not avoidable while keeping this route true -> expect 2 outputs.

### TC_root_pcVoorziening_only

**Expected:** `aanspraken` = 'Aanspraak op pc-voorziening'

Row 'aanspraak op pc-voorziening': minimabeleid kind (kinderbijslag+schuldregeling) + basisschool + age 10. npWoonachtigGemeenteAangevraagd stays false so kindtegoed/Stadspas-kind can't also fire; kindIngeschrevenVoorschool/BBL (scholier's other triggers) stay unset so reiskostenvergoeding can't fire off the same basisschool flag PC-voorziening itself needs -> single output

### TC_root_meerkosten_only

**Expected:** `aanspraken` = 'Aanspraak op regeling tegemoetkoming meerkosten'

Row 'aanspraak op regeling tegemoetkoming meerkosten': income route. npWoonachtigGemeenteAangevraagd=true is also required by the natuurlijke-persoon Stadspas/individuele-inkomenstoeslag/identiteitskaart rows, but none of _their_ own qualifying conditions are met here -> single output

### TC_root_reiskostenvergoeding_only

**Expected:** `aanspraken` = 'Aanspraak op reiskostenvergoeding kind'

Row 'aanspraak op reiskostenvergoeding kind': minimabeleid + scholier via _voorschool_ specifically (not basisschool/voortgezet, which PC-voorziening's own rules also key off — using voorschool avoids that overlap) + afstand > 9km -> single output

### TC_root_partnerIit_only

**Expected:** `aanspraken` = 'Aanspraak op individuele inkomenstoeslag partner'

Row 'aanspraak op individuele inkomenstoeslag partner': langdurig laag inkomen route. npWoonachtigGemeenteAangevraagd stays false so the natuurlijke persoon's own row can't also fire -> single output

### TC_root_kindtegoed_coupled

**Expected:** `aanspraken`: 4 matching rows -> 'Aanspraak op een stadspas' | 'Aanspraak op individuele inkomenstoeslag' | 'Aanspraak op kindtegoed' | 'Aanspraak op een Stadspas kind'

Row 'aanspraak op kindtegoed': STRUCTURALLY requires 'aanspraak Stadspas van kind' to already be true (kindtegoed's own rule 1 has kindAanspraakStadspas as one of its AND conditions) — real business-rule coupling in the source DMN, not a test-design gap. VERIFIED LIVE to cascade further: the schuldregeling flag used to qualify the kind's own routes is the _same_ leaf fact that also satisfies stadspas(np)'s and individuele-inkomenstoeslag(np)'s own schuldregeling routes (both use npEenSchuldregeling as an alternative qualifying condition) -> expect 4 outputs: stadspas(np), individuele inkomenstoeslag(np), kindtegoed, Stadspas kind.

### TC_root_aanvullendKindtegoed_coupled

**Expected:** `aanspraken`: 5 matching rows -> 'Aanspraak op aanvullend kindtegoed' | 'Aanspraak op een stadspas' | 'Aanspraak op individuele inkomenstoeslag' | 'Aanspraak op kindtegoed' | 'Aanspraak op een Stadspas kind'

Row 'aanspraak op aanvullend kindtegoed': STRUCTURALLY requires kindtegoed=true, which itself requires Stadspas-kind=true, plus the same schuldregeling-cascade as the kindtegoed case above -> expect 5 outputs: aanvullend kindtegoed, stadspas(np), individuele inkomenstoeslag(np), kindtegoed, Stadspas kind.

### TC_root_stadspasKind_coupled

**Expected:** `aanspraken`: 3 matching rows -> 'Aanspraak op een stadspas' | 'Aanspraak op individuele inkomenstoeslag' | 'Aanspraak op een Stadspas kind'

Row 'aanspraak Stadspas van kind': cannot be isolated from 'aanspraak op een stadspas' (natuurlijke persoon) via the schuldregeling route — kind's table requires npWoonachtigGemeenteAangevraagd and one of the same 3 household-level routes (income/schuldregeling/voedselpakket) that alone already satisfy the parent's own Stadspas rule. VERIFIED LIVE to also drag in individuele inkomenstoeslag(np) (same schuldregeling route again) -> expect 3 outputs: stadspas(np), individuele inkomenstoeslag(np), Stadspas kind.

### TC_root_tegemoetkomingIdentiteitskaartNp_coupled

**Expected:** `aanspraken`: 2 matching rows -> 'Aanspraak op een stadspas' | 'Aanspraak op tegemoetkoming identiteitskaart'

Row 'aanspraak op tegemoetkoming identiteitskaart' (natuurlijke persoon): STRUCTURALLY requires 'aanspraak op een stadspas' to also be true. Uses the income route (not schuldregeling) so individuele inkomenstoeslag's langdurig-laag-inkomen check (which needs all 3 years' income low, not just this year's) stays false, keeping the cascade to exactly 2 outputs: stadspas(np), tegemoetkoming identiteitskaart(np).

### TC_root_tegemoetkomingIdentiteitskaartKind_coupled

**Expected:** `aanspraken`: 4 matching rows -> 'Aanspraak op een stadspas' | 'Aanspraak op individuele inkomenstoeslag' | 'Aanspraak op een Stadspas kind' | 'Aanspraak op tegemoetkoming identiteitskaart kind'

Row 'aanspraak op tegemoetkoming identiteitskaart kind': requires Stadspas-kind, which (via the schuldregeling route) also drags in stadspas(np) and individuele inkomenstoeslag(np), same cascade as the Stadspas-kind case above -> expect 4 outputs: stadspas(np), individuele inkomenstoeslag(np), Stadspas kind, tegemoetkoming identiteitskaart kind.

---

## Summary

| Decision                                                                                            | Cases | Kind              |
| --------------------------------------------------------------------------------------------------- | ----- | ----------------- |
| `Beslistabel bepalen aanspraak op bijzondere bijstand`                                              | 5     | leaf              |
| `Bepalen van toepassing zijnde loongrens vorig jaar voor volwassenen`                               | 3     | leaf              |
| `Beslistabel bepalen schuldregeling`                                                                | 4     | leaf              |
| `Beslistabel bepalen natuurlijke persoon is meerderjarig`                                           | 2     | leaf              |
| `Bepalen van toepassing zijnde vermogensgrens`                                                      | 3     | leaf              |
| `Bepaal pensioengerechtigde leeftijd`                                                               | 2     | leaf              |
| `Bepalen van toepassing zijnde loongrens vorig jaar voor kinderen`                                  | 3     | leaf              |
| `Beslistabel bepalen kind is minderjarig`                                                           | 2     | leaf              |
| `Bepalen van toepassing zijnde loongrens drie jaar geleden`                                         | 3     | leaf              |
| `Bepalen van toepassing zijnde loongrens twee jaar geleden`                                         | 3     | leaf              |
| `Beslistabel bepalen langdurig laag inkomen`                                                        | 2     | leaf              |
| `Beslistabel bepalen aanspraak op individuele inkomenstoeslag`                                      | 5     | composite         |
| `Beslistabel bepalen aanspraak op individuele inkomenstoeslag partner`                              | 3     | composite         |
| `Beslistabel bepalen aanspraak op een stadspas`                                                     | 4     | composite         |
| `Beslistabel bepalen aanspraak op kindtegoed`                                                       | 2     | composite         |
| `Beslistabel bepalen aanspraak Stadspas van kind van natuurlijke persoon`                           | 7     | composite         |
| `Beslistabel bepalen aanspraak op PC-voorziening`                                                   | 3     | composite         |
| `Beslistabel bepalen aanspraak op regeling tegemoetkoming meerkosten`                               | 3     | composite         |
| `Beslistabel bepalen aanspraak op reiskostenvergoeding kind`                                        | 2     | composite         |
| `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart`                                  | 3     | composite         |
| `Beslistabel bepalen aanspraak op tegemoetkoming identiteitskaart voor kind van natuurlijk persoon` | 3     | composite         |
| `Beslistabel aanspaak op aanvullend kindtegoed`                                                     | 2     | composite         |
| `Beslistabel bepalen of een kind een minimabeleid kind is`                                          | 13    | composite         |
| `Beslistabel bepalen of een kind een scholier is`                                                   | 5     | composite         |
| `Bepalen aanspraken (DRD root)`                                                                     | 13    | root (RULE ORDER) |

**Total: 100 cases across 25 of the DRD's 25 decisions — full rule coverage (all 99 rules, one dedicated case each). "Kind" distinguishes self-contained leaf decisions from composite decisions that chain through `requiredDecision`, and the RULE-ORDER root — not coverage depth, which is uniform across all three.**
