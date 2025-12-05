# Field-to-Property Mapping: Core Public Service Editor ↔ CPSV-AP 3.2.0

**Version:** 2.0 (Phase 1 Complete)  
**Editor Version:** 1.4.0  
**Date:** December 2025  
**Status:** ✅ Minimal CPSV-AP 3.2.0 Compliance Achieved

---

## Table of Contents

1. [Service Tab](#1-service-tab)
2. [Organization Tab](#2-organization-tab)
3. [Legal Tab](#3-legal-tab)
4. [Rules Tab](#4-rules-tab)
5. [Parameters Tab](#5-parameters-tab)
6. [Cost & Output Sections](#6-cost--output-sections)
7. [CPRMV Tab](#7-cprmv-tab)
8. [Future CPSV-AP Classes](#8-future-cpsv-ap-classes)
9. [Implementation Summary](#9-implementation-summary)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and compliant |
| 🎯 | Phase 1 completed (v1.4.0) |
| 📋 | Phase 2 planned |
| 🔮 | Phase 3 planned |
| ℹ️ | Extension (RONL/CPRMV) |

---

## 1. Service Tab

**CPSV-AP Class:** `cpsv:PublicService`

### Current Fields (v1.4.0)

| UI Field Label | State Property | TTL Output | CPSV-AP 3.2.0 Property | Status | Notes |
|----------------|----------------|------------|------------------------|--------|-------|
| Unique identifier for this service * | `service.identifier` | `dct:identifier` | `dct:identifier` | 🎯 | Explicit property added |
| Official name of the service * | `service.name` | `dct:title` | `dct:title` | ✅ | Correct |
| Detailed description of the service | `service.description` | `dct:description` | `dct:description` | ✅ | Correct |
| URI for thematic classification | `service.thematicArea` | `cv:thematicArea` | `cv:thematicArea` | ✅ | Correct |
| Government level providing this service | `service.sector` | `cv:sector` | `cv:sector` | 🎯 | Now uses URI dropdown + custom |
| Comma-separated keywords | `service.keywords` | `dcat:keyword` | `dcat:keyword` | ✅ | Correct |
| Language of the service | `service.language` | `dct:language` | `dct:language` | 🎯 | Now outputs LinguisticSystem URI |

### Service Relationships

| Relationship | Property | Status | Notes |
|--------------|----------|--------|-------|
| Service → Organization | `cv:hasCompetentAuthority` | ✅ | Links to cv:PublicOrganisation |
| Service → Legal Resource | `cv:hasLegalResource` | 🎯 | Changed from `cpsv:follows` |
| Service → Cost | `cv:hasCost` | 🎯 | Links to cv:Cost (Phase 1) |
| Service → Output | `cpsv:produces` | 🎯 | Links to cv:Output (Phase 1) |

### Missing CPSV-AP 3.2.0 Fields (Phase 2+)

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label | Phase |
|------------------|-------------|----------|-------------------|-------|
| `dct:type` | 0..* | Medium | Service Type | Phase 2 |
| `cv:processingTime` | 0..1 | Medium | Processing Time | Phase 2 |
| `cv:spatial` | 0..* | Low | Geographic Coverage | Phase 2 |
| `adms:status` | 0..1 | Medium | Status | Phase 2 |
| `cv:hasChannel` | 0..* | Medium | Service Channels | Phase 2 |
| `cv:hasContactPoint` | 0..* | Medium | Contact Points | Phase 2 |
| `cv:isGroupedBy` | 0..* | Low | Grouped By Event | Phase 3 |
| `cv:isClassifiedBy` | 0..* | Low | Classification | Phase 3 |

---

## 2. Organization Tab

**CPSV-AP Class:** `cv:PublicOrganisation` 🎯

### Current Fields (v1.4.0)

| UI Field Label | State Property | TTL Output | CPSV-AP 3.2.0 Property | Status | Notes |
|----------------|----------------|------------|------------------------|--------|-------|
| Organization URI or identifier | `organization.identifier` | `dct:identifier` | `dct:identifier` | 🎯 | Explicit property added |
| Preferred name of the organization * | `organization.name` | `skos:prefLabel` | `skos:prefLabel` | ✅ | Correct |
| Homepage URL of the organization | `organization.homepage` | `foaf:homepage` | `foaf:homepage` | ✅ | Correct (via foaf:Agent) |
| Geographic Jurisdiction * | `organization.spatial` | `cv:spatial` | `cv:spatial` | 🎯 | **MANDATORY** - Phase 1 added |

### Class Type Change (Phase 1 ✅)

| Before (v1.3.0) | After (v1.4.0) | Status |
|-----------------|----------------|--------|
| `org:Organization` | `cv:PublicOrganisation` | 🎯 CPSV-AP 3.2.0 compliant |

### Missing CPSV-AP 3.2.0 Fields (Phase 3)

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label | Phase |
|------------------|-------------|----------|-------------------|-------|
| `locn:address` | 0..* | Medium | Address | Phase 3 |

---

## 3. Legal Tab

**CPSV-AP Class:** `eli:LegalResource`

### Current Fields (v1.4.0)

| UI Field Label | State Property | TTL Output | CPSV-AP 3.2.0 Property | Status | Notes |
|----------------|----------------|------------|------------------------|--------|-------|
| Dutch legal document identifier or URI | `legalResource.bwbId` | `dct:identifier` | `dct:identifier` | 🎯 | Explicit property added |
| Version or consolidation date | `legalResource.version` | `eli:is_realized_by` | `eli:is_realized_by` | ✅ | Correct |
| Official title of the legal document | `legalResource.title` | `dct:title` | `dct:title` | ✅ | Correct |
| Description of the legal resource | `legalResource.description` | `dct:description` | `dct:description` | ✅ | Correct |

### Relationship Change (Phase 1 ✅)

| Before (v1.3.0) | After (v1.4.0) | Status |
|-----------------|----------------|--------|
| `cpsv:follows` | `cv:hasLegalResource` | 🎯 CPSV-AP 3.2.0 compliant |

### Missing CPSV-AP 3.2.0 Fields (Phase 3)

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label | Phase |
|------------------|-------------|----------|-------------------|-------|
| `eli:related` | 0..* | Low | Related Legal Resources | Phase 3 |

---

## 4. Rules Tab

**CPSV-AP Classes:** `cpsv:Rule, ronl:TemporalRule` 🎯

### Current Fields (v1.4.0)

| UI Field Label | State Property | TTL Output | CPSV-AP 3.2.0 Property | Status | Notes |
|----------------|----------------|------------|------------------------|--------|-------|
| Rule Identifier * | `rule.identifier` | `dct:identifier` | `dct:identifier` | 🎯 | **MANDATORY** - Phase 1 added |
| Rule Title * | `rule.title` | `dct:title` | `dct:title` | 🎯 | **MANDATORY** - Phase 1 added |
| Rule URI | `rule.uri` | URI construction | - | ✅ | URI identifier |
| Extends (Rule URI) | `rule.extends` | `ronl:extends` | - | ℹ️ | RONL extension |
| Valid From | `rule.validFrom` | `ronl:validFrom` | - | ℹ️ | RONL extension |
| Valid Until | `rule.validUntil` | `ronl:validUntil` | - | ℹ️ | RONL extension |
| Confidence Level | `rule.confidenceLevel` | `ronl:confidenceLevel` | - | ℹ️ | RONL extension |
| Description | `rule.description` | `dct:description` | `dct:description` | ✅ | Correct |

### Dual Class Typing (Phase 1 ✅)

Rules now output **both** CPSV-AP and RONL class types:

```turtle
<rule-uri> a cpsv:Rule, ronl:TemporalRule ;
```

This ensures CPSV-AP compliance while maintaining Dutch RONL extensions.

### Missing CPSV-AP 3.2.0 Fields (Phase 2+)

| CPSV-AP Property | Cardinality | Priority | Suggested UI Label | Phase |
|------------------|-------------|----------|-------------------|-------|
| `dct:language` | 0..* | Medium | Language | Phase 2 |
| `dct:type` | 0..1 | Medium | Rule Type | Phase 2 |
| `eli:implements` | 0..* | Medium | Implements Legal Resource | Phase 2 |
| `eli:establishedUnder` | 0..* | Low | Established Under | Phase 3 |

---

## 5. Parameters Tab

**Current Class:** `ronl:ParameterWaarde` ℹ️

### Current Fields (v1.4.0)

| UI Field Label | State Property | TTL Output | Status | Notes |
|----------------|----------------|------------|--------|-------|
| Notation (Machine-readable) * | `param.notation` | `skos:notation` | ✅ | RONL extension |
| Label (Human-readable) * | `param.label` | `skos:prefLabel` | ✅ | RONL extension |
| Value * | `param.value` | `schema:value` | ✅ | RONL extension |
| Unit | `param.unit` | `schema:unitCode` | ✅ | RONL extension |
| Description | `param.description` | `dct:description` | ✅ | RONL extension |
| Valid From | `param.validFrom` | `ronl:validFrom` | ✅ | RONL extension |
| Valid Until | `param.validUntil` | `ronl:validUntil` | ✅ | RONL extension |

### Note on Parameters

Parameters (`ronl:ParameterWaarde`) are a **RONL-specific extension** not part of CPSV-AP core. This is acceptable - CPSV-AP is designed to be extensible. These fields support the Dutch regulatory context for normative values and constants.

**No changes needed** - this is compliant as an extension.

---

## 6. Cost & Output Sections

### 6.1 Cost (cv:Cost) - 🎯 Phase 1 Complete

**Location:** Within Service Tab  
**CPSV-AP Class:** `cv:Cost`

| UI Field Label | State Property | TTL Output | CPSV-AP 3.2.0 Property | Status |
|----------------|----------------|------------|------------------------|--------|
| Cost Identifier * | `cost.identifier` | `dct:identifier` | `dct:identifier` | 🎯 |
| Amount | `cost.value` | `cv:value` | `cv:value` | 🎯 |
| Currency | `cost.currency` | `cv:currency` | `cv:currency` | 🎯 |
| Cost Description | `cost.description` | `dct:description` | `dct:description` | 🎯 |

**Implementation:** Collapsible section within Service Tab. Optional - leave identifier empty if service has no costs.

---

### 6.2 Output (cv:Output) - 🎯 Phase 1 Complete

**Location:** Within Service Tab  
**CPSV-AP Class:** `cv:Output`

| UI Field Label | State Property | TTL Output | CPSV-AP 3.2.0 Property | Status |
|----------------|----------------|------------|------------------------|--------|
| Output Identifier * | `output.identifier` | `dct:identifier` | `dct:identifier` | 🎯 |
| Output Name * | `output.name` | `dct:title` | `dct:title` | 🎯 |
| Output Description | `output.description` | `dct:description` | `dct:description` | 🎯 |
| Output Type | `output.type` | `dct:type` | `dct:type` | 🎯 |

**Implementation:** Collapsible section within Service Tab. Optional - leave identifier empty if service produces no specific outputs.

---

## 7. CPRMV Tab

**CPSV-AP Class:** `cprmv:Rule` ℹ️

### Current Fields (v1.3.0+)

| UI Field Label | State Property | TTL Output | Status | Notes |
|----------------|----------------|------------|--------|-------|
| Rule ID * | `rule.ruleId` | `cprmv:id` | ✅ | CPRMV mandatory |
| Ruleset ID (BWB) * | `rule.rulesetId` | `cprmv:rulesetId` | ✅ | CPRMV mandatory |
| Definition * | `rule.definition` | `cprmv:definition` | ✅ | CPRMV mandatory |
| Situation * | `rule.situatie` | `cprmv:situatie` | ✅ | CPRMV mandatory |
| Norm * | `rule.norm` | `cprmv:norm` | ✅ | CPRMV mandatory |
| Rule ID Path * | `rule.ruleIdPath` | `cprmv:ruleIdPath` | ✅ | CPRMV mandatory |

### Note on CPRMV

CPRMV (Core Public Rule Management Vocabulary) is a **Dutch extension** for managing normative values extracted from legislation (normenbrief format). This tab supports JSON import for bulk rule loading.

**No changes needed** - this is compliant as an extension.

---

## 8. Future CPSV-AP Classes

### 8.1 Channel (cv:Channel) - 📋 Phase 2

**Priority:** MEDIUM

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes |
|------------------|-------------|-------------------|-------|
| `dct:identifier` | 1..* | Channel Identifier * | **MANDATORY** |
| `dct:description` | 0..* | Description | Text |
| `cv:processingTime` | 0..1 | Processing Time | Duration |
| `dct:type` | 0..1 | Channel Type | Online/Phone/InPerson |

---

### 8.2 ContactPoint (cv:ContactPoint) - 📋 Phase 2

**Priority:** MEDIUM

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes |
|------------------|-------------|-------------------|-------|
| `cv:contactPage` | 0..* | Contact Page URL | Document URL |
| `cv:hasEmail` | 0..* | Email Address | Email |
| `cv:telephone` | 0..* | Phone Number | Phone |

---

### 8.3 Requirement (cv:Requirement) - 🔮 Phase 3

**Priority:** MEDIUM-LOW

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes |
|------------------|-------------|-------------------|-------|
| `dct:identifier` | 1..* | Requirement ID * | **MANDATORY** |
| `dct:title` | 1..* | Requirement Name * | **MANDATORY** |
| `dct:description` | 1..* | Description * | **MANDATORY** |
| `dct:type` | 0..* | Requirement Type | Code |

---

### 8.4 Evidence (cv:Evidence) - 🔮 Phase 3

**Priority:** LOW

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes |
|------------------|-------------|-------------------|-------|
| `dct:identifier` | 1..* | Evidence ID * | **MANDATORY** |
| `dct:title` | 1..* | Evidence Name * | **MANDATORY** |
| `dct:description` | 0..* | Description | Text |
| `dct:type` | 0..1 | Evidence Type | Code |

---

### 8.5 Event (cv:Event, cv:BusinessEvent, cv:LifeEvent) - 🔮 Phase 3

**Priority:** LOW

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes |
|------------------|-------------|-------------------|-------|
| `dct:identifier` | 1..* | Event ID * | **MANDATORY** |
| `dct:title` | 1..* | Event Name * | **MANDATORY** |
| `dct:description` | 0..* | Description | Text |
| `dct:type` | 0..* | Event Type | BusinessEvent/LifeEvent |

---

### 8.6 Address (locn:Address) - 🔮 Phase 3

**Priority:** LOW (sub-entity of Organization)

| CPSV-AP Property | Cardinality | Suggested UI Label | Notes |
|------------------|-------------|-------------------|-------|
| `locn:thoroughfare` | 0..* | Street | Street name |
| `locn:locatorDesignator` | 0..* | House Number | Number |
| `locn:postCode` | 0..* | Postal Code | Postcode |
| `locn:postName` | 0..* | City | City name |
| `locn:adminUnitL1` | 0..* | Country | Country |
| `locn:adminUnitL2` | 0..* | Province/Region | Region |

---

## 9. Implementation Summary

### Phase 1: Minimal CPSV-AP 3.2.0 Compliance ✅ (v1.4.0)

**Status:** COMPLETE - December 2025

| # | Change | Type | Status |
|---|--------|------|--------|
| 1 | Change `org:Organization` → `cv:PublicOrganisation` | Class type | ✅ |
| 2 | Add `cv:spatial` to Organization (mandatory) | UI + State + TTL | ✅ |
| 3 | Add explicit `dct:identifier` outputs | TTL output | ✅ |
| 4 | Change `cpsv:follows` → `cv:hasLegalResource` | Relationship | ✅ |
| 5 | Add Rule `dct:identifier` and `dct:title` (mandatory) | UI + State + TTL | ✅ |
| 6 | Add dual typing: `cpsv:Rule, ronl:TemporalRule` | Class type | ✅ |
| 7 | Add Cost section to Service Tab | UI component | ✅ |
| 8 | Add Output section to Service Tab | UI component | ✅ |
| 9 | Fix Language to use LinguisticSystem URIs | TTL output | ✅ |
| 10 | Fix Sector to use URIs (dropdown + custom) | UI + TTL output | ✅ |

**Result:** Editor now generates **CPSV-AP 3.2.0 compliant** TTL files with all mandatory fields for minimal compliance.

---

### Phase 2: Extended Compliance 📋 (v1.5.0 - Planned)

**Target:** Q1 2026

| # | Change | Type | Effort |
|---|--------|------|--------|
| 11 | Add Channel class support | UI + State + TTL | Medium |
| 12 | Add ContactPoint class support | UI + State + TTL | Medium |
| 13 | Add Service Type dropdown | UI + State + TTL | Low |
| 14 | Add Processing Time field | UI + State + TTL | Low |
| 15 | Add Status field (Active/Inactive) | UI + State + TTL | Low |

---

### Phase 3: Full Compliance 🔮 (v1.6.0 - Future)

**Target:** Q2 2026

| # | Change | Type | Effort |
|---|--------|------|--------|
| 16 | Add Requirement class support | UI + State + TTL | Medium |
| 17 | Add Evidence class support | UI + State + TTL | Medium |
| 18 | Add Event class support | UI + State + TTL | Medium |
| 19 | Add Address sub-form to Organization | UI + State + TTL | Medium |

---

## 10. Compliance Statement

### Current Compliance Level (v1.4.0)

✅ **CPSV-AP 3.2.0 Minimal Compliance Achieved**

The Core Public Service Editor v1.4.0 meets all **mandatory requirements** for CPSV-AP 3.2.0:

- ✅ Correct class types (`cv:PublicOrganisation`, `cpsv:Rule`)
- ✅ Correct relationships (`cv:hasLegalResource`)
- ✅ Explicit identifiers for all entities (`dct:identifier`)
- ✅ Mandatory organization spatial field (`cv:spatial`)
- ✅ Mandatory rule identifier and title (`dct:identifier`, `dct:title`)
- ✅ Support for Cost and Output entities
- ✅ Proper URI formatting for language and sector

### Extensions

The editor includes **compliant extensions** for the Dutch regulatory context:

- ℹ️ **RONL vocabulary** - Temporal rules with validity periods
- ℹ️ **CPRMV vocabulary** - Normative rule management
- ℹ️ **Parameter values** - Constants and thresholds from legislation

All extensions follow CPSV-AP's extensibility guidelines and do not conflict with core compliance.

---

## References

- **CPSV-AP 3.2.0 Specification:** https://semiceu.github.io/CPSV-AP/
- **RONL Vocabulary:** https://regels.overheid.nl/termen/
- **CPRMV Specification:** https://cprmv.open-regels.nl/0.3.0/
- **Editor Documentation:** README.md
- **Namespace Reference:** NAMESPACE-PROPERTIES.md

---

**Document Version:** 2.0  
**Last Updated:** December 2025  
**Project:** RONL Initiative - Core Public Service Editor

---

*This document reflects the current implementation state and planned future enhancements for CPSV-AP 3.2.0 compliance.*
