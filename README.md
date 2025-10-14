# Public Service TTL Editor

**Generate RDF/Turtle files for government services following CPSV-AP and CPRMV standards**

🌐 **Live Application:** [ttl.open-regels.nl](https://ttl.open-regels.nl)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Standards & Specifications](#standards--specifications)
- [Development](#development)
- [Deployment](#deployment)
- [Enhancements Timeline](#enhancements-timeline)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The Public Service TTL Editor is a web-based application designed to simplify the creation and management of RDF/Turtle files for government services. It provides an intuitive interface for creating service definitions that comply with:

- **CPSV-AP 3.0** - Core Public Service Vocabulary Application Profile (EU standard)
- **CPRMV 0.3.0** - Core Public Rule Management Vocabulary (Dutch extensions)
- **RONL Vocabulary** - Regels Overheid Nederland custom namespace

### Purpose

Part of the **RONL (Regels Overheid Nederland)** initiative, this tool enables government organizations to:
- Document public services with structured metadata
- Define temporal rules for service regulations
- Link services to legal resources (BWB laws)
- Generate valid RDF/Turtle files for publication on regels.overheid.nl

### Example Use Case

**AOW (Algemene Ouderdomswet)** - Dutch Old Age Pension age calculation service definition with temporal rules for changing retirement ages.

---

## ✨ Features

### Core Functionality

#### 1. **Multi-Tab Form Interface**
- **Service Tab**: Core service information (identifier, name, description, thematic area, sector, keywords)
- **Organization Tab**: Competent authority details (name, identifier, homepage)
- **Legal Tab**: Legal resource linkage (BWB law IDs, versions, titles)
- **Rules Tab**: Temporal rules with CPRMV extensions (validity periods, confidence levels)
- **Preview Tab**: Real-time TTL output preview with syntax highlighting

#### 2. **Import Functionality** ✅ *NEW*
- Load existing `.ttl` files for editing
- Automatic form population from TTL content
- Intelligent parsing of CPSV-AP/CPRMV structures
- Support for multiple temporal rules
- Handles escaped characters and special formatting

#### 3. **Export Functionality**
- Download generated TTL files
- Proper RDF/Turtle syntax with all required namespaces
- Automatic escaping of special characters
- URI encoding for identifiers with spaces
- Sanitized filenames for downloads

#### 4. **Validation**
- Form field validation
- Pattern matching for BWB IDs (e.g., BWBR0002820)
- Required field checking
- Real-time feedback on validation errors

#### 5. **Dynamic Temporal Rules**
- Add/remove temporal rules dynamically
- CPRMV properties support:
  - `ronl:extends` - Rule inheritance
  - `ronl:validFrom` - Start date
  - `ronl:validUntil` - End date
  - `ronl:confidenceLevel` - High/Medium/Low confidence
- Date pickers for easy input
- Description fields for documentation

### Technical Features

- **Character Escaping**: Proper handling of quotes, newlines, and special characters in TTL strings
- **URI Encoding**: Automatic encoding of spaces and special characters in URIs
- **Real-time Preview**: Live TTL generation as you type
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean interface with Tailwind CSS styling
- **Icon Integration**: Lucide React icons for visual clarity

---

## 🛠 Technology Stack

### Frontend Framework
- **React 18.3.1** - UI library for component-based architecture
- **Create React App** - Zero-config build setup

### Styling
- **Tailwind CSS 3.x** - Utility-first CSS framework
- Custom configuration for consistent design system

### Icons & UI Components
- **Lucide React 0.263.1** - Modern icon library
- Custom form components with validation

### Build & Deployment
- **Azure Static Web Apps** - Hosting platform
- **GitHub Actions** - CI/CD pipeline for automatic deployments
- **Custom Domain** - ttl.open-regels.nl with SSL

### Standards Compliance
- **W3C Turtle** - RDF serialization format
- **CPSV-AP 3.0** - EU Core Public Service Vocabulary
- **CPRMV 0.3.0** - Dutch rule management extensions
- **ELI Ontology** - European Legislation Identifier

---

## 📁 Project Structure

```
ttl-editor/
├── public/
│   ├── index.html           # HTML template with updated title
│   ├── favicon.svg          # Custom TTL Editor favicon
│   └── manifest.json        # PWA manifest
├── src/
│   ├── App.js              # Main application component
│   ├── index.js            # React entry point
│   ├── index.css           # Tailwind directives
│   └── App.css             # Additional styles
├── .eslintrc.json          # ESLint configuration
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
├── README.md               # This file
└── .github/
    └── workflows/
        └── azure-static-web-apps-*.yml  # CI/CD pipeline
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Git**

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

This creates an optimized production build in the `build/` directory.

---

## 📖 Usage Guide

### Creating a New Service

1. **Service Information**
   - Enter a unique service identifier (e.g., `aow-leeftijd`)
   - Provide service name and description
   - Add thematic area, sector, and keywords
   - Select language (Nederlands/English)

2. **Organization Details**
   - Specify organization identifier
   - Enter organization name
   - Add homepage URL

3. **Legal Resource**
   - Input BWB law ID (format: `BWBR0002820`)
   - Specify version date
   - Add legal title and description

4. **Temporal Rules**
   - Add one or more temporal rules
   - Define rule URIs and inheritance (`extends`)
   - Set validity periods (`validFrom`, `validUntil`)
   - Choose confidence level
   - Document rule descriptions

5. **Preview & Download**
   - Switch to Preview tab to see generated TTL
   - Click "Validate" to check for errors
   - Click "Download TTL" to save the file

### Importing Existing Services

1. **Click "Import TTL File"** button in header
2. **Select a `.ttl` file** from your computer
3. **All form fields populate automatically**
4. **Edit as needed** and download updated version

### Example: Importing an AOW Service

```turtle
@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://regels.overheid.nl/services/aow-leeftijd> a cpsv:PublicService ;
    dct:title "AOW Leeftijdsbepaling"@nl ;
    dct:description "Berekening van de AOW-leeftijd"@nl .
```

When imported, the Service tab will show:
- Identifier: `aow-leeftijd`
- Name: `AOW Leeftijdsbepaling`
- Description: `Berekening van de AOW-leeftijd`

---

## 📚 Standards & Specifications

### CPSV-AP (Core Public Service Vocabulary Application Profile)

European standard for describing public services:
- Service metadata (title, description, type)
- Organization relationships (`hasCompetentAuthority`)
- Legal basis (`follows`)
- Costs and outputs

**Documentation:** [CPSV-AP Specification](https://semiceu.github.io/CPSV-AP/)

### CPRMV (Core Public Rule Management Vocabulary)

Dutch extensions for rule management:
- Temporal rules with validity periods
- Rule inheritance and versioning
- Confidence levels for regulations

### Namespaces Used

```turtle
@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix eli: <http://data.europa.eu/eli/ontology#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix org: <http://www.w3.org/ns/org#> .
@prefix ronl: <https://regels.overheid.nl/termen/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
```

### Reference Documentation

- **NAMESPACE-PROPERTIES.md**: [View on GitLab](https://git.open-regels.nl/showcases/aow/-/blob/main/NAMESPACE-PROPERTIES.md)
- Complete property reference and patterns
- Examples and use cases

---

## 💻 Development

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server (with hot reload)
npm start

# Run in development mode
# Changes will automatically reload
```

### Code Quality

The project uses ESLint for code quality:

```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

**ESLint Configuration:**
- Based on `react-app` preset
- Custom rules for unused variables (underscore prefix)
- Configuration in `.eslintrc.json`

### Adding New Features

1. **Update State**: Add new state variables in `App.js`
2. **Create Form Section**: Add render function for new tab
3. **Update TTL Generator**: Add new properties to `generateTTL()`
4. **Update Parser**: Add parsing logic to `parseTTL()`
5. **Test**: Test creation, download, and re-import

### Testing Workflow

1. **Create** a service with all fields filled
2. **Download** the TTL file
3. **Clear** the form (refresh page)
4. **Import** the downloaded file
5. **Verify** all fields are correctly restored

---

## 🚢 Deployment

### Azure Static Web Apps

The application is deployed to Azure Static Web Apps with automatic CI/CD.

#### Deployment Configuration

- **Platform**: Azure Static Web Apps
- **Plan**: Free tier (100 GB bandwidth/month)
- **Domain**: ttl.open-regels.nl
- **SSL**: Automatic HTTPS enabled

#### Deployment Process

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Automatic Build** via GitHub Actions
   - Triggers on push to `main` branch
   - Runs `npm run build`
   - Deploys to Azure

3. **Live in 2-3 minutes**

#### GitHub Actions Workflow

Located in `.github/workflows/azure-static-web-apps-*.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "build"
```

#### Manual Deployment via Azure Portal

See deployment guide for step-by-step instructions using Azure Portal.

---

## 📈 Enhancements Timeline

### Phase 1: Initial Build ✅ *COMPLETED*

**Date**: Initial Development

**Features Implemented:**
- React application with Create React App
- Tailwind CSS v3 configuration
- Basic 5-tab form interface (Service, Organization, Legal, Rules, Preview)
- TTL generation with proper namespaces
- Download functionality
- Basic validation (BWB ID pattern matching)
- Temporal rules management (add/remove)
- Real-time preview

**Deliverables:**
- Working application on localhost:3000
- Clean, professional UI with Tailwind styling
- Lucide React icons integration

---

### Phase 2: Production Deployment ✅ *COMPLETED*

**Date**: Deployment Phase

**Enhancements:**
1. **Azure Static Web Apps Deployment**
   - Automated CI/CD via GitHub Actions
   - Free tier hosting
   - Custom domain setup (ttl.open-regels.nl)
   - SSL certificate configuration

2. **Code Quality Improvements**
   - ESLint configuration (`.eslintrc.json`)
   - Unused variable handling with underscore prefix
   - Clean build with no warnings

3. **Branding Updates**
   - Browser tab title: "Public Service TTL Editor"
   - Custom favicon for TTL Editor
   - Footer link to GitLab documentation

**Deliverables:**
- Live application at ttl.open-regels.nl
- Automated deployments on git push
- Professional branding and appearance

---

### Phase 3: Import Functionality ✅ *COMPLETED*

**Date**: Enhancement Phase 1

**Features Implemented:**
1. **TTL File Import**
   - "Import TTL File" button in header
   - File picker for `.ttl` files
   - Automatic parsing of CPSV-AP/CPRMV structures
   - Form population from imported data

2. **Advanced TTL Parser**
   - Extracts service information
   - Parses organization details
   - Reads legal resources
   - Handles multiple temporal rules
   - Supports cost and output data

3. **Character Handling**
   - String escaping for special characters
   - Quote escaping: `"` → `\"`
   - URI encoding for spaces: ` ` → `%20`
   - Proper unescape when importing

4. **User Experience**
   - Success/error status messages
   - Visual feedback with icons
   - Auto-dismiss notifications
   - Automatic tab switching after import

**Technical Improvements:**
- `escapeTTLString()` function for output
- `unescapeTTLString()` function for input
- `encodeURIComponent()` for URI handling
- `decodeURIComponent()` for parsing
- Improved regex for quoted strings
- Filename sanitization for downloads

**Deliverables:**
- Full round-trip editing (export → import → edit → export)
- W3C Turtle specification compliance
- Handles edge cases (quotes, newlines, special chars)

---

### Phase 4: Planned Enhancements 🔜 *UPCOMING*

#### 4.1 Template System
- Pre-fill forms from AOW example
- Save custom templates
- Template library for common services
- Quick-start options

#### 4.2 Browser Storage
- Auto-save to localStorage
- Restore progress on reload
- Prevent data loss
- Session management

#### 4.3 Additional Form Sections
- **Channel**: Service delivery channels
- **Contact**: Contact information (email, phone, URL)
- **DMN Distribution**: Decision Model files

#### 4.4 Advanced Validation
- Field-level error messages
- Real-time validation feedback
- Pattern enforcement
- Required field indicators
- Validation summary

#### 4.5 Export Options
- JSON export format
- YAML export format
- Multiple format support
- Format conversion

#### 4.6 DMN File Upload
- Upload DMN XML files
- Link to services
- DMN file validation
- Distribution metadata

#### 4.7 Multi-Service Management
- Manage multiple services in one session
- Service list view
- Switch between services
- Bulk operations

---


### Reporting Issues

Create an issue on the repository with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment details

---

## 🔗 Links

- **Live Application**: [ttl.open-regels.nl](https://ttl.open-regels.nl)
- **GitLab Repository**: [showcases/aow](https://git.open-regels.nl/showcases/aow)
- **Documentation**: [NAMESPACE-PROPERTIES.md](https://git.open-regels.nl/showcases/aow/-/blob/main/NAMESPACE-PROPERTIES.md)
- **CPSV-AP Specification**: [https://semiceu.github.io/CPSV-AP/](https://semiceu.github.io/CPSV-AP/)

---

## 📧 Contact

For questions, feedback, or contributions regarding the Public Service TTL Editor, please reach out through the GitLab repository.

---

**Last Updated**: October 2025

**Version**: 1.0.0 (with Import Functionality)

---

*Built with ❤️ for transparent and accessible government services*