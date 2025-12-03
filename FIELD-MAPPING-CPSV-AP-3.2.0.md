# Field-to-Property Mapping: TTL Editor ↔ CPSV-AP 3.2.0

**Purpose:** Map current UI fields to CPSV-AP 3.2.0 properties and identify gaps

---

## Table of Contents

1. [Service Tab](#1-service-tab)
2. [Organization Tab](#2-organization-tab)
3. [Legal Tab](#3-legal-tab)
4. [Rules Tab](#4-rules-tab)
5. [Parameters Tab](#5-parameters-tab)
6. [Missing CPSV-AP Classes (New Tabs Needed)](#6-missing-cpsv-ap-classes-new-tabs-needed)
7. [Summary: Changes Required](#7-summary-changes-required)

---

## Legend

| Symbol | Meaning                          |
| ------ | -------------------------------- |
| ✅     | Implemented correctly            |
| ⚠️     | Implemented but needs adjustment |
| ❌     | Missing - needs to be added      |
| 🔄     | Label change recommended         |

---

## 1. Service Tab

**CPSV-AP Class:** `cpsv:PublicService`

### Current Fields

| UI Field Label        | State Property         | Current TTL Output | CPSV-AP 3.2.0 Property | Status | Notes                                                 |
| --------------------- | ---------------------- | ------------------ | ---------------------- | ------ | ----------------------------------------------------- |
| Service Identifier \* | `service.identifier`   | URI construction   | `dct:identifier`       | ⚠️     | Should also output explicit `dct:identifier` property |
| Service Name \*       | `service.name`         | `dct:title`        | `dct:title`            | ✅     | Correct                                               |
| Description           | `service.description`  | `dct:description`  | `dct:description`      | ✅     | Correct                                               |
| Thematic Area         | `service.thematicArea` | `cv:thematicArea`  | `cv:thematicArea`      | ✅     | Correct                                               |
| Sector                | `service.sector`       | `cv:sector`        | `cv:sector`            | ⚠️     | Should be URI, currently accepts text                 |
| Keyword               | `service.keywords`     | `dcat:keyword`     | `dcat:keyword`         | ✅     | Correct                                               |
| Language              | `service.language`     | `dct:language`     | `dct:language`         | ⚠️     | Should use LinguisticSystem URI                       |

### Missing CPSV-AP 3.2.0 Fields for PublicService

| CPSV-AP Property    | Cardinality | Priority | Suggested UI Label  | Notes                           |
| ------------------- | ----------- | -------- | ------------------- | ------------------------------- |
| `dct:type`          | 0..\*       | Medium   | Service Type        | Code from controlled vocabulary |
| `cv:processingTime` | 0..1        | Medium   | Processing Time     | ISO 8601 Duration               |
| `cv:spatial`        | 0..\*       | Low      | Geographic Coverage | Location URI                    |
| `adms:status`       | 0..1        | Medium   | Status              | Active/Inactive/etc.            |
| `cv:isGroupedBy`    | 0..\*       | Low      | Grouped By Event    | Link to Event                   |
| `cv:isClassifiedBy` | 0..\*       | Low      | Classification      | Link to skos:Concept            |

---

## 2. Organization Tab

**CPSV-AP Class:** `cv:PublicOrganisation` (currently outputs `org:Organization`)

### Current Fields

| UI Field Label          | State Property            | Current TTL Output | CPSV-AP 3.2.0 Property | Status | Notes                                   |
| ----------------------- | ------------------------- | ------------------ | ---------------------- | ------ | --------------------------------------- |
| Organization Identifier | `organization.identifier` | URI construction   | `dct:identifier`       | ⚠️     | Should output explicit `dct:identifier` |
| Organization Name       | `organization.name`       | `skos:prefLabel`   | `skos:prefLabel`       | ✅     | Correct                                 |
| Homepage URL            | `organization.homepage`   | `foaf:homepage`    | `foaf:homepage`        | ✅     | Correct (via foaf:Agent)                |

### Class Type Issue

| Current            | Should Be               | Status                                    |
| ------------------ | ----------------------- | ----------------------------------------- |
| `org:Organization` | `cv:PublicOrganisation` | ⚠️ Change required for CPSV-AP compliance |

### Missing CPSV-AP 3.2.0 Fields for PublicOrganisation

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label         | Notes                        |
| ---------------- | ----------- | -------- | -------------------------- | ---------------------------- |
| `cv:spatial`     | 1..\*       | **HIGH** | Geographic Jurisdiction \* | **MANDATORY** - Location URI |
| `locn:address`   | 0..\*       | Medium   | Address                    | Link to locn:Address         |

---

## 3. Legal Tab

**CPSV-AP Class:** `eli:LegalResource`

### Current Fields

| UI Field Label | State Property              | Current TTL Output                          | CPSV-AP 3.2.0 Property | Status | Notes                                   |
| -------------- | --------------------------- | ------------------------------------------- | ---------------------- | ------ | --------------------------------------- |
| BWB ID         | `legalResource.bwbId`       | URI construction + `dct:identifier` implied | `dct:identifier`       | ⚠️     | Should output explicit `dct:identifier` |
| Version Date   | `legalResource.version`     | `eli:is_realized_by`                        | `eli:is_realized_by`   | ✅     | Correct                                 |
| Legal Title    | `legalResource.title`       | `dct:title`                                 | `dct:title`            | ✅     | Correct                                 |
| Description    | `legalResource.description` | `dct:description`                           | `dct:description`      | ✅     | Correct                                 |

### Missing CPSV-AP 3.2.0 Fields for LegalResource

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label      | Notes                           |
| ---------------- | ----------- | -------- | ----------------------- | ------------------------------- |
| `eli:related`    | 0..\*       | Low      | Related Legal Resources | Link to other eli:LegalResource |

### Relationship Issue

| Current Relationship           | Should Be             | Status                      |
| ------------------------------ | --------------------- | --------------------------- |
| `cpsv:follows` (Service→Legal) | `cv:hasLegalResource` | ⚠️ Change for CPSV-AP 3.2.0 |

---

## 4. Rules Tab

**CPSV-AP Class:** `cpsv:Rule` (currently outputs `ronl:TemporalRule`)

### Current Fields

| UI Field Label     | State Property         | Current TTL Output     | CPSV-AP 3.2.0 Property | Status | Notes                          |
| ------------------ | ---------------------- | ---------------------- | ---------------------- | ------ | ------------------------------ |
| Rule URI           | `rule.uri`             | URI construction       | -                      | ✅     | URI identifier                 |
| Extends (Rule URI) | `rule.extends`         | `ronl:extends`         | -                      | ⚠️     | RONL extension, not in CPSV-AP |
| Valid From         | `rule.validFrom`       | `ronl:validFrom`       | -                      | ⚠️     | RONL extension                 |
| Valid Until        | `rule.validUntil`      | `ronl:validUntil`      | -                      | ⚠️     | RONL extension                 |
| Confidence Level   | `rule.confidenceLevel` | `ronl:confidenceLevel` | -                      | ⚠️     | RONL extension                 |
| Description        | `rule.description`     | `dct:description`      | `dct:description`      | ✅     | Correct                        |

### Class Type Consideration

The current `ronl:TemporalRule` is a Dutch extension. For CPSV-AP compliance:

| Option          | Approach                                        |
| --------------- | ----------------------------------------------- |
| A (Recommended) | Output both `cpsv:Rule` AND `ronl:TemporalRule` |
| B               | Add toggle to choose base type                  |

### Missing CPSV-AP 3.2.0 Fields for cpsv:Rule

| CPSV-AP Property       | Cardinality | Priority | Suggested UI Label        | Notes                     |
| ---------------------- | ----------- | -------- | ------------------------- | ------------------------- |
| `dct:identifier`       | 1..\*       | **HIGH** | Rule Identifier \*        | **MANDATORY**             |
| `dct:title`            | 1..\*       | **HIGH** | Rule Title \*             | **MANDATORY**             |
| `dct:language`         | 0..\*       | Medium   | Language                  | LinguisticSystem          |
| `dct:type`             | 0..1        | Medium   | Rule Type                 | Code value                |
| `eli:implements`       | 0..\*       | Medium   | Implements Legal Resource | Link to eli:LegalResource |
| `eli:establishedUnder` | 0..\*       | Low      | Established Under         | Link to eli:LegalResource |

---

## 5. Parameters Tab

**Current Class:** `ronl:ParameterWaarde` (Dutch extension, not in CPSV-AP)

### Current Fields

| UI Field Label                 | State Property      | Current TTL Output | Notes |
| ------------------------------ | ------------------- | ------------------ | ----- |
| Notation (Machine-readable) \* | `param.notation`    | `skos:notation`    | Good  |
| Label (Human-readable) \*      | `param.label`       | `skos:prefLabel`   | Good  |
| Value \*                       | `param.value`       | `schema:value`     | Good  |
| Unit                           | `param.unit`        | `schema:unitCode`  | Good  |
| Description                    | `param.description` | `dct:description`  | Good  |
| Valid From                     | `param.validFrom`   | `ronl:validFrom`   | Good  |
| Valid Until                    | `param.validUntil`  | `ronl:validUntil`  | Good  |

### Note

Parameters (`ronl:ParameterWaarde`) are a RONL-specific extension not part of CPSV-AP. This is fine - CPSV-AP is extensible. No changes needed here.

---

## 6. Missing CPSV-AP Classes (New Tabs/Sections Needed)

### 6.1 Cost (cv:Cost) - Currently in State but No UI Tab

**Priority:** HIGH - Already have state, just need UI

| CPSV-AP Property  | Cardinality | Suggested UI Label | Current State      | Notes         |
| ----------------- | ----------- | ------------------ | ------------------ | ------------- |
| `dct:identifier`  | 1..\*       | Cost Identifier \* | `cost.identifier`  | **MANDATORY** |
| `cv:value`        | 0..1        | Amount             | `cost.value`       | Decimal value |
| `cv:currency`     | 0..1        | Currency           | `cost.currency`    | EUR, etc.     |
| `dct:description` | 0..\*       | Description        | `cost.description` | Text          |

**Action:** Add Cost section to UI (fields exist in state but not rendered)

---

### 6.2 Output (cv:Output) - Currently in State but No UI Tab

**Priority:** HIGH - Already have state, just need UI

| CPSV-AP Property  | Cardinality | Suggested UI Label   | Current State        | Notes            |
| ----------------- | ----------- | -------------------- | -------------------- | ---------------- |
| `dct:identifier`  | 1..\*       | Output Identifier \* | `output.identifier`  | **MANDATORY**    |
| `dct:title`       | 1..\*       | Output Name \*       | `output.name`        | **MANDATORY**    |
| `dct:description` | 0..\*       | Description          | `output.description` | Text             |
| `dct:type`        | 0..1        | Output Type          | `output.type`        | Code/URI         |
| `dct:language`    | 0..\*       | Language             | -                    | Missing in state |

**Action:** Add Output section to UI (most fields exist in state)

---

### 6.3 Channel (cv:Channel) - NEW

**Priority:** MEDIUM

| CPSV-AP Property    | Cardinality | Suggested UI Label    | Notes                 |
| ------------------- | ----------- | --------------------- | --------------------- |
| `dct:identifier`    | 1..\*       | Channel Identifier \* | **MANDATORY**         |
| `dct:description`   | 0..\*       | Description           | Text                  |
| `cv:processingTime` | 0..1        | Processing Time       | Duration              |
| `dct:type`          | 0..1        | Channel Type          | Online/Phone/InPerson |

---

### 6.4 ContactPoint (cv:ContactPoint) - NEW

**Priority:** MEDIUM

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes        |
| ---------------- | ----------- | ------------------ | ------------ |
| `cv:contactPage` | 0..\*       | Contact Page URL   | Document URL |
| `cv:hasEmail`    | 0..\*       | Email Address      | Email        |
| `cv:telephone`   | 0..\*       | Phone Number       | Phone        |

---

### 6.5 Requirement (cv:Requirement) - NEW

**Priority:** MEDIUM-LOW

| CPSV-AP Property  | Cardinality | Suggested UI Label  | Notes         |
| ----------------- | ----------- | ------------------- | ------------- |
| `dct:identifier`  | 1..\*       | Requirement ID \*   | **MANDATORY** |
| `dct:title`       | 1..\*       | Requirement Name \* | **MANDATORY** |
| `dct:description` | 1..\*       | Description \*      | **MANDATORY** |
| `dct:type`        | 0..\*       | Requirement Type    | Code          |

---

### 6.6 Evidence (cv:Evidence) - NEW

**Priority:** LOW

| CPSV-AP Property  | Cardinality | Suggested UI Label | Notes         |
| ----------------- | ----------- | ------------------ | ------------- |
| `dct:identifier`  | 1..\*       | Evidence ID \*     | **MANDATORY** |
| `dct:title`       | 1..\*       | Evidence Name \*   | **MANDATORY** |
| `dct:description` | 0..\*       | Description        | Text          |
| `dct:type`        | 0..1        | Evidence Type      | Code          |

---

### 6.7 Event (cv:Event, cv:BusinessEvent, cv:LifeEvent) - NEW

**Priority:** LOW

| CPSV-AP Property  | Cardinality | Suggested UI Label | Notes                   |
| ----------------- | ----------- | ------------------ | ----------------------- |
| `dct:identifier`  | 1..\*       | Event ID \*        | **MANDATORY**           |
| `dct:title`       | 1..\*       | Event Name \*      | **MANDATORY**           |
| `dct:description` | 0..\*       | Description        | Text                    |
| `dct:type`        | 0..\*       | Event Type         | BusinessEvent/LifeEvent |

---

### 6.8 Address (locn:Address) - NEW

**Priority:** LOW (sub-entity of Organization)

| CPSV-AP Property         | Cardinality | Suggested UI Label | Notes       |
| ------------------------ | ----------- | ------------------ | ----------- |
| `locn:thoroughfare`      | 0..\*       | Street             | Street name |
| `locn:locatorDesignator` | 0..\*       | House Number       | Number      |
| `locn:postCode`          | 0..\*       | Postal Code        | Postcode    |
| `locn:postName`          | 0..\*       | City               | City name   |
| `locn:adminUnitL1`       | 0..\*       | Country            | Country     |
| `locn:adminUnitL2`       | 0..\*       | Province/Region    | Region      |

---

## 7. Summary: Changes Required

### 7.1 Immediate Priority (for Minimal CPSV-AP 3.2.0 Compliance)

| #   | Change                                              | Type       | Effort |
| --- | --------------------------------------------------- | ---------- | ------ |
| 1   | Change `org:Organization` → `cv:PublicOrganisation` | TTL output | Low    |
| 2   | Add `cv:spatial` field to Organization tab          | UI + State | Low    |
| 3   | Add `dct:identifier` property outputs (explicit)    | TTL output | Low    |
| 4   | Change `cpsv:follows` → `cv:hasLegalResource`       | TTL output | Low    |
| 5   | Add `dct:identifier` and `dct:title` to Rules       | UI + State | Medium |
| 6   | Add Cost section to UI                              | UI only    | Low    |
| 7   | Add Output section to UI                            | UI only    | Low    |
| 8   | Fix Language to use LinguisticSystem URIs           | TTL output | Low    |
| 9   | Fix Sector to accept/output URIs                    | TTL output | Low    |

### 7.2 Extended Compliance (Future)

| #   | Change                               | Type             | Effort |
| --- | ------------------------------------ | ---------------- | ------ |
| 10  | Add Channel class support            | UI + State + TTL | Medium |
| 11  | Add ContactPoint class support       | UI + State + TTL | Medium |
| 12  | Add Service Type dropdown            | UI + State + TTL | Low    |
| 13  | Add Processing Time field            | UI + State + TTL | Low    |
| 14  | Add Status field                     | UI + State + TTL | Low    |
| 15  | Add Requirement class support        | UI + State + TTL | Medium |
| 16  | Add Evidence class support           | UI + State + TTL | Medium |
| 17  | Add Event class support              | UI + State + TTL | Medium |
| 18  | Add Address sub-form to Organization | UI + State + TTL | Medium |

### 7.3 Label Standardization Recommendations

| Current Label      | Recommended Label | Reason                   |
| ------------------ | ----------------- | ------------------------ |
| Service Identifier | Identifier        | Consistent with CPSV-AP  |
| Service Name       | Title             | Matches `dct:title`      |
| BWB ID             | Legal Resource ID | More generic             |
| Legal Title        | Title             | Consistent               |
| Rule URI           | Identifier        | Consistent               |
| Extends (Rule URI) | Extends Rule      | Clearer                  |
| Organization Name  | Preferred Label   | Matches `skos:prefLabel` |

---

## 8. Recommended Implementation Order

### Phase 1: Minimal CPSV-AP Compliance (v1.3.0)

1. ✏️ Fix class types (`cv:PublicOrganisation`)
2. ✏️ Fix relationship (`cv:hasLegalResource`)
3. ✏️ Add explicit `dct:identifier` outputs
4. ➕ Add `cv:spatial` to Organization
5. ➕ Add Rule `dct:identifier` and `dct:title`
6. 🎨 Add Cost section UI
7. 🎨 Add Output section UI
8. ✏️ Fix Language to use URIs
9. ✏️ Fix Sector to use URIs

### Phase 2: Extended Compliance (v1.4.0)

1. ➕ Add Channel support
2. ➕ Add ContactPoint support
3. ➕ Add Service Type, Processing Time, Status

### Phase 3: Full Compliance (v1.5.0)

1. ➕ Add Requirement support
2. ➕ Add Evidence support
3. ➕ Add Event support
4. ➕ Add Address support

---

_Field Mapping Document v1.0_
_Created: December 2025_
_For TTL Editor CPSV-AP 3.2.0 Compliance_
