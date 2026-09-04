# Field Mapping: CPSV-AP 3.2.0

This page maps each UI field in the editor to its corresponding RDF property and CPSV-AP 3.2.0 compliance status.

**Legend:** ✅ Implemented and compliant · 🎯 Phase 1 (v1.4.0) · ⭐ New in v1.5.0/v1.9.0 · 📋 Phase 2 planned · ℹ️ RONL/CPRMV extension

The **SHACL constraint** column references the shape that validates each field during pre-publish validation (`req` = minCount ≥ 1, `opt` = no minCount; `(new)` = shape added in LDE v1.9.8).

---

## Service tab — `cpsv:PublicService`

| UI field           | State property         | TTL property                        | CPSV-AP 3.2.0     | Status        | SHACL constraint                 |
| ------------------ | ---------------------- | ----------------------------------- | ----------------- | ------------- | -------------------------------- |
| Unique identifier  | `service.identifier`   | `dct:identifier`                    | `dct:identifier`  | ⭐ Mandatory  | `PublicServiceShape` · req [1,1] |
| Official name      | `service.name`         | `dct:title`                         | `dct:title`       | ✅            | `PublicServiceShape` · req [1,n] |
| Description        | `service.description`  | `dct:description`                   | `dct:description` | ✅            | `PublicServiceShape` · req [1,n] |
| Thematic area      | `service.thematicArea` | `cv:thematicArea`                   | `cv:thematicArea` | ✅            | `PublicServiceShape` · opt       |
| Government level   | `service.sector`       | `cv:sector`                         | `cv:sector`       | 🎯 Mandatory  | `PublicServiceShape` · opt       |
| Keywords           | `service.keywords`     | `dcat:keyword`                      | `dct:subject`     | ✅            | `PublicServiceShape` · opt       |
| Language           | `service.language`     | `dct:language`                      | `dct:language`    | 🎯 URI format | `PublicServiceShape` · opt       |
| Cost amount        | `cost.amount`          | `cv:hasCost / schema:price`         | `cv:hasCost`      | 🎯            | `CostShape` · opt ¹              |
| Cost currency      | `cost.currency`        | `cv:hasCost / schema:priceCurrency` | `cv:hasCost`      | 🎯            | `CostShape` · opt ¹              |
| Output title       | `output.title`         | `cv:hasOutput / dct:title`          | `cv:hasOutput`    | 🎯            | `OutputShape` · req [1,n]        |
| Output description | `output.description`   | `cv:hasOutput / dct:description`    | `cv:hasOutput`    | 🎯            | `OutputShape` · opt              |

> ¹ `CostShape` validates `m8g:hasValue` (amount) and `m8g:currency` (currency) — the editor emits `schema:price` / `schema:priceCurrency` instead, so these fields pass SHACL structurally but the cost property names are not validated.

---

## Organisation tab — `cv:PublicOrganisation`

| UI field                | State property            | TTL property                | CPSV-AP 3.2.0    | Status                                   | SHACL constraint                      |
| ----------------------- | ------------------------- | --------------------------- | ---------------- | ---------------------------------------- | ------------------------------------- |
| Organisation identifier | `organization.identifier` | `dct:identifier`            | `dct:identifier` | ⭐                                       | —                                     |
| Organisation name       | `organization.name`       | `skos:prefLabel`            | `skos:prefLabel` | ✅                                       | `PublicOrganisationShape` · req [1,n] |
| Geographic jurisdiction | `organization.spatial`    | `dct:spatial`               | `dct:spatial`    | 🎯 Mandatory (v1.10.0; was `cv:spatial`) | `PublicOrganisationShape` · req [1,n] |
| Homepage                | `organization.homepage`   | `foaf:homepage`             | `foaf:homepage`  | ✅                                       | —                                     |
| Logo                    | `organization.logo`       | `foaf:logo`, `schema:image` | —                | ℹ️                                       | —                                     |

---

## Legal tab — `eli:LegalResource`

