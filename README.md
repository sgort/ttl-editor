# Core Public Service Editor

**Generate CPSV-AP 3.2.0 compliant RDF/Turtle files for Dutch government services**

🌐 **Live Application:** [cpsv.open-regels.nl](https://cpsv.open-regels.nl)

[![CPSV-AP](https://img.shields.io/badge/CPSV--AP-3.2.0-blue)](https://semiceu.github.io/CPSV-AP/)
[![Version](https://img.shields.io/badge/version-1.4.0-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Standards Compliance](#standards-compliance)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Links](#links)

---

## 🎯 Overview

The **Core Public Service Editor** (formerly Public Service TTL Editor) is a React-based web application that simplifies the creation and management of RDF/Turtle files for government services. It provides an intuitive interface for creating service definitions that comply with EU and Dutch standards.

### Part of RONL Initiative

This tool is part of **RONL (Regels Overheid Nederland)**, enabling government organizations to:

- ✅ Document public services with structured, semantic metadata
- ✅ Define temporal rules for service regulations
- ✅ Link services to legal resources (Dutch BWB laws)
- ✅ Manage normative values from legislation (CPRMV)
- ✅ Generate valid, standards-compliant RDF/Turtle files

### Example Use Cases

- **AOW (Old Age Pension)**: Define retirement age calculation rules with temporal validity
- **WIA (Work and Income Act)**: Document disability benefit services with parameter values
- **Participatiewet**: Model municipal participation services with costs and outputs

---

## ✨ Features

### Current Version: 1.4.0 (December 2025)

#### 🎨 **Modular Architecture**

- **Extracted Components**: 7 tab components + preview panel
- **Organized Utils**: Business logic separated from UI
- **Clean Codebase**: Reduced from 1,723 to 790 lines in App.js (-54%)

#### 📑 **Multi-Tab Interface**

| Tab              | Purpose                | CPSV-AP Class                  |
| ---------------- | ---------------------- | ------------------------------ |
| **Service**      | Core service metadata  | `cpsv:PublicService`           |
| **Organization** | Competent authority    | `cv:PublicOrganisation`        |
| **Legal**        | Legal resource linkage | `eli:LegalResource`            |
| **Rules**        | Temporal regulations   | `cpsv:Rule, ronl:TemporalRule` |
| **Parameters**   | Normative constants    | `ronl:ParameterWaarde`         |
| **CPRMV**        | Bulk rule management   | `cprmv:Rule`                   |
| **Changelog**    | Version history        | -                              |

#### ✅ **CPSV-AP 3.2.0 Compliance** (Phase 1 Complete)

- ✅ Correct class types (`cv:PublicOrganisation` instead of `org:Organization`)
- ✅ Correct relationships (`cv:hasLegalResource` instead of `cpsv:follows`)
- ✅ Explicit identifiers for all entities (`dct:identifier`)
- ✅ Mandatory organization spatial field (`cv:spatial`)
- ✅ Mandatory rule identifiers and titles
- ✅ Cost and Output sections with proper CPSV-AP properties
- ✅ Language as LinguisticSystem URI
- ✅ Sector as URI from controlled vocabulary

#### 📥 **Import/Export**

- Import existing `.ttl` files for editing
- Automatic form population from TTL content
- Intelligent parsing with vocabulary configuration support
- Round-trip editing (export → import → edit → export)
- Proper character escaping and URI encoding

#### 🎯 **Validation**

- Required field checking with visual indicators
- Pattern matching (BWB IDs, URIs)
- Real-time feedback
- Comprehensive validation for all mandatory CPSV-AP fields

#### 👁️ **Live Preview**

- Split-screen mode with toggle
- Real-time TTL generation as you type
- Copy-to-clipboard functionality
- Line count display

#### 🔧 **CPRMV Support**

- Dedicated tab for normative rules (normenbrief format)
- JSON import for bulk rule loading
- All 6 mandatory CPRMV fields supported
- Automatic URI generation

---

## 📐 Standards Compliance

### CPSV-AP 3.2.0 (Core Public Service Vocabulary)

**Status:** ✅ Phase 1 Minimal Compliance Achieved

European standard for describing public services with semantic metadata:

- Service descriptions and classifications
- Organization relationships
- Legal basis references
- Costs, outputs, and service delivery information

**Documentation:** [CPSV-AP 3.2.0 Specification](https://semiceu.github.io/CPSV-AP/)

### RONL Vocabulary (Regels Overheid Nederland)

Dutch extensions for temporal rule management:

- `ronl:TemporalRule` - Time-bound regulations
- `ronl:extends` - Rule inheritance and versioning
- `ronl:validFrom`, `ronl:validUntil` - Validity periods
- `ronl:confidenceLevel` - Regulation confidence levels
- `ronl:ParameterWaarde` - Parameter values with units

### CPRMV 0.3.0 (Core Public Rule Management Vocabulary)

Dutch standard for normative values extracted from legislation:

- `cprmv:Rule` - Normative rule from legal text
- `cprmv:id`, `cprmv:rulesetId` - Rule identification
- `cprmv:definition`, `cprmv:situatie` - Rule content
- `cprmv:norm` - Numeric normative value
- `cprmv:ruleIdPath` - Hierarchical rule path

**Documentation:** [CPRMV Specification](https://cprmv.open-regels.nl/0.3.0/)

### Supporting Standards

- **ELI (European Legislation Identifier)** - Legal resource references
- **Dublin Core Terms** - Metadata properties (title, description, identifier)
- **SKOS (Simple Knowledge Organization System)** - Concepts and labels
- **Schema.org** - Parameter values and units
- **FOAF** - Organization homepage links
- **W3C Turtle** - RDF serialization format

---

## 📁 Project Structure

### Directory Tree

```
ttl-editor/
│
├── public/                          # Static assets
│   ├── index.html                   # HTML template
│   ├── favicon.svg                  # Custom favicon
│   └── manifest.json                # PWA manifest
│
├── src/
│   ├── App.js                       # Main orchestrator
│   ├── App.css                      # Application styles
│   ├── index.js                     # React entry point
│   ├── index.css                    # Global styles + Tailwind
│   │
│   ├── components/
│   │   ├── PreviewPanel.jsx         # Live preview side panel
│   │   └── tabs/
│   │       ├── index.js             # Barrel export
│   │       ├── ServiceTab.jsx       # Service form
│   │       ├── OrganizationTab.jsx  # Organization form
│   │       ├── LegalTab.jsx         # Legal resource form
│   │       ├── RulesTab.jsx         # Temporal rules form
│   │       ├── ParametersTab.jsx    # Parameters form
│   │       ├── CPRMVTab.jsx         # CPRMV rules form
│   │       └── ChangelogTab.jsx     # Version history
│   │
│   ├── utils/
│   │   ├── index.js                 # Barrel export
│   │   ├── constants.js             # Shared constants
│   │   ├── ttlHelpers.js            # TTL generation
│   │   ├── validators.js            # Validation logic
│   │   └── parseTTL_enhanced.js     # TTL parser
│   │
│   ├── data/
│   │   ├── changelog.json           # Version history
│   │   └── roadmap.json             # Future features
│   │
│   └── config/
│       └── vocabularies_config.js   # RDF vocabulary mappings
│
├── docs/                               # Documentation
│   ├── FIELD-MAPPING-CPSV-AP-3.2.0.md  # CPSV-AP compliance mapping
│   ├── NAMESPACE-PROPERTIES.md         # RDF property reference
│   ├── VOCABULARY-INSTRUCTIONS.md      # Vocabulary configuration guide
│   ├── PROJECT-STRUCTURE.md            # Detailed architecture
│   └── PROJECT-STRUCTURE-QUICK.md      # Quick reference
│
├── .github/
│   └── workflows/
│       └── azure-static-web-apps-*.yml # CI/CD pipeline
│
├── package.json                     # Dependencies & scripts
├── tailwind.config.js               # Tailwind configuration
├── .eslintrc.json                   # ESLint rules
└── README.md                        # This file
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      App.js (Main)                          │
│  • State management (useState hooks)                        │
│  • Tab navigation                                           │
│  • Import/Export TTL                                        │
│  • Validation coordination                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
   ┌────▼─────┐              ┌─────▼──────┐
   │  Tabs    │              │  Preview   │
   │(7 tabs)  │              │   Panel    │
   └────┬─────┘              └────────────┘
        │
   ┌────┴────┬────────┬────────┬──────────┬────────┬────────┐
   │         │        │        │          │        │        │
Service   Org    Legal   Rules   Params   CPRMV  Changelog
  Tab     Tab     Tab     Tab      Tab     Tab      Tab
```

### Data Flow

```
User Input → Tab Component → State Update (App.js)
    ↓
TTL Generation (utils/ttlHelpers.js)
    ↓
PreviewPanel (live display) + Download (.ttl file)

Import: TTL File → parseTTL_enhanced.js → Extract Data → Update State → Populate Tabs
```

### Key Metrics

| Metric             | v1.3.0  | v1.4.0     | Improvement             |
| ------------------ | ------- | ---------- | ----------------------- |
| App.js lines       | 856     | 790        | -8%                     |
| Total codebase     | ~1,900  | ~2,300     | Better organized        |
| Components         | 7       | 9          | +2 (Cost, Output)       |
| CPSV-AP compliance | Partial | Phase 1 ✅ | Full minimal compliance |
| Test coverage      | Manual  | Manual     | Structured checklists   |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **Git**
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ttl-editor
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Build for Production

```bash
npm run build
```

Creates an optimized production build in the `build/` directory.

---

## 📖 Usage Guide

### Creating a New Service

1. **Service Tab**
   - Enter unique service identifier (e.g., `aow-leeftijd`)
   - Provide service name and description
   - Add thematic area URI (e.g., `https://standaarden.overheid.nl/owms/terms/...`)
   - Select government sector from dropdown
   - Add keywords and select language

2. **Organization Tab**
   - Enter organization identifier or full URI
   - Provide organization name
   - Add homepage URL
   - **Select geographic jurisdiction (mandatory)** - e.g., Netherlands

3. **Legal Tab**
   - Enter BWB law ID (format: `BWBR0002820`) or full URI
   - Specify version date (optional)
   - Add legal title and description

4. **Rules Tab**
   - **Enter rule identifier (mandatory)** - e.g., `rule-001`
   - **Enter rule title (mandatory)** - e.g., "AOW Age Rule 2024"
   - Add rule URI
   - Define rule extensions (optional)
   - Set validity periods
   - Choose confidence level
   - Add description

5. **Parameters Tab** (optional)
   - Add parameter notations (e.g., `MAXIMUM_INCOME`)
   - Set labels, values, and units
   - Define validity periods

6. **CPRMV Tab** (optional)
   - Import JSON from normenbrief format
   - Or manually enter normative rules
   - All 6 fields are mandatory per rule

7. **Cost & Output** (in Service Tab)
   - Scroll down in Service Tab to find Cost and Output sections
   - Add cost information if applicable
   - Define service outputs if applicable

8. **Preview & Download**
   - Toggle preview panel to see generated TTL
   - Click "Validate" to check for errors
   - Click "Download TTL" to save the file

### Importing Existing Services

1. Click **"Import TTL File"** button in header
2. Select a `.ttl` file from your computer
3. All form fields populate automatically
4. Edit as needed
5. Download updated version

### Example TTL Output (v1.4.0)

```turtle
@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;
    dct:identifier "aow-leeftijd" ;
    dct:title "AOW Leeftijdsbepaling"@nl ;
    dct:description "Berekening van de AOW-leeftijd"@nl ;
    dct:language <https://publications.europa.eu/resource/authority/language/NLD> ;
    cv:sector <https://publications.europa.eu/resource/authority/corporate-body-classification/NATIONAL> ;
    cv:hasCompetentAuthority <https://regels.overheid.nl/organizations/svb> ;
    cv:hasLegalResource <https://wetten.overheid.nl/BWBR0002221> .

<https://regels.overheid.nl/organizations/svb> a cv:PublicOrganisation ;
    dct:identifier "svb" ;
    skos:prefLabel "Sociale Verzekeringsbank"@nl ;
    foaf:homepage <https://www.svb.nl> ;
    cv:spatial <https://publications.europa.eu/resource/authority/country/NLD> .

<https://wetten.overheid.nl/BWBR0002221> a eli:LegalResource ;
    dct:identifier "BWBR0002221" ;
    dct:title "Algemene Ouderdomswet"@nl .
```

---

## 🛠 Development

### Technology Stack

**Frontend:**

- React 18.3.1 with hooks (functional components)
- Tailwind CSS 3.x for styling
- Lucide React 0.263.1 for icons

**Build Tools:**

- Create React App (zero-config)
- ESLint with react-app preset
- PostCSS for Tailwind

**Deployment:**

- Azure Static Web Apps
- GitHub Actions CI/CD
- Custom domain with SSL

### Development Commands

```bash
# Start dev server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Code Quality

ESLint configuration with React-specific rules:

- Unused variables: Underscore prefix allowed
- React hooks: Rules enforced
- No console warnings in production

### Adding New Features

1. **Update State**: Add new state variables in `App.js`
2. **Create/Update Component**: Modify relevant tab component
3. **Update Constants**: Add options to `constants.js`
4. **Update TTL Generator**: Add properties in TTL generation section
5. **Update Parser**: Add parsing logic in `parseTTL_enhanced.js`
6. **Test**: Create → Export → Import → Verify

### Testing Workflow

1. Fill all form fields
2. Download TTL file
3. Clear form (refresh page)
4. Import downloaded file
5. Verify all fields restored correctly
6. Check validation works
7. Test edge cases (special characters, URIs, etc.)

---

## 🚢 Deployment

### Azure Static Web Apps

The application is deployed with automatic CI/CD through GitHub Actions.

**Configuration:**

- **Platform**: Azure Static Web Apps
- **Plan**: Free tier (100 GB bandwidth/month)
- **Domain**: [ttl.open-regels.nl](https://ttl.open-regels.nl)
- **SSL**: Automatic HTTPS

**Deployment Process:**

1. Push to GitHub main branch
2. GitHub Actions triggers automatically
3. Builds with `npm run build`
4. Deploys to Azure
5. Live in 2-3 minutes

**GitHub Actions Workflow:**

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [main]

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          app_location: '/'
          output_location: 'build'
```

---

## 🗺️ Roadmap

### ✅ Phase 1: Minimal CPSV-AP 3.2.0 Compliance (v1.4.0) - COMPLETE

**Released:** December 2025

- ✅ Class type fixes (`cv:PublicOrganisation`, dual-typed rules)
- ✅ Relationship fixes (`cv:hasLegalResource`)
- ✅ Explicit identifiers for all entities
- ✅ Mandatory organization spatial field
- ✅ Mandatory rule identifier and title
- ✅ Cost and Output sections
- ✅ Language and Sector URIs

### 📋 Phase 2: Extended Compliance (v1.5.0) - PLANNED

**Target:** Q1 2026

- Channel class support (`cv:Channel`)
- ContactPoint class support (`cv:ContactPoint`)
- Additional service fields (type, processing time, status)
- Enhanced validation with field-level feedback

### 🔮 Phase 3: Full Compliance (v1.6.0) - FUTURE

**Target:** Q2 2026

- Requirement class support (`cv:Requirement`)
- Evidence class support (`cv:Evidence`)
- Event class support (`cv:Event`, `cv:BusinessEvent`, `cv:LifeEvent`)
- Address support for organizations (`locn:Address`)

### 💡 Future Enhancements

- **Template System**: Pre-fill from common service templates
- **Browser Storage**: Auto-save to localStorage
- **Advanced Validation**: SHACL-based validation
- **Multi-Service Management**: Work with multiple services simultaneously
- **TriplyDB Integration**: Direct upload to knowledge graphs
- **Collaborative Editing**: Multi-user support
- **Version Control**: Track service definition changes over time

See `roadmap.json` for detailed feature planning.

---

## 📚 Documentation

### Available Documentation

- **README.md** (this file) - Getting started and overview
- **FIELD-MAPPING-CPSV-AP-3.2.0.md** - Complete CPSV-AP compliance mapping
- **NAMESPACE-PROPERTIES.md** - RDF property reference guide
- **VOCABULARY-INSTRUCTIONS.md** - Vocabulary configuration guide
- **PROJECT-STRUCTURE.md** - Detailed architecture documentation
- **PROJECT-STRUCTURE-QUICK.md** - Quick reference guide

### Standards Documentation

- [CPSV-AP 3.2.0 Specification](https://semiceu.github.io/CPSV-AP/)
- [CPRMV 0.3.0 Specification](https://cprmv.open-regels.nl/0.3.0/)
- [W3C Turtle Specification](https://www.w3.org/TR/turtle/)
- [ELI Ontology](http://data.europa.eu/eli/ontology)

---

## 🔗 Links

- **Live Application**: [ttl.open-regels.nl](https://ttl.open-regels.nl)
- **GitLab Repository**: [showcases/aow](https://git.open-regels.nl/showcases/aow)
- **RONL Initiative**: [regels.overheid.nl](https://regels.overheid.nl)
- **CPSV-AP**: [https://semiceu.github.io/CPSV-AP/](https://semiceu.github.io/CPSV-AP/)
- **CPRMV**: [https://cprmv.open-regels.nl](https://cprmv.open-regels.nl)

---

## 🙏 Acknowledgments

This project is part of the **RONL (Regels Overheid Nederland)** initiative, working towards transparent, machine-readable government regulations.

**Built with:**

- React team for the amazing framework
- Tailwind CSS team for the utility-first approach
- Lucide team for beautiful icons
- W3C and ISA² programme for semantic web standards
- Dutch government organizations for feedback and requirements

---

## 📝 License

See project repository for license information.

---

## 📧 Contact

For questions, feedback, or contributions:

- Open an issue on the GitLab repository
- Contact via RONL Initiative channels

---

**Last Updated**: December 2025  
**Current Version**: 1.4.0 (CPSV-AP 3.2.0 Phase 1 Compliant)  
**Project**: RONL Initiative - Core Public Service Editor

---

_Building transparent, accessible, and machine-readable government services_ ✨
