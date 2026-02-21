# CPSV Editor

[![CPSV-AP](https://img.shields.io/badge/CPSV--AP-3.2.0-blue)](https://semiceu.github.io/CPSV-AP/)
[![License](https://img.shields.io/badge/License-EUPL--1.2-yellow)](LICENSE)

🌐 **Production:** [cpsv-editor.open-regels.nl](https://cpsv-editor.open-regels.nl)  
🧪 **Acceptance:** [acc.cpsv-editor.open-regels.nl](https://acc.cpsv-editor.open-regels.nl)

---

## Documentation

As of February 21, 2026, all documentation for the CPSV Editor has moved to the **IOU Architecture documentation site**, which is maintained in the [iou-architectuur](https://git.open-regels.nl/showcases/iou-architectuur) repository and published at:

**[iou-architectuur.open-regels.nl/cpsv-editor](https://iou-architectuur.open-regels.nl/cpsv-editor)**

This covers user guides, developer docs, reference material, and architecture documentation. The `docs/` directory has been removed from this repository.

---

## Overview

The **CPSV Editor** is a React-based web application that simplifies the creation and management of RDF/Turtle files for government services in the Netherlands. It provides a structured form interface for building service definitions that comply with EU CPSV-AP 3.2.0 and Dutch RONL/CPRMV standards, and publishes the result as machine-readable Linked Data.

No RDF knowledge is required to use the editor. Users fill in familiar form fields; the editor generates the correct Turtle syntax, validates it, and can publish it directly to a TriplyDB knowledge graph.

---

## Architecture

### Application layers

```
┌────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                       │
│  App.js  •  Tab components  •  PreviewPanel                    │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                      │
│  constants  •  ttlGenerator  •  validators  •  parseTTL        │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                         DATA LAYER                             │
│  useEditorState  •  useArrayHandlers  •  vocabularies_config   │
└────────────────────────────────────────────────────────────────┘
```

### Component structure

```
App.js
  ├── ServiceTab         ← Public service metadata
  ├── OrganizationTab    ← Competent authority
  ├── LegalTab           ← Legal resource (BWB)
  ├── RulesTab           ← Temporal rules  [RPP: Rules]
  ├── ParametersTab      ← Configuration values  [RPP: Parameters]
  ├── CPRMVTab           ← Normative rules  [RPP: Policy]
  ├── DMNTab             ← Decision model deployment & testing
  ├── VendorTab          ← Vendor implementation metadata
  ├── IKnowMappingTab    ← iKnow XML import
  ├── ChangelogTab       ← Version history
  └── PreviewPanel       ← Live TTL preview (side panel)
```

### Data flow

**Import:**

```
TTL file uploaded → parseTTL() → extract entities → populate all tabs
```

**Export:**

```
Tab state → generateTTL() → combine sections + namespaces → download .ttl
```

### Deployment pipeline

```
Git push → GitHub Actions → npm run build → Azure Static Web Apps → cpsv-editor.open-regels.nl
```

---

## Standards

The editor generates Turtle files compliant with the following vocabularies:

| Vocabulary  | Version | Purpose                                         |
| ----------- | ------- | ----------------------------------------------- |
| CPSV-AP     | 3.2.0   | EU Core Public Service Vocabulary               |
| CPRMV       | 0.3.0   | Core Public Rule Management Vocabulary (Dutch)  |
| RONL        | —       | Regels Overheid Nederland governance vocabulary |
| ELI         | —       | European Legislation Identifier                 |
| Dublin Core | —       | Metadata terms (title, description, identifier) |
| SKOS        | —       | Simple Knowledge Organization System            |
| Schema.org  | —       | Value and unit definitions                      |
| FOAF        | —       | Organization homepages                          |
| ORG         | —       | Organization ontology                           |

---

## Positioning

The CPSV Editor is the authoring tool in a broader semantic mediation architecture. Service definitions created here are published to a TriplyDB knowledge graph where they can be queried by the Linked Data Explorer and consumed by downstream systems. The editor implements the semantic mediation principle of separating citizen-facing vocabulary from internal business domain models — decisions expressed as DMN files are linked to their public service descriptions through structured RDF properties.

See [Semantic Mediation Reference Architecture](https://iou-architectuur.open-regels.nl/cpsv-editor/reference/semantic-mediation-architecture/) for the full architectural context.

---

## Getting started

```bash
npm install
npm start       # development server at http://localhost:3000
npm run build   # production build → build/
```

---

## License

EUPL-1.2 — see [LICENSE](LICENSE).
