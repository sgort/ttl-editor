# Reference Architecture -- Semantic Mediation between Business Domain Models and Citizen‑Centric Vocabularies

## Visual Overview

    ┌────────────────────────────────────────────────────────────────────────┐
    │                          CITIZEN CONTEXT                               │
    │                                                                        │
    │   Citizen Services / Portals / Letters / Forms / Chatbots / Voice UX   │
    │                                                                        │
    │   ┌────────────────────────────────────────────────────────────────┐   │
    │   │           CITIZEN VOCABULARY (Presentation Model)              │   │
    │   │   • Plain‑language wording                                     │   │
    │   │   • Life‑event concepts                                        │   │
    │   │   • UX terminology                                             │   │
    │   │   • Multilingual variants                                      │   │
    │   └────────────────────────────────────────────────────────────────┘   │
    └────────────────────────────────────────────────────────────────────────┘

                                      ▲   ↕   ▼
                         CONTEXTUAL TRANSLATION / MAPPING

    ┌────────────────────────────────────────────────────────────────────────┐
    │                     SEMANTIC MEDIATION LAYER                           │
    │                                                                        │
    │   ┌────────────────────────────────────────────────────────────────┐   │
    │   │  Concept Mapping & Rules                                       │   │
    │   │  ------------------------------------------------------------- │   │
    │   │  • Ontology alignment                                          │   │
    │   │  • Term mappings (citizen ↔ canonical)                         │   │
    │   │  • Context rules                                               │   │
    │   │  • Meaning validation                                          │   │
    │   │  • Simplification & transformation                             │   │
    │   └────────────────────────────────────────────────────────────────┘   │
    └────────────────────────────────────────────────────────────────────────┘

                                      ▲   ↕   ▼
                                CANONICAL ALIGNMENT

    ┌────────────────────────────────────────────────────────────────────────┐
    │                       BUSINESS SEMANTIC CORE                           │
    │                                                                        │
    │   ┌────────────────────────────────────────────────────────────────┐   │
    │   │          CANONICAL INFORMATION MODEL                           │   │
    │   │   • Harmonized core concepts                                   │   │
    │   │   • Legal definitions                                          │   │
    │   │   • Controlled vocabularies                                    │   │
    │   └────────────────────────────────────────────────────────────────┘   │
    │                                                                        │
    │   ┌────────────────────────────────────────────────────────────────┐   │
    │   │              BUSINESS DOMAIN MODEL                             │   │
    │   │   • Policy concepts                                            │   │
    │   │   • Service rules                                              │   │
    │   │   • Product structures                                         │   │
    │   └────────────────────────────────────────────────────────────────┘   │
    └────────────────────────────────────────────────────────────────────────┘

                                      ▲
                                      │
                               IMPLEMENTATION

    ┌────────────────────────────────────────────────────────────────────────┐
    │                        APPLICATION & DATA LAYER                        │
    │                                                                        │
    │   • APIs / Microservices                                               │
    │   • Schemas & Databases                                                │
    │   • Workflow Engines                                                   │
    │   • Legacy Systems                                                     │
    └────────────────────────────────────────────────────────────────────────┘

---

## Architecture Purpose

This reference architecture describes how **business domain models** are
translated into **citizen‑centric vocabularies** through an explicit
**semantic mediation layer**, enabling:

- Clear and understandable communication with citizens\
- Cross‑system semantic interoperability\
- Legal and policy meaning preservation

---

# Semantic Layers

| Layer                       | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| Citizen Context             | Interaction channels communicating in plain language      |
| Citizen Vocabulary          | Presentation model containing citizen‑friendly terms      |
| Semantic Mediation          | Mapping, contextualization, transformation and validation |
| Canonical Information Model | Logical, harmonized semantic data model                   |
| Business Domain Model       | Policy and product conceptual models                      |
| Application & Data Layer    | Technical implementations                                 |

---

# TOGAF Terminology Mapping

| Reference Architecture Element | TOGAF Term                                       |
| ------------------------------ | ------------------------------------------------ |
| Citizen Vocabulary             | Business Architecture -- Stakeholder Viewpoints  |
| Semantic Mediation Layer       | Application Architecture -- Integration Services |
| Canonical Information Model    | Data Architecture -- Logical Data Model          |
| Business Domain Model          | Business Architecture -- Business Objects        |
| Physical Schemas               | Data Architecture -- Physical Data Model         |
| Citizen Channels               | Business Architecture -- Front‑Stage Processes   |

---

# ArchiMate Terminology Mapping

| Reference Architecture      | ArchiMate Element                           |
| --------------------------- | ------------------------------------------- |
| Citizen Vocabulary          | Business Object + Representation            |
| Semantic Mediation          | Application Service + Application Component |
| Ontology Mapping            | Application Function                        |
| Canonical Information Model | Data Object                                 |
| Business Domain Model       | Business Object                             |
| APIs                        | Application Interface                       |
| Systems                     | Application Component                       |

---

## Positioning in TOGAF ADM

- **Architecture Vision:** Citizen‑centric semantic alignment\
- **Business Architecture:** Service concepts and citizen
  communication vocabulary\
- **Data Architecture:** Canonical models and controlled vocabularies\
- **Application Architecture:** Semantic mediation and translation
  services\
- **Technology Architecture:** API gateways, middleware and
  integration platforms

---
