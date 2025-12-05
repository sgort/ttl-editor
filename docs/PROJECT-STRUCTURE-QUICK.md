# TTL Editor - Quick Project Structure

**Version 1.4.0** | React 18 | CPSV-AP 3.2.0 | December 2025

---

## File Tree

```
ttl-editor/
│
├── src/
│   ├── App.js                    [790 lines] Main orchestrator
│   ├── index.js                  Entry point
│   ├── index.css                 Global styles + Tailwind
│   │
│   ├── components/
│   │   ├── PreviewPanel.jsx      [65 lines]  Live TTL preview side panel
│   │   └── tabs/
│   │       ├── index.js          Barrel export
│   │       ├── ServiceTab.jsx    [155 lines] Public service form
│   │       ├── OrganizationTab   [120 lines] Authority form
│   │       ├── LegalTab.jsx      [145 lines] Legal resource form
│   │       ├── RulesTab.jsx      [170 lines] Temporal rules form
│   │       ├── ParametersTab     [195 lines] Parameters form
│   │       └── ChangelogTab      [120 lines] Version history
│   │
│   ├── utils/
│   │   ├── index.js              Barrel export
│   │   ├── constants.js          [85 lines]  Shared constants
│   │   ├── ttlHelpers.js         [120 lines] TTL generation
│   │   ├── validators.js         [140 lines] Validation logic
│   │   └── parseTTL_enhanced.js  [350 lines] TTL import/parse
│   │
│   ├── data/
│   │   ├── changelog.json        [180 lines] Version history data
│   │   └── roadmap.json          [35 lines]  Future features
│   │
│   └── config/
│       └── vocabularies_config   [140 lines] RDF vocabulary mappings
│
├── docs/
│   ├── README.md                 Project documentation
│   ├── FIELD-MAPPING-CPSV-AP     CPSV-AP compliance
│   ├── VOCABULARY-INSTRUCTIONS   Vocabulary guide
│   └── NAMESPACE-PROPERTIES      RDF reference
│
└── package.json                  Dependencies & scripts
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.js (Main)                        │
│  • State management (service, org, legal, rules, params)   │
│  • Tab navigation                                           │
│  • Import/Export TTL                                        │
│  • Validation coordination                                  │
│  • Layout (header, tabs, preview toggle)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
   ┌────▼─────┐              ┌─────▼──────┐
   │  Tabs    │              │  Preview   │
   │ (6 tabs) │              │   Panel    │
   └────┬─────┘              └────────────┘
        │
   ┌────┴────┬────────┬────────┬──────────┬────────┐
   │         │        │        │          │        │
Service  Org    Legal  Rules  Params  Changelog
  Tab    Tab     Tab    Tab     Tab       Tab
```

---

## File Responsibilities

### 🎯 Core Application
| File | Lines | Purpose |
|------|-------|---------|
| `App.js` | 790 | Orchestrates entire app, manages state |
| `index.js` | 25 | React entry point, renders App |

### 🧩 Components (Tabs)
| Component | Lines | Maps To | Function |
|-----------|-------|---------|----------|
| `ServiceTab` | 155 | cpsv:PublicService | Service metadata form |
| `OrganizationTab` | 120 | cv:PublicOrganisation | Authority form |
| `LegalTab` | 145 | eli:LegalResource | Legal resource form |
| `RulesTab` | 170 | RONL vocabulary | Temporal rules form |
| `ParametersTab` | 195 | CPRMV vocabulary | Parameters form |
| `ChangelogTab` | 120 | - | Version history display |

### 🔧 Preview
| Component | Lines | Function |
|-----------|-------|----------|
| `PreviewPanel` | 65 | Live TTL preview, copy button, line count |

### ⚙️ Utilities
| File | Lines | Function |
|------|-------|----------|
| `constants.js` | 85 | Namespaces, options, URI prefixes |
| `ttlHelpers.js` | 120 | Generate TTL for each section |
| `validators.js` | 140 | Validate all form data |
| `parseTTL_enhanced.js` | 350 | Parse imported TTL files |

### 📊 Data
| File | Lines | Function |
|------|-------|----------|
| `changelog.json` | 180 | Version history content |
| `roadmap.json` | 35 | Future features list |

---

## Props Flow

```
App.js State
    │
    ├─► ServiceTab(service, setService)
    ├─► OrganizationTab(organization, setOrganization)
    ├─► LegalTab(legalResource, setLegalResource)
    ├─► RulesTab(rules, add/remove/update)
    ├─► ParametersTab(params, add/remove/update)
    └─► PreviewPanel(ttlContent)
```

---

## Data Flow

```
User Input → Tab Component → State Update (App.js)
    ↓
TTL Generation (ttlHelpers.js)
    ↓
PreviewPanel (live display) + Download
```

---

## Import/Export

```
Import: TTL File → parseTTL() → Extract Data → Update State → Populate Tabs

Export: State → Generate TTL → Combine Sections → Download .ttl
```

---

## Key Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| App.js lines | 1,723 | 790 | -54% |
| Total lines | 1,723 | ~2,200 | Distributed |
| Components | 0 | 8 | New |
| Utils | Inline | 4 files | Extracted |
| Maintainability | Low | High | ✅ |

---

## Standards Compliance

| Standard | Usage |
|----------|-------|
| **CPSV-AP 3.2.0** | Core vocabulary for public services |
| **RONL** | Temporal rules (Dutch government) |
| **CPRMV** | Parameters vocabulary |
| **ELI** | Legal resource identifiers |
| **Dublin Core** | Metadata (title, description) |
| **SKOS** | Concepts (prefLabel, notation) |
| **Schema.org** | Values and units |
| **FOAF** | Homepage links |

---

## Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "lucide-react": "^0.263.1",  // Icons
  "tailwindcss": "^3.x"         // Styling
}
```

---

## Development Commands

```bash
npm start      # Dev server (localhost:3000)
npm run build  # Production build
npm test       # Run tests
```

---

## Deployment

**Platform:** Azure Static Web Apps  
**CI/CD:** GitHub Actions  
**URL:** https://ttl.open-regels.nl

---

**Generated:** December 5, 2025  
**Project:** RONL Initiative - Public Service TTL Editor  
**Maintainer:** Ministry of Health, Welfare and Sport (VWS)

---

_Quick Reference - Project Structure v1.4.0_ ✓