| UI field    | State property              | TTL property      | CPSV-AP 3.2.0         | Status | SHACL constraint |
| ----------- | --------------------------- | ----------------- | --------------------- | ------ | ---------------- |
| BWB ID      | `legalResource.bwbId`       | URI construction  | `cv:hasLegalResource` | ✅     | — ²              |
| Version     | `legalResource.version`     | `eli:version`     | `eli:version`         | ✅     | — ²              |
| Title       | `legalResource.title`       | `dct:title`       | `dct:title`           | ✅     | — ²              |
| Description | `legalResource.description` | `dct:description` | `dct:description`     | ✅     | — ²              |

> ² `LegalResourceShape` only constrains `eli:related` (the link between two LegalResource instances). Individual LegalResource properties (`eli:version`, `dct:title`, etc.) are not subject to SHACL validation. The link from the service to the LegalResource is validated via `PublicServiceShape` → `m8g:hasLegalResource`.

---

## Rules tab — `cpsv:Rule, cprmv:TemporalRule`

| UI field           | State property         | TTL property                            | CPSV-AP 3.2.0     | Status                                       | SHACL constraint                             |
| ------------------ | ---------------------- | --------------------------------------- | ----------------- | -------------------------------------------- | -------------------------------------------- |
| Rule identifier    | `rule.identifier`      | `dct:identifier`                        | `dct:identifier`  | 🎯 Mandatory                                 | `RuleShape` · req [1,1]                      |
| Rule title         | `rule.title`           | `dct:title`                             | `dct:title`       | 🎯 Mandatory                                 | `RuleShape` · req [1,n]                      |
| (auto) description | `rule.description`     | `dct:description`                       | `dct:description` | 🎯 Mandatory (falls back to title)           | `RuleShape` · req [1,n]                      |
| Rule URI           | `rule.uri`             | Subject URI                             | —                 | ℹ️                                           | —                                            |
| (auto) implements  | —                      | `cpsv:implements` → `eli:LegalResource` | `cpsv:implements` | ℹ️ Emitted only when a legal resource exists | `RuleShape` · opt                            |
| Extends            | `rule.extends`         | `cprmv:isBasedOn`                       | —                 | ℹ️ v1.10.0 (was `ronl:extends`)              | `TemporalRuleShape` · opt (new)              |
| Valid from         | `rule.validFrom`       | `cprmv:validFrom`                       | —                 | ℹ️ v2.0.0 (was `ronl:validFrom`)             | `TemporalRuleShape` · opt `xsd:date` (new)   |
| Valid until        | `rule.validUntil`      | `cprmv:validUntil`                      | —                 | ℹ️ v2.0.0 (was `ronl:validUntil`)            | `TemporalRuleShape` · opt `xsd:date` (new)   |
| Confidence level   | `rule.confidenceLevel` | `cprmv:confidenceLevel`                 | —                 | ℹ️ v2.0.0 (was `ronl:confidenceLevel`)       | `TemporalRuleShape` · opt `xsd:string` (new) |

---

## Parameters tab — `cprmv:ParameterWaarde`

| UI field    | State property          | TTL property       | Notes                          | SHACL constraint                                          |
| ----------- | ----------------------- | ------------------ | ------------------------------ | --------------------------------------------------------- |
| Notation    | `parameter.notation`    | `skos:notation`    | Machine-readable ID            | `ParameterWaardeShape` · req [1,1] `xsd:string` (new)     |
| Label       | `parameter.label`       | `skos:prefLabel`   | Human-readable name            | `ParameterWaardeShape` · req [1,n] `rdf:langString` (new) |
| Value       | `parameter.value`       | `schema:value`     |                                | `ParameterWaardeShape` · opt `xsd:decimal` (new)          |
| Unit        | `parameter.unit`        | `schema:unitCode`  |                                | `ParameterWaardeShape` · opt `xsd:string` (new)           |
| Description | `parameter.description` | `dct:description`  | Not exposed in UI              | `ParameterWaardeShape` · opt `rdf:langString` (new)       |
| Valid from  | `parameter.validFrom`   | `cprmv:validFrom`  | v2.0.0 (was `ronl:validFrom`)  | `ParameterWaardeShape` · opt `xsd:date` (new)             |
| Valid until | `parameter.validUntil`  | `cprmv:validUntil` | v2.0.0 (was `ronl:validUntil`) | `ParameterWaardeShape` · opt `xsd:date` (new)             |

