# Core Public Service Editor

**Generate CPSV-AP 3.2.0 compliant RDF/Turtle files for Dutch government services**

🌐 **Live Application:** [cpsv.open-regels.nl](https://cpsv.open-regels.nl)  
🧪 **Acceptance Environment:** [acc.cpsv.open-regels.nl](https://acc.cpsv.open-regels.nl)

[![CPSV-AP](https://img.shields.io/badge/CPSV--AP-3.2.0-blue)](https://semiceu.github.io/CPSV-AP/)
[![Version](https://img.shields.io/badge/version-1.5.1-green)]()
![License](https://img.shields.io/badge/License-EUPL-yellow.svg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Standards Compliance](#standards-compliance)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Documentation](#documentation)

---

## 🎯 Overview

The **Core Public Service Editor** is a React-based web application that simplifies the creation and management of RDF/Turtle files for government services in the Netherlands. It provides an intuitive interface for creating service definitions that comply with EU CPSV-AP 3.2.0 and Dutch RONL/CPRMV standards.

**Key Features:**

- ✅ **CPSV-AP 3.2.0 compliant** TTL generation
- ✅ **DMN integration** with Operaton rule engine
- ✅ **RPP Architecture** (Rules--Policy--Parameters separation)
- ✅ **iKnow integration** for legislative analysis import
- ✅ **Import/Export** with perfect round-trip fidelity
- ✅ **Live preview** panel with real-time TTL generation

---

# Vendor Tab Implementation - Blueriq Service Metadata ✨ NEW ✨

**Version:** 1.9.0  
**Date:** February 15, 2026  
**Status:** Production Ready  
**Feature:** Multi-Vendor Service Metadata Architecture

## Purpose

The Vendor Tab enables Dutch government services to document **vendor-specific implementations** of their decision models. While the CPSV Editor creates reference DMN decision models, vendors like Blueriq, iKnow, and others provide commercial implementations with additional features, support, and enterprise capabilities.

This tab creates a bridge between:

- **Reference Implementation**: Open-source DMN model validated by government
- **Vendor Implementation**: Commercial service with SLAs, support, and certification

### Key Features

- **Multi-Vendor Architecture**: Dropdown loads all RONL Method Concepts from TriplyDB
- **Blueriq Service Metadata**: Full contact, technical, and certification information
- **Logo Management**: Asset path generation matching Organization tab pattern
- **URL Validation**: Real-time feedback for vendor website and service endpoint
- **Certification Workflow**: Track conformance assessment status and certification
- **TTL Generation**: Complete RDF output with schema.org and RONL vocabularies

### References

See further the [detailed docs](./docs/VENDOR_BLUERIQ.md)

---

## ✨ Features

### Core Functionality

#### 📝 **Service Definition**

- Public service metadata (title, description, keywords)
- Thematic areas and sector classification
- Cost and output specification
- Legal resource linking

#### 🏛️ **Organization Management**

- Public organization details
- Geographic jurisdiction (mandatory)
- Homepage and contact information
- URI support (short IDs or full URIs)

### Organization Logos

Upload and manage organization logos directly in the Organization tab:

- **Upload**: Support for JPG and PNG files (automatically resized to 256×256px)
- **Preview**: Live preview with file size and encoding information
- **Publishing**: Logos are automatically uploaded as assets to TriplyDB
- **RDF Output**: Generates `foaf:logo` and `schema:image` properties
- **Semantic Links**: Full traversal path: `DMN → Service → Organization → Logo`

Logos are published alongside your service metadata and can be queried via SPARQL in the Linked Data Explorer.

#### ⚖️ **Legal Resource Integration**

- BWB ID support for Dutch legislation
- Version and consolidation tracking
- Direct linking to wetten.overheid.nl
- Validation of BWB formats

#### 🔵 **Rules (Decision Logic) - RPP Layer**

- Temporal rules with validity periods
- Rule versioning and inheritance chains
- Confidence level tracking (high/medium/low)
- Rule-to-policy traceability

#### 🟢 **Parameters (Configuration) - RPP Layer**

- Configurable values for rule behavior
- Multiple unit types (EUR, PCT, NUM, DAYS, MONTHS, YEARS)
- Temporal validity per parameter
- Regional variation support

#### 🟣 **CPRMV (Policy/Norms) - RPP Layer**

- Normative values from legislation
- CPRMV Rules API integration
- JSON import from normenbrief format
- Policy-to-legal-source traceability

#### 🎯 **DMN (Decision Models)**

- Upload and deploy DMN files to Operaton
- Test decision evaluations with live data
- Automatic input variable extraction
- Rule extraction with CPRMV attributes
- Import preservation for existing DMN

#### 📚 **NL-SBB Concepts**

The CPSV Editor automatically generates semantic concept definitions for DMN decision variables according to the **Dutch Standard for Describing Concepts (NL-SBB)**. These concepts enable semantic interoperability across different decision models.

**Key Features:**

- **Automatic Generation**: Concepts are automatically created when you test a DMN model
- **Full CRUD Operations**: Add, edit, and delete concepts with a user-friendly interface
- **Semantic Linking**: Use `skos:exactMatch` to link concepts across different ontologies
- **Import/Export**: Concepts are preserved in round-trip import/export cycles
- **Manual Management**: Add custom input/output concepts beyond auto-generated ones

**Concept Properties:**

- **Preferred Label** (skos:prefLabel): Human-readable name in Dutch
- **Notation** (skos:notation): Short machine code (e.g., "GA", "LP")
- **Definition** (skos:definition): Semantic description of the concept
- **Variable Name**: Technical name used in DMN and URIs
- **Exact Match** (skos:exactMatch): Optional URI to equivalent concept in another ontology

**Use Cases:**

- **Cross-DMN Validation**: Link variables like "geboortedatum" = "birthdate" across different models
- **Chain Detection**: Enable the Linked Data Explorer to detect cycles and validate decision chains
- **Concept Harmonization**: Standardize terminology across different government organizations
- **Semantic Search**: Enable semantic queries across multiple decision models

**Standards Compliance:**

- NL-SBB (Nederlandse Standaard voor het Beschrijven van Begrippen)
- SKOS (Simple Knowledge Organization System)
- Linked Data principles with dereferenceable URIs

**Documentation**: [Dutch Standard for Describing Concepts](https://geonovum.github.io/NL-SBB/)

## 🏢 Vendor Integration

The CPSV Editor supports integration with multiple vendor platforms for importing legislative and regulatory data. The **Vendor** tab provides a unified interface for configuring and importing data from various rules management systems.

### Supported Vendors

The editor integrates with vendors listed in the RONL vocabulary as **Method Concepts** (`ronl:MethodConcept`). Currently, 17 vendor platforms are supported:

| Vendor     | Description                                            | Status              |
| ---------- | ------------------------------------------------------ | ------------------- |
| **iKnow**  | Legislative analysis and knowledge management platform | ✅ Fully Integrated |
| ALEF       | Agile Law Execution Factory                            | 🔄 Planned          |
| Avola      | Decision automation platform                           | 🔄 Planned          |
| Beinformed | Intelligent automation platform                        | 🔄 Planned          |
| Blueriq    | Digital decision management                            | 🔄 Planned          |
| OpenFisca  | Tax and benefit system modeling                        | 🔄 Planned          |
| RuleSpeak  | Business rule notation                                 | 🔄 Planned          |
| USoft      | Rules-based application development                    | 🔄 Planned          |

### Using the Vendor Tab

1. **Navigate to Vendor Tab**
   - Click the **Vendor** tab in the main navigation

2. **Select a Vendor**
   - Choose a vendor from the dropdown menu
   - Vendors are loaded dynamically from the RONL vocabulary in TriplyDB

3. **Configure Integration**
   - Each vendor has its own integration interface
   - Currently, only iKnow integration is fully implemented

### iKnow Integration

The iKnow integration allows you to import legislative knowledge from iKnow XML exports:

#### Supported Formats

- **CognitatieAnnotationExport.xml** - Concept-based exports with annotations
- **SemanticsExport.xml** - Semantic knowledge exports

#### Features

- **Configure Mode**: Create reusable field mapping configurations
  - Map iKnow XML fields to CPSV-AP properties
  - Define mappings for Service, Legal, Rules, Parameters, and CPRMV sections
  - Save and load mapping configurations as JSON
- **Import Mode**: Import data using saved configurations
  - Upload iKnow XML data files
  - Select a mapping configuration
  - Preview mapped data before import
  - Import directly into the editor

#### Workflow

1. Switch to **Configure** mode
2. Upload an example iKnow XML file (or use "Load Example")
3. Map XML fields to CPSV-AP properties for each section
4. Save the configuration
5. Switch to **Import** mode
6. Upload your actual iKnow data file
7. Select the saved configuration
8. Preview and import the data

### Adding New Vendor Integrations

The architecture supports easy addition of new vendor integrations:

1. Create vendor-specific component in `src/components/tabs/vendors/`
2. Add conditional rendering in `VendorTab.jsx` based on selected vendor URI
3. Implement vendor-specific parser for data format
4. Create field mapping configuration for CPSV-AP compliance
5. Add state management for vendor-specific configuration

### Technical Details

**Vendor List Source**: RONL vocabulary in TriplyDB

```
Endpoint: https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql
Concept: ronl:MethodConcept
```

**Integration Pattern**: Each vendor URI follows the format:

```
https://regels.overheid.nl/termen/{VendorName}
```

**Related Components**:

- `src/components/tabs/VendorTab.jsx` - Main vendor interface
- `src/components/tabs/IKnowMappingTab.jsx` - iKnow integration
- `src/utils/iknowParser.js` - iKnow XML parser
- `src/utils/ronlHelper.js` - RONL vocabulary queries

---

## 🏗️ Architecture

### Rules--Policy--Parameters (RPP) Separation

The editor implements the **RPP architectural pattern** for Business Rule Management:

| Layer             | Color  | Description                                             | Examples                          |
| ----------------- | ------ | ------------------------------------------------------- | --------------------------------- |
| **Rules** 🔵      | Blue   | Executable decision logic that operationalizes policies | Eligibility checks, calculations  |
| **Policy** 🟣     | Purple | Normative values derived from laws                      | Legal thresholds, mandated rates  |
| **Parameters** 🟢 | Green  | Configurable values that tune rules                     | Regional rates, pilot adjustments |

**Benefits:**

- **Legal Traceability:** Law → Policy → Rule → Parameter → Decision
- **Organizational Agility:** Adjust parameters without changing rules or laws
- **Governance:** Clear ownership and approval workflows per layer

**Documentation:** See [`docs/RULES-POLICY-PARAMETERS-SEPARATION.md`](docs/RULES-POLICY-PARAMETERS-SEPARATION.md)

### Code Architecture (v1.5.1)

**Modularization Journey:**

- **v1.0:** Monolithic App.js
- **v1.3:** Component extraction
- **v1.5.1:** Full modularization

**Key Modules:**

- **`useEditorState.js`** - State management hook
- **`ttlGenerator.js`** - TTL generation class
- **`importHandler.js`** - Import logic
- **`useArrayHandlers.js`** - DRY array operations

**Documentation:** See [`docs/PROJECT-STRUCTURE.md`](docs/PROJECT-STRUCTURE.md)

---

## 📚 Standards Compliance

### CPSV-AP 3.2.0 ✅

The editor generates TTL files compliant with the **Core Public Service Vocabulary Application Profile 3.2.0**.

**Compliance Status:**

- ✅ All mandatory properties implemented
- ✅ Correct class types (cv:PublicOrganisation, cpsv:PublicService)
- ✅ Proper relationships (cv:hasLegalResource, cv:hasCompetentAuthority)
- ✅ Mandatory identifiers for all entities

**Documentation:** See [`docs/FIELD-MAPPING-CPSV-AP-3_2_0.md`](docs/FIELD-MAPPING-CPSV-AP-3_2_0.md)

### Dutch Extensions

**RONL (Regels Overheid Nederland):**

- `ronl:TemporalRule` - Time-bounded rules
- `ronl:ParameterWaarde` - Configuration parameters
- `ronl:validFrom` / `ronl:validUntil` - Temporal validity
- `ronl:confidenceLevel` - Rule confidence tracking
- `ronl:extends` - Rule versioning chains

**CPRMV (Core Public Rule Management Vocabulary):**

- `cprmv:Rule` - Normative rules from legislation
- `cprmv:definition` - Full legal text
- `cprmv:situatie` - Situational context
- `cprmv:norm` - Normative value
- `cprmv:ruleIdPath` - Legal source path
- `cprmv:DecisionModel` - DMN model linking

**Documentation:** See [`docs/NAMESPACE-PROPERTIES.md`](docs/NAMESPACE-PROPERTIES.md)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 14+ and npm
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ttl-editor.git
cd ttl-editor

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
# Create optimized production build
npm run build

# The build folder contains the static files
```

---

## 📖 Usage Guide

### Quick Start

1. **Fill in Service Details** - Basic service metadata
2. **Add Organization** - Competent authority information
3. **Link Legal Resource** - BWB ID or legal document
4. **Define Rules** - Decision logic (optional)
5. **Add Parameters** - Configuration values (optional)
6. **Add Policy** - CPRMV normative rules (optional)
7. **Validate** - Check for errors
8. **Download TTL** - Export compliant RDF/Turtle file

### Import Existing Files

- Click **"Import TTL File"** button
- Select a `.ttl` file
- All fields populate automatically
- Edit and re-export for round-trip editing

### DMN Integration

1. **DMN Tab** - Upload `.dmn` file
2. **Deploy** - Send to Operaton rule engine
3. **Test** - Evaluate with sample data
4. **Export** - TTL includes DMN metadata and rules

### iKnow Integration

1. **iKnow Tab** - Upload iKnow XML export
2. **Configure Mapping** - Map XML fields to CPSV-AP
3. **Preview** - Review mapped data
4. **Import** - Populate editor tabs

---

## 🛠️ Development

### Project Structure

```
ttl-editor/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   └── tabs/         # Tab components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Business logic
│   ├── data/             # Configuration data
│   └── config/           # App configuration
├── docs/                  # Documentation
└── package.json
```

### Key Technologies

- **React 18.3.1** - UI framework
- **Tailwind CSS 3** - Styling
- **Lucide React** - Icons
- **RDF/Turtle** - Semantic web standards

### Code Style

- ESLint for code quality
- Prettier for formatting
- Functional components with hooks
- Modular architecture

---

## 🚢 Deployment

### Production Deployment

The application is deployed to:

- **Production:** https://cpsv.open-regels.nl
- **Acceptance:** https://acc.cpsv.open-regels.nl

### Manual Deployment

```bash
# Build
npm run build

# Deploy build/ folder to your hosting provider
```

### Environment Variables

No environment variables required - fully client-side application.

---

## 🗺️ Roadmap

### Completed Features ✅

- ✅ CPSV-AP 3.2.0 compliance (v1.4.0)
- ✅ DMN integration (v1.5.0)
- ✅ iKnow integration (v1.5.0)
- ✅ Full modularization (v1.5.1)
- ✅ RPP architecture visualization (v1.5.1)

### Planned Features 🔜

**Phase B: RPP Deep Integration**

- Cross-references between layers
- "This rule implements Policy X" indicators
- "This parameter is used by Rules Y, Z" tracking
- Traceability visualization
- Impact analysis

**Phase C - Governance Features (Optional)**

- Add approval workflows
- Layer-specific validation
- Separate exports

**Phase 2: Extended CPSV-AP**

- Channel support (cv:Channel)
- Contact points (cv:ContactPoint)
- Criteria requirements
- Evidence requirements
- Agent relationships

**Phase 3: Advanced Features**

- Multi-language support
- Collaboration features
- Version control integration
- Automated testing
- Quality metrics

See [`src/data/roadmap.json`](src/data/roadmap.json) for detailed roadmap.

---

## 📚 Documentation

### User Documentation

- **[README.md](README.md)** - This file, project overview

### Technical Documentation

## Documentation

- **[DMN Testing Suite](docs/DMN_TESTS.md)** - Comprehensive guide to intermediate tests and test cases upload
- **[DMN Integration](docs/DMN-INTEGRATION-DOCUMENTATION-v1.5.1.md)** - DMN deployment and evaluation
- **[Field Mapping: CPSV-AP 3.2.0](docs/FIELD-MAPPING-CPSV-AP-3.2.0.md)** - Complete property mappings
- **[FIELD-MAPPING-CPSV-AP-3_2_0.md](docs/FIELD-MAPPING-CPSV-AP-3_2_0.md)** - UI field to TTL property mapping
- **[NAMESPACE-PROPERTIES.md](docs/NAMESPACE-PROPERTIES.md)** - RDF namespace reference
- **[PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)** - Code organization
- **[VOCABULARY-INSTRUCTIONS.md](docs/VOCABULARY-INSTRUCTIONS.md)** - Vocabulary usage guide
- **[RULES-POLICY-PARAMETERS-SEPARATION.md](docs/RULES-POLICY-PARAMETERS-SEPARATION.md)** - RPP architecture pattern

### Architecture Documentation

- **[ARCHITECTURE-VISUAL.md](docs/ARCHITECTURE-VISUAL.md)** - Visual architecture diagrams
- **[REFERENCE-ARCHITECTURE-SEMANTIC-MEDIATION.md](docs/REFERENCE-ARCHITECTURE-SEMANTIC-MEDIATION.md)** - Semantic mediation patterns

---

## 🤝 Contributing

This is a Dutch government project. For contributions or questions:

1. Check existing issues
2. Create detailed bug reports or feature requests
3. Follow the code style guidelines
4. Submit pull requests to `acc` branch

---

## 📄 License

EUPL v. 1.2 License - See [LICENSE](./LICENSE) file for details

---

## 🔗 Links

- **Live Application:** https://cpsv.open-regels.nl
- **Acceptance Environment:** https://acc.cpsv.open-regels.nl
- **CPSV-AP Specification:** https://semiceu.github.io/CPSV-AP/
- **Wetten Overheid:** https://wetten.overheid.nl
- **CPRMV Documentation:** https://cprmv.open-regels.nl/docs
- **Operaton Engine:** https://operaton-doc.open-regels.nl

---

## 📞 Support

For support or questions about this project, please create an issue in the repository.

---

**Built with ❤️ for Dutch Government Services**

_Version 1.5.1 - January 2026_
