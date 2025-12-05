// parseTTL.enhanced.js - CLEANED VERSION (No ESLint Warnings)
// Enhanced TTL parser with vocabulary configuration support

import { detectEntityType, validatePrefixes } from './vocabularies.config.js';

/**
 * Enhanced TTL Parser with vocabulary configuration support
 * Handles multiple vocabulary prefixes (cpsv/cpsv-ap, org/foaf, etc.)
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
        keywords: '', // Note: 'keywords' not 'keyword'
        language: 'nl',
      },
      organization: {
        identifier: '',
        name: '', // Note: 'name' not 'prefLabel'
        homepage: '',
      },
      legalResource: {
        bwbId: '',
        version: '',
        title: '',
        description: '',
      },
      temporalRules: [],
      parameters: [],
      cprmvRules: [],
      cost: {
        value: '',
        currency: 'EUR',
        description: '',
      },
      output: {
        name: '',
        description: '',
        type: '',
      },
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
    let currentSubject = null;

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

      // Try plain value (fixed regex - no unnecessary escape)
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

      // Skip comments and empty lines
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
        }
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
          // Handle both cv: and cpsv-ap: prefixes
          parsed.service.thematicArea =
            extractValue(line.split('thematicArea')[1]) || parsed.service.thematicArea;
        }
        if (line.includes('sector')) {
          // Handle both cv: and cpsv-ap: prefixes
          parsed.service.sector = extractValue(line.split('sector')[1]) || parsed.service.sector;
        }
        if (line.includes('dcat:keyword')) {
          parsed.service.keywords =
            extractValue(line.split('dcat:keyword')[1]) || parsed.service.keywords;
        }
        if (line.includes('dct:language')) {
          parsed.service.language =
            extractValue(line.split('dct:language')[1]) || parsed.service.language;
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
      }

      if (currentSection === 'legalResource') {
        // Save the full URI as identifier (like Organization does)
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

        // Extract version date from eli:is_realized_by
        // Format: eli:is_realized_by <https://wetten.overheid.nl/BWBR0002222/2025-12-03>
        if (line.includes('eli:is_realized_by')) {
          const uriMatch = line.match(/<([^>]+)>/);
          if (uriMatch) {
            // Extract date from end of URI (format: .../YYYY-MM-DD)
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

        // End of rule (period without semicolon)
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

        // Check for end of rule (period without semicolon)
        if (line.includes('.') && !line.includes(';')) {
          parsed.cprmvRules.push(currentCprmvRule);
          currentCprmvRule = null;
          currentSection = null;
        }
      }
    }
    console.log('🔍 CPRMV DEBUG - Parsed rules:', parsed.cprmvRules); // ← ADD THIS ONE LINE

    return parsed;
  } catch (error) {
    console.error('Enhanced parse error:', error);
    throw new Error('Failed to parse TTL file. Please ensure it follows CPSV-AP format.');
  }
};

// Export as default for easy import
export default parseTTLEnhanced;