> `ParameterWaardeShape` is a new shape added in LDE v1.9.8. The shape makes `skos:notation` and `skos:prefLabel` mandatory; the client-side validator in the CPSV Editor was updated in the same release to enforce both fields unconditionally.

---

## CPRMV tab — `cprmv:Rule`

| UI field     | State property         | TTL property               | Status                                                  | SHACL constraint              |
| ------------ | ---------------------- | -------------------------- | ------------------------------------------------------- | ----------------------------- |
| Rule ID      | `cprmvRule.ruleId`     | `cprmv:id`                 | ✅ Mandatory (RuleShape)                                | `cprmv:RuleShape` · req [1,n] |
| Ruleset ID   | `cprmvRule.rulesetId`  | `cprmv:rulesetId`          | ✅ Mandatory                                            | —                             |
| Definition   | `cprmvRule.definition` | `cprmv:definition` (`@nl`) | ✅ Mandatory                                            | `cprmv:RuleShape` · opt       |
| Situation    | `cprmvRule.situatie`   | `cprmv:situatie` (`@nl`)   | ✅ Mandatory                                            | —                             |
| Norm         | `cprmvRule.norm`       | `cprmv:norm`               | ✅ Mandatory                                            | —                             |
| Rule ID path | `cprmvRule.ruleIdPath` | `cprmv:ruleIdPath`         | ✅ Mandatory                                            | —                             |
| Implements   | auto-linked            | `cprmv:implements`         | ⭐ v1.9.0 auto-linked (uses the rule's own `rulesetId`) | —                             |

Each unique `rulesetId` also produces a `cprmv:RuleSet` (with a `cprmv:RuleMethod`)
that lists its rules via an ordered `cprmv:hasPart` — see
[CPRMV RuleSet Generation](../developer/cprmv-dataset-generation.md).

---

## DMN tab — `cprmv:DecisionModel`

| UI field         | State property         | TTL property                             | Notes                                                 | SHACL constraint |
| ---------------- | ---------------------- | ---------------------------------------- | ----------------------------------------------------- | ---------------- |
| DMN filename     | `dmnData.fileName`     | `dct:title`                              | `dct:source` is a placeholder file URI                | —                |
| Decision key     | `dmnData.decisionKey`  | `dct:identifier`                         |                                                       | —                |
| Deployment ID    | `dmnData.deploymentId` | `cprmv:deploymentId`                     |                                                       | —                |
| Deployed at      | `dmnData.deployedAt`   | `cprmv:deployedAt` (`xsd:dateTime`)      |                                                       | —                |
| API endpoint     | `dmnData.apiEndpoint`  | `cprmv:implementedBy`                    |                                                       | —                |
| Input variables  | extracted              | `cpsv:Input` entities                    | One per `<inputData>`                                 | —                |
| Output variables | extracted              | `cpsv:Output` entities                   | One per output (v1.5.2+)                              | —                |
| Decision rules   | extracted              | `cpsv:Rule, cprmv:DecisionRule` entities | With `dct:title`/`dct:description`, `cprmv:isBasedOn` | —                |

> `DecisionModelShape` only constrains `cprmv:hasAnalysis`. No SHACL constraints exist for DMN-specific properties.

---

## Future phases

**Phase 2 (planned):**

- `cv:Channel` — service delivery channel
- `cv:ContactPoint` — contact information
- `cv:Criterion` — eligibility criteria

**Phase 3 (planned):**

- `cv:Requirement` — prerequisite requirements
- `cv:Evidence` — supporting evidence
- `cv:Event` — life events triggering the service
- `cpov:Participation` — participation information
