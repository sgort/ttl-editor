// parseTTL.enhanced.js - VERSION WITH DMN PRESERVATION (Option 3)
// Enhanced TTL parser with DMN block capture for round-trip preservation

import { detectEntityType, validatePrefixes } from './config/vocabularies.config.js';

/**
 * Enhanced TTL Parser with DMN block preservation
 * Handles multiple vocabulary prefixes and preserves DMN sections during import
 * @param {string} ttlContent - The TTL file content as a string
 * @returns {object} Parsed data structure for the editor
 */
export const parseTTLEnhanced = (ttlContent) => {
  try {
    const lines = ttlContent.split('\n');

    // Initialize result structure with proper property names
    const parsed = {
      service: {
        identifier: '',
        name: '',
        description: '',
        thematicArea: '',
        sector: '',
        keywords: '',
        language: 'nl',
      },
      organization: {
        identifier: '',
        name: '',
        homepage: '',
        spatial: '',
      },
      legalResource: {
        bwbId: '',
        version: '',
        title: '',
        description: '',
      },
      ronlAnalysis: '',
      ronlMethod: '',
      temporalRules: [],
      parameters: [],
      cprmvRules: [],
      vendorService: {
        selectedVendor: '',
        contact: {
          organizationName: '',
          contactPerson: '',
          email: '',
          phone: '',
          website: '',
          logo: '',
        },
        serviceNotes: '',
        technical: {
          serviceUrl: '',
          license: '',
          accessType: 'fair-use',
        },
        certification: {
          status: 'not-certified',
          certifiedBy: '',
          certifiedAt: '',
          certificationNote: '',
        },
      },
      concepts: [],
      cost: {
        identifier: '',
        value: '',
        currency: 'EUR',
        description: '',
      },
      output: {
        identifier: '',
        name: '',
        description: '',
        type: '',
      },

      // DMN preservation for Option 3
      importedDmnBlocks: null, // Raw TTL blocks (string)
      hasDmnData: false, // Detection flag

      // NEW: DMN validation metadata (for import)
      dmnValidationStatus: 'not-validated',
      dmnValidatedBy: '',
      dmnValidatedAt: '',
      dmnValidationNote: '',
    };

    // Validate prefixes (silent by default to reduce console noise)
    const prefixValidation = validatePrefixes(ttlContent, { silent: true });
    if (!prefixValidation.valid && !prefixValidation.silent) {
      console.warn('Prefix validation warnings:', prefixValidation.warnings);
    }

    // State tracking
    let currentSection = null;
    let currentRule = null;
    let currentParameter = null;
    let currentCprmvRule = null;
    let currentConcept = null;
    let currentSubject = null;
    let inContactPoint = false;

    // NEW: DMN block tracking
    let inDmnSection = false;
    let dmnLines = [];
    let dmnSectionStarted = false;

    // Helper function to extract values from TTL lines
    const extractValue = (property) => {
      // Try quoted string
      const quotedMatch = property.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/);
      if (quotedMatch) {
        return unescapeTTLString(quotedMatch[1]);
      }

      // Try URI
      const urlMatch = property.match(/<([^>]+)>/);
      if (urlMatch) {
        return decodeURIValue(urlMatch[1]);
      }

      // Try plain value
      const plainMatch = property.match(/^\s*([^\s;,.]+)/);
      if (plainMatch) {
        return plainMatch[1].replace(/\^\^xsd:\w+$/, '');
      }

      return '';
    };

    // Helper function to unescape TTL strings
    const unescapeTTLString = (str) => {
      if (!str) return '';
      return str
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    };

    // Helper function to decode URI components
    const decodeURIValue = (str) => {
      if (!str) return '';
      try {
        return decodeURI(str);
      } catch (e) {
        return str;
      }
    };

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const rawLine = lines[i]; // Keep original line with spacing

      // Capture comments and empty lines in DMN section
      if (inDmnSection && (line.startsWith('#') || line === '')) {
        dmnLines.push(rawLine);
        continue;
      }

      // Skip comments and empty lines for normal parsing
      if (line.startsWith('#') || line === '') continue;

      // Detect entity type using configuration
      const detectedType = detectEntityType(line);
      if (detectedType) {
        currentSection = detectedType;

        // Extract subject URI
        const subjectMatch = line.match(/<([^>]+)>/);
        if (subjectMatch) {
          currentSubject = subjectMatch[1];
        }

        // ========================================
        // DMN ENTITY DETECTION & CAPTURE (Option 3)
        // ========================================
        if (
          detectedType === 'dmnModel' ||
          detectedType === 'dmnInput' ||
          detectedType === 'dmnOutput' ||
          detectedType === 'dmnRule'
        ) {
          // Mark that we found DMN data
          if (!inDmnSection) {
            inDmnSection = true;
            // eslint-disable-next-line no-unused-vars
            dmnSectionStarted = true;
            parsed.hasDmnData = true;

            // Add section header if this is the first DMN entity
            if (dmnLines.length === 0) {
              dmnLines.push('');
              dmnLines.push('# ========================================');
              dmnLines.push('# DMN Decision Model (Preserved from import)');
              dmnLines.push('# ========================================');
              dmnLines.push('');
            }
          }

          // Capture the raw line
          dmnLines.push(rawLine);
          continue; // Skip to next line
        }

        // If we were in DMN section and now hit a non-DMN entity, close DMN section
        if (
          inDmnSection &&
          detectedType !== 'dmnModel' &&
          detectedType !== 'dmnInput' &&
          detectedType !== 'dmnOutput' &&
          detectedType !== 'dmnRule'
        ) {
          inDmnSection = false;
          // Add blank line after DMN section
          if (dmnLines.length > 0 && dmnLines[dmnLines.length - 1].trim() !== '') {
            dmnLines.push('');
          }
        }

        // Initialize entity-specific structures
        if (detectedType === 'temporalRule') {
          currentRule = {
            id: Date.now() + Math.random(),
            uri: currentSubject || '',
            extends: '',
            validFrom: '',
            validUntil: '',
            confidenceLevel: 'high',
            description: '',
            identifier: '',
            title: '',
          };
        } else if (detectedType === 'parameter') {
          currentParameter = {
            id: Date.now() + Math.random(),
            notation: '',
            label: '',
            value: '',
            unit: 'EUR',
            description: '',
            validFrom: '',
            validUntil: '',
          };
        } else if (detectedType === 'cprmvRule') {
          currentCprmvRule = {
            id: Date.now() + Math.random(),
            ruleId: '',
            rulesetId: '',
            definition: '',
            situatie: '',
            norm: '',
            ruleIdPath: '',
          };
        } else if (detectedType === 'concept') {
          const uriParts = currentSubject.split('/');
          const idCounter = parsed.concepts.length + 1;

          currentConcept = {
            id: idCounter,
            uri: currentSubject,
            variableName: uriParts[uriParts.length - 1],
            prefLabel: '',
            definition: '',
            notation: '',
            linkedTo: '',
            linkedToType: '',
            exactMatch: '',
            type: '',
          };
        }

        if (detectedType === 'cost') {
          // Don't pre-populate - let dct:identifier parsing handle it
        } else if (detectedType === 'output') {
          // Don't pre-populate - let dct:identifier parsing handle it
        }

        continue;
      }

      if (currentSection === 'vendorService') {
        // Parse ronl:implementedBy (vendor selection)
        if (line.includes('ronl:implementedBy')) {
          const match = line.match(/ronl:implementedBy\s+<([^>]+)>/);
          if (match) {
            parsed.vendorService.selectedVendor = match[1];
            console.log('Parsed vendor selection:', match[1]);
          }
        }

        // Parse schema:provider organization name
        if (line.includes('schema:name') && !inContactPoint) {
          parsed.vendorService.contact.organizationName = extractValue(
            line.split('schema:name')[1]
          );
        }

        // Parse logo
        if (line.includes('schema:image')) {
          const match = line.match(/schema:image\s+<([^>]+)>/);
          if (match) {
            parsed.vendorService.contact.logo = match[1];
          }
        }

        // Track if we're inside contactPoint
        if (line.includes('schema:contactPoint')) {
          inContactPoint = true;
        }

        // Parse contact point fields
        if (inContactPoint) {
          if (line.includes('schema:name')) {
            parsed.vendorService.contact.contactPerson = extractValue(line.split('schema:name')[1]);
          }
          if (line.includes('schema:email')) {
            parsed.vendorService.contact.email = extractValue(line.split('schema:email')[1]);
          }
          if (line.includes('schema:telephone')) {
            parsed.vendorService.contact.phone = extractValue(line.split('schema:telephone')[1]);
          }

          // Close contactPoint
          if (line.includes(']') && !line.includes('[')) {
            inContactPoint = false;
          }
        }

        // Parse website
        if (line.includes('foaf:homepage')) {
          const match = line.match(/foaf:homepage\s+<([^>]+)>/);
          if (match) {
            parsed.vendorService.contact.website = match[1];
          }
        }

        // Parse technical fields
        if (line.includes('schema:url')) {
          const match = line.match(/schema:url\s+<([^>]+)>/);
          if (match) {
            parsed.vendorService.technical.serviceUrl = match[1];
          }
        }

        if (line.includes('schema:license')) {
          parsed.vendorService.technical.license = extractValue(line.split('schema:license')[1]);
        }

        if (line.includes('ronl:accessType')) {
          parsed.vendorService.technical.accessType = extractValue(
            line.split('ronl:accessType')[1]
          );
        }

        // Parse service notes
        if (line.includes('dct:description')) {
          parsed.vendorService.serviceNotes = extractValue(line.split('dct:description')[1]);
        }

        // Parse certification fields
        if (line.includes('ronl:certificationStatus')) {
          parsed.vendorService.certification.status = extractValue(
            line.split('ronl:certificationStatus')[1]
          );
        }

        if (line.includes('ronl:certifiedBy')) {
          const match = line.match(/ronl:certifiedBy\s+<([^>]+)>/);
          if (match) {
            parsed.vendorService.certification.certifiedBy = match[1];
          }
        }

        if (line.includes('ronl:certifiedAt')) {
          parsed.vendorService.certification.certifiedAt = extractValue(
            line.split('ronl:certifiedAt')[1]
          );
        }

        if (line.includes('ronl:certificationNote')) {
          parsed.vendorService.certification.certificationNote = extractValue(
            line.split('ronl:certificationNote')[1]
          );
        }
      }

      if (inDmnSection) {
        // v2.0.0: Parse validation properties BEFORE preserving raw line
        if (currentSection === 'dmnModel') {
          // Parse validation metadata from DMN model lines
          if (line.includes('ronl:validationStatus')) {
            const value = extractValue(line.split('ronl:validationStatus')[1]) || 'not-validated';
            parsed.dmnValidationStatus = value;
            console.log('🔍 Parsed validationStatus:', value);
          }
          if (line.includes('ronl:validatedBy')) {
            const value = extractValue(line.split('ronl:validatedBy')[1]) || '';
            parsed.dmnValidatedBy = value;
            console.log('🔍 Parsed validatedBy:', value);
          }
          if (line.includes('ronl:validatedAt')) {
            const value = extractValue(line.split('ronl:validatedAt')[1]) || '';
            parsed.dmnValidatedAt = value;
            console.log('🔍 Parsed validatedAt:', value);
          }
          if (line.includes('ronl:validationNote')) {
            const value = extractValue(line.split('ronl:validationNote')[1]) || '';
            parsed.dmnValidationNote = value;
            console.log('🔍 Parsed validationNote:', value);
          }
        }

        // v2.0.0: Replace old namespace in raw line before preserving
        let processedLine = rawLine;
        if (rawLine.includes('ronl:implements ') && !rawLine.includes('ronl:validat')) {
          processedLine = rawLine.replace('ronl:implements', 'cprmv:implements');
          console.log('🔄 Converted ronl:implements → cprmv:implements');
        }
        if (rawLine.includes('ronl:implementedBy')) {
          processedLine = rawLine.replace('ronl:implementedBy', 'cprmv:implementedBy');
          console.log('🔄 Converted ronl:implementedBy → cprmv:implementedBy');
        }

        // Preserve processed line for round-trip
        dmnLines.push(processedLine);
        continue;
      }

      // Parse properties based on current section
      if (currentSection === 'service') {
        // Extract service identifier from subject URI
        if (!parsed.service.identifier && currentSubject) {
          const parts = currentSubject.split('/');
          parsed.service.identifier = parts[parts.length - 1];
        }

        if (line.includes('dct:title')) {
          parsed.service.name = extractValue(line.split('dct:title')[1]) || parsed.service.name;
        }
        if (line.includes('dct:description')) {
          parsed.service.description =
            extractValue(line.split('dct:description')[1]) || parsed.service.description;
        }
        if (line.includes('thematicArea')) {
          parsed.service.thematicArea =
            extractValue(line.split('thematicArea')[1]) || parsed.service.thematicArea;
        }
        if (line.includes('sector')) {
          parsed.service.sector = extractValue(line.split('sector')[1]) || parsed.service.sector;
        }
        if (line.includes('dcat:keyword')) {
          parsed.service.keywords =
            extractValue(line.split('dcat:keyword')[1]) || parsed.service.keywords;
        }
        if (line.includes('dct:language')) {
          const uriMatch = line.match(/<([^>]+)>/);
          if (uriMatch) {
            const langCode = uriMatch[1].split('/').pop().toLowerCase();
            parsed.service.language = langCode;
          }
        }
      }

      if (currentSection === 'organization') {
        // Extract organization identifier from subject URI
        if (!parsed.organization.identifier && currentSubject) {
          parsed.organization.identifier = currentSubject;
        }

        // Handle both skos:prefLabel and foaf:name
        if (line.includes('skos:prefLabel')) {
          parsed.organization.name =
            extractValue(line.split('skos:prefLabel')[1]) || parsed.organization.name;
        }
        if (line.includes('foaf:name')) {
          parsed.organization.name =
            extractValue(line.split('foaf:name')[1]) || parsed.organization.name;
        }
        if (line.includes('org:name')) {
          parsed.organization.name =
            extractValue(line.split('org:name')[1]) || parsed.organization.name;
        }
        if (line.includes('foaf:homepage')) {
          parsed.organization.homepage =
            extractValue(line.split('foaf:homepage')[1]) || parsed.organization.homepage;
        }
        if (line.includes('cv:spatial')) {
          const spatialMatch = line.match(/<([^>]+)>/);
          if (spatialMatch) {
            parsed.organization.spatial = spatialMatch[1];
          }
        }

        // Logo parsing
        if (line.includes('foaf:logo') || line.includes('schema:image')) {
          const logoMatch = line.match(/<([^>]+)>/);
          if (logoMatch) {
            // Store the logo URL (will be external URL or asset reference)
            parsed.organization.logo = logoMatch[1];
          }
        }
      }

      if (currentSection === 'legalResource') {
        // Save the full URI as identifier
        if (!parsed.legalResource.bwbId && currentSubject) {
          parsed.legalResource.bwbId = currentSubject;
        }

        if (line.includes('dct:title')) {
          parsed.legalResource.title =
            extractValue(line.split('dct:title')[1]) || parsed.legalResource.title;
        }
        if (line.includes('dct:description')) {
          parsed.legalResource.description =
            extractValue(line.split('dct:description')[1]) || parsed.legalResource.description;
        }

        // v2.0.0: Support both ronl: (legacy) and cprmv: (current)
        if (line.includes('hasAnalysis')) {
          // Match either ronl:hasAnalysis or cprmv:hasAnalysis
          const match = line.match(/(?:ronl|cprmv):hasAnalysis\s+(?:<([^>]+)>|(\S+))/);
          if (match) {
            parsed.ronlAnalysis = match[1] || match[2];
            console.log('Parsed RONL Analysis:', parsed.ronlAnalysis);
          }
        }

        if (line.includes('hasMethod')) {
          // Match either ronl:hasMethod or cprmv:hasMethod
          const match = line.match(/(?:ronl|cprmv):hasMethod\s+(?:<([^>]+)>|(\S+))/);
          if (match) {
            parsed.ronlMethod = match[1] || match[2];
            console.log('Parsed RONL Method:', parsed.ronlMethod);
          }
        }

        // Extract version date from eli:is_realized_by
        if (line.includes('eli:is_realized_by')) {
          const uriMatch = line.match(/<([^>]+)>/);
          if (uriMatch) {
            const dateMatch = uriMatch[1].match(/(\d{4}-\d{2}-\d{2})$/);
            if (dateMatch) {
              parsed.legalResource.version = dateMatch[1];
            }
          }
        }
      }

      // Temporal rule properties
      if (currentSection === 'temporalRule' && currentRule) {
        if (line.includes('extends')) {
          currentRule.extends = extractValue(line.split('extends')[1]) || currentRule.extends;
        }
        if (line.includes('validFrom')) {
          currentRule.validFrom = extractValue(line.split('validFrom')[1]) || currentRule.validFrom;
        }
        if (line.includes('validUntil')) {
          currentRule.validUntil =
            extractValue(line.split('validUntil')[1]) || currentRule.validUntil;
        }
        if (line.includes('confidenceLevel') || line.includes('confidence')) {
          currentRule.confidenceLevel =
            extractValue(line.split(/confidence/)[1]) || currentRule.confidenceLevel;
        }
        if (line.includes('dct:description')) {
          currentRule.description =
            extractValue(line.split('dct:description')[1]) || currentRule.description;
        }
        if (line.includes('dct:identifier')) {
          currentRule.identifier =
            extractValue(line.split('dct:identifier')[1]) || currentRule.identifier;
        }
        if (line.includes('dct:title')) {
          currentRule.title = extractValue(line.split('dct:title')[1]) || currentRule.title;
        }

        if (line.includes('.') && !line.includes(';')) {
          parsed.temporalRules.push(currentRule);
          currentRule = null;
          currentSection = null;
        }
      }

      // Parameter properties
      if (currentSection === 'parameter' && currentParameter) {
        if (line.includes('skos:prefLabel')) {
          currentParameter.label =
            extractValue(line.split('skos:prefLabel')[1]) || currentParameter.label;
        }
        if (line.includes('skos:notation')) {
          currentParameter.notation =
            extractValue(line.split('skos:notation')[1]) || currentParameter.notation;
        }
        if (line.includes('schema:value')) {
          const valueStr = extractValue(line.split('schema:value')[1]);
          if (valueStr) currentParameter.value = valueStr.replace(/\^\^xsd:decimal$/, '');
        }
        if (line.includes('schema:unitCode')) {
          currentParameter.unit =
            extractValue(line.split('schema:unitCode')[1]) || currentParameter.unit;
        }
        if (line.includes('dct:description')) {
          currentParameter.description =
            extractValue(line.split('dct:description')[1]) || currentParameter.description;
        }
        if (line.includes('validFrom')) {
          currentParameter.validFrom =
            extractValue(line.split('validFrom')[1]) || currentParameter.validFrom;
        }
        if (line.includes('validUntil')) {
          currentParameter.validUntil =
            extractValue(line.split('validUntil')[1]) || currentParameter.validUntil;
        }

        if (line.includes('.') && !line.includes(';')) {
          parsed.parameters.push(currentParameter);
          currentParameter = null;
          currentSection = null;
        }
      }

      // Concept properties
      if (currentSection === 'concept' && currentConcept) {
        if (line.includes('skos:prefLabel')) {
          currentConcept.prefLabel =
            extractValue(line.split('skos:prefLabel')[1]) || currentConcept.prefLabel;
        }
        if (line.includes('skos:definition')) {
          currentConcept.definition =
            extractValue(line.split('skos:definition')[1]) || currentConcept.definition;
        }
        if (line.includes('skos:notation')) {
          currentConcept.notation =
            extractValue(line.split('skos:notation')[1]) || currentConcept.notation;
        }
        if (line.includes('dct:subject')) {
          const subjectUri = extractValue(line.split('dct:subject')[1]);
          if (subjectUri) {
            // Extract linkedTo from URI: .../dmn/input/1 → "input/1"
            const match = subjectUri.match(/\/dmn\/(input|output)\/(\d+)/);
            if (match) {
              currentConcept.linkedToType = match[1];
              currentConcept.linkedTo = `${match[1]}/${match[2]}`;
            }
          }
        }
        if (line.includes('dct:type')) {
          currentConcept.type = extractValue(line.split('dct:type')[1]) || currentConcept.type;
        }
        if (line.includes('skos:exactMatch')) {
          currentConcept.exactMatch =
            extractValue(line.split('skos:exactMatch')[1]) || currentConcept.exactMatch;
        }

        // End of concept definition
        if (line.includes('.') && !line.includes(';')) {
          parsed.concepts.push(currentConcept);
          currentConcept = null;
          currentSection = null;
        }
      }

      // Cost properties
      if (currentSection === 'cost') {
        if (line.includes('dct:identifier')) {
          parsed.cost.identifier = extractValue(line.split('dct:identifier')[1]);
        }
        if (line.includes('cv:value')) {
          parsed.cost.value = extractValue(line.split('cv:value')[1]);
        }
        if (line.includes('cv:currency')) {
          parsed.cost.currency = extractValue(line.split('cv:currency')[1]);
        }
        if (line.includes('dct:description')) {
          parsed.cost.description = extractValue(line.split('dct:description')[1]);
        }

        if (line.includes('.') && !line.includes(';')) {
          currentSection = null;
        }
      }

      // Output properties
      if (currentSection === 'output') {
        if (line.includes('dct:identifier')) {
          parsed.output.identifier = extractValue(line.split('dct:identifier')[1]);
        }
        if (line.includes('dct:title')) {
          parsed.output.name = extractValue(line.split('dct:title')[1]);
        }
        if (line.includes('dct:description')) {
          parsed.output.description = extractValue(line.split('dct:description')[1]);
        }
        if (line.includes('dct:type')) {
          parsed.output.type = extractValue(line.split('dct:type')[1]);
        }

        if (line.includes('.') && !line.includes(';')) {
          currentSection = null;
        }
      }

      // CPRMV Rule properties
      if (currentSection === 'cprmvRule' && currentCprmvRule) {
        if (line.includes('cprmv:id')) {
          currentCprmvRule.ruleId =
            extractValue(line.split('cprmv:id')[1]) || currentCprmvRule.ruleId;
        }
        if (line.includes('cprmv:rulesetId')) {
          currentCprmvRule.rulesetId =
            extractValue(line.split('cprmv:rulesetId')[1]) || currentCprmvRule.rulesetId;
        }
        if (line.includes('cprmv:definition')) {
          currentCprmvRule.definition =
            extractValue(line.split('cprmv:definition')[1]) || currentCprmvRule.definition;
        }
        if (line.includes('cprmv:situatie')) {
          currentCprmvRule.situatie =
            extractValue(line.split('cprmv:situatie')[1]) || currentCprmvRule.situatie;
        }
        if (line.includes('cprmv:norm')) {
          currentCprmvRule.norm =
            extractValue(line.split('cprmv:norm')[1]) || currentCprmvRule.norm;
        }
        if (line.includes('cprmv:ruleIdPath')) {
          currentCprmvRule.ruleIdPath =
            extractValue(line.split('cprmv:ruleIdPath')[1]) || currentCprmvRule.ruleIdPath;
        }

        if (line.includes('.') && !line.includes(';')) {
          parsed.cprmvRules.push(currentCprmvRule);
          currentCprmvRule = null;
          currentSection = null;
        }
      }
    }

    // NEW: Store raw DMN blocks if any were captured
    if (parsed.hasDmnData && dmnLines.length > 0) {
      parsed.importedDmnBlocks = dmnLines.join('\n');
      console.log('✅ DMN data detected and preserved:', dmnLines.length, 'lines');

      // NEW: Log validation metadata summary
      console.log('📋 DMN Validation Metadata Parsed:', {
        status: parsed.dmnValidationStatus,
        validatedBy: parsed.dmnValidatedBy,
        validatedAt: parsed.dmnValidatedAt,
        hasNote: !!parsed.dmnValidationNote,
      });
    }

    return parsed;
  } catch (error) {
    console.error('Enhanced parse error:', error);
    throw new Error('Failed to parse TTL file. Please ensure it follows CPSV-AP format.');
  }
};

// Export as default for easy import
export default parseTTLEnhanced;
