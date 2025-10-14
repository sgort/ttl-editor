import React, { useState } from 'react';
import { Download, FileText, Building2, Scale, Clock, Plus, Trash2, Upload, FileUp, AlertCircle, CheckCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('service');
  const [importStatus, setImportStatus] = useState({ show: false, success: false, message: '' });

  // Service state
  const [service, setService] = useState({
    identifier: '',
    name: '',
    description: '',
    type: 'PublicService',
    sector: '',
    thematicArea: '',
    keyword: '',
    language: 'nl'
  });

  // Organization state
  const [organization, setOrganization] = useState({
    identifier: '',
    prefLabel: '',
    homepage: ''
  });

  // Legal state
  const [legalResource, setLegalResource] = useState({
    bwbId: '',
    version: '',
    title: '',
    description: ''
  });

  // Temporal rules state
  const [temporalRules, setTemporalRules] = useState([
    {
      id: 1,
      uri: '',
      extends: '',
      validFrom: '',
      validUntil: '',
      confidenceLevel: 'high',
      description: ''
    }
  ]);

  // Cost state
  const [cost, setCost] = useState({
    identifier: '',
    value: '',
    currency: 'EUR',
    description: ''
  });

  // Output state
  const [output, setOutput] = useState({
    identifier: '',
    name: '',
    description: '',
    type: ''
  });

  // Helper function to unescape TTL strings
  const unescapeTTLString = (str) => {
    if (!str) return '';
    return str
      .replace(/\\"/g, '"')      // Unescape double quotes
      .replace(/\\n/g, '\n')     // Unescape newlines
      .replace(/\\r/g, '\r')     // Unescape carriage returns
      .replace(/\\t/g, '\t')     // Unescape tabs
      .replace(/\\\\/g, '\\');   // Unescape backslashes (do this last)
  };

  // Helper function to decode URI components
  const decodeURIComponent = (str) => {
    if (!str) return '';
    try {
      return decodeURI(str);
    } catch (e) {
      return str;
    }
  };

  // Parse TTL file and extract values
  const parseTTL = (ttlContent) => {
    try {
      const lines = ttlContent.split('\n');
      const parsed = {
        service: { ...service },
        organization: { ...organization },
        legalResource: { ...legalResource },
        temporalRules: [],
        cost: { ...cost },
        output: { ...output }
      };

      let currentSection = null;
      let currentRule = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip comments and empty lines
        if (line.startsWith('#') || line === '') continue;

        // Detect sections
        if (line.includes('a cpsv:PublicService') || line.includes('a cpsv-ap:PublicService')) {
          currentSection = 'service';
        } else if (line.includes('a org:Organization')) {
          currentSection = 'organization';
        } else if (line.includes('a eli:LegalResource')) {
          currentSection = 'legalResource';
        } else if (line.includes('a ronl:TemporalRule')) {
          currentSection = 'temporalRule';
          currentRule = {
            id: Date.now() + Math.random(),
            uri: '',
            extends: '',
            validFrom: '',
            validUntil: '',
            confidenceLevel: 'high',
            description: ''
          };
        } else if (line.includes('a cv:Cost')) {
          currentSection = 'cost';
        } else if (line.includes('a cv:Output')) {
          currentSection = 'output';
        }

        // Extract identifier from subject
        if (line.startsWith('<') && line.includes('>') && currentSection) {
          const uriMatch = line.match(/<([^>]+)>/);
          if (uriMatch) {
            const fullUri = uriMatch[1];
            const identifier = decodeURIComponent(fullUri.split('/').pop().split('#').pop());
            
            if (currentSection === 'service') {
              parsed.service.identifier = identifier;
            } else if (currentSection === 'organization') {
              parsed.organization.identifier = identifier;
            } else if (currentSection === 'legalResource') {
              parsed.legalResource.bwbId = identifier;
            } else if (currentSection === 'temporalRule' && currentRule) {
              currentRule.uri = fullUri;
            } else if (currentSection === 'cost') {
              parsed.cost.identifier = identifier;
            } else if (currentSection === 'output') {
              parsed.output.identifier = identifier;
            }
          }
        }

        // Parse properties - improved to handle escaped quotes
        const extractValue = (propName) => {
          if (line.includes(propName)) {
            // Match quoted strings (including escaped quotes inside)
            const quotedMatch = line.match(/"((?:[^"\\]|\\.)*)"/);
            if (quotedMatch) {
              return unescapeTTLString(quotedMatch[1]);
            }
            // Match URIs
            const uriMatch = line.match(/<([^>]+)>/);
            if (uriMatch) return uriMatch[1];
          }
          return null;
        };

        // Service properties
        if (currentSection === 'service') {
          if (line.includes('dct:title')) parsed.service.name = extractValue('dct:title') || parsed.service.name;
          if (line.includes('dct:description')) parsed.service.description = extractValue('dct:description') || parsed.service.description;
          if (line.includes('cv:thematicArea')) parsed.service.thematicArea = extractValue('cv:thematicArea') || parsed.service.thematicArea;
          if (line.includes('cv:sector')) parsed.service.sector = extractValue('cv:sector') || parsed.service.sector;
          if (line.includes('dcat:keyword')) parsed.service.keyword = extractValue('dcat:keyword') || parsed.service.keyword;
          if (line.includes('dct:language')) parsed.service.language = extractValue('dct:language') || parsed.service.language;
        }

        // Organization properties
        if (currentSection === 'organization') {
          if (line.includes('skos:prefLabel')) parsed.organization.prefLabel = extractValue('skos:prefLabel') || parsed.organization.prefLabel;
          if (line.includes('foaf:homepage')) parsed.organization.homepage = extractValue('foaf:homepage') || parsed.organization.homepage;
        }

        // Legal Resource properties
        if (currentSection === 'legalResource') {
          if (line.includes('eli:is_realized_by')) {
            const versionMatch = extractValue('eli:is_realized_by');
            if (versionMatch) {
              const versionPart = versionMatch.split('/').pop();
              parsed.legalResource.version = versionPart;
            }
          }
          if (line.includes('dct:title')) parsed.legalResource.title = extractValue('dct:title') || parsed.legalResource.title;
          if (line.includes('dct:description')) parsed.legalResource.description = extractValue('dct:description') || parsed.legalResource.description;
        }

        // Temporal Rule properties
        if (currentSection === 'temporalRule' && currentRule) {
          if (line.includes('ronl:extends')) currentRule.extends = extractValue('ronl:extends') || currentRule.extends;
          if (line.includes('ronl:validFrom')) currentRule.validFrom = extractValue('ronl:validFrom') || currentRule.validFrom;
          if (line.includes('ronl:validUntil')) currentRule.validUntil = extractValue('ronl:validUntil') || currentRule.validUntil;
          if (line.includes('ronl:confidenceLevel')) currentRule.confidenceLevel = extractValue('ronl:confidenceLevel') || currentRule.confidenceLevel;
          if (line.includes('dct:description')) currentRule.description = extractValue('dct:description') || currentRule.description;
          
          // End of rule block
          if (line.includes('.') && !line.includes(';')) {
            parsed.temporalRules.push(currentRule);
            currentRule = null;
            currentSection = null;
          }
        }

        // Cost properties
        if (currentSection === 'cost') {
          if (line.includes('cv:value')) parsed.cost.value = extractValue('cv:value') || parsed.cost.value;
          if (line.includes('cv:currency')) parsed.cost.currency = extractValue('cv:currency') || parsed.cost.currency;
          if (line.includes('dct:description')) parsed.cost.description = extractValue('dct:description') || parsed.cost.description;
        }

        // Output properties
        if (currentSection === 'output') {
          if (line.includes('dct:title')) parsed.output.name = extractValue('dct:title') || parsed.output.name;
          if (line.includes('dct:description')) parsed.output.description = extractValue('dct:description') || parsed.output.description;
          if (line.includes('dct:type')) parsed.output.type = extractValue('dct:type') || parsed.output.type;
        }
      }

      return parsed;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error('Failed to parse TTL file. Please ensure it follows CPSV-AP format.');
    }
  };

  // Handle file import
  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file extension
    if (!file.name.endsWith('.ttl')) {
      setImportStatus({
        show: true,
        success: false,
        message: 'Please select a .ttl file'
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = parseTTL(content);

        // Update all state
        setService(parsed.service);
        setOrganization(parsed.organization);
        setLegalResource(parsed.legalResource);
        setCost(parsed.cost);
        setOutput(parsed.output);
        
        if (parsed.temporalRules.length > 0) {
          setTemporalRules(parsed.temporalRules);
        }

        setImportStatus({
          show: true,
          success: true,
          message: 'TTL file imported successfully! All fields have been populated.'
        });

        // Auto-hide success message after 5 seconds
        setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);

        // Switch to service tab to show imported data
        setActiveTab('service');

      } catch (error) {
        setImportStatus({
          show: true,
          success: false,
          message: error.message || 'Failed to import file. Please check the TTL format.'
        });
        setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);
      }
    };

    reader.onerror = () => {
      setImportStatus({
        show: true,
        success: false,
        message: 'Error reading file. Please try again.'
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);
    };

    reader.readAsText(file);
    
    // Reset input to allow importing the same file again
    event.target.value = '';
  };

  // Add temporal rule
  const addTemporalRule = () => {
    setTemporalRules([
      ...temporalRules,
      {
        id: Date.now(),
        uri: '',
        extends: '',
        validFrom: '',
        validUntil: '',
        confidenceLevel: 'high',
        description: ''
      }
    ]);
  };

  // Remove temporal rule
  const removeTemporalRule = (id) => {
    setTemporalRules(temporalRules.filter(rule => rule.id !== id));
  };

  // Update temporal rule
  const updateTemporalRule = (id, field, value) => {
    setTemporalRules(
      temporalRules.map(rule =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
  };

  // Helper function to escape special characters in TTL strings
  const escapeTTLString = (str) => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/\t/g, '\\t');   // Escape tabs
  };

  // Helper function to encode URI components (for identifiers with spaces)
  const encodeURIComponent = (str) => {
    if (!str) return '';
    return str.replace(/ /g, '%20');
  };

  // Generate TTL output
  const generateTTL = () => {
    const namespaces = `@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix eli: <http://data.europa.eu/eli/ontology#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix org: <http://www.w3.org/ns/org#> .
@prefix ronl: <https://regels.overheid.nl/termen/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

`;

    let ttl = namespaces;

    // Service
    if (service.identifier) {
      const encodedId = encodeURIComponent(service.identifier);
      ttl += `<https://regels.overheid.nl/services/${encodedId}> a cpsv:PublicService ;\n`;
      if (service.name) ttl += `    dct:title "${escapeTTLString(service.name)}"@${service.language} ;\n`;
      if (service.description) ttl += `    dct:description "${escapeTTLString(service.description)}"@${service.language} ;\n`;
      if (service.thematicArea) ttl += `    cv:thematicArea <${service.thematicArea}> ;\n`;
      if (service.sector) ttl += `    cv:sector <${service.sector}> ;\n`;
      if (service.keyword) ttl += `    dcat:keyword "${escapeTTLString(service.keyword)}"@${service.language} ;\n`;
      if (service.language) ttl += `    dct:language "${service.language}" ;\n`;
      
      // Link to organization
      if (organization.identifier) {
        const encodedOrgId = encodeURIComponent(organization.identifier);
        ttl += `    cv:hasCompetentAuthority <https://regels.overheid.nl/organizations/${encodedOrgId}> ;\n`;
      }
      
      // Link to legal resource
      if (legalResource.bwbId) {
        ttl += `    cpsv:follows <https://identifier.overheid.nl/tooi/def/thes/kern/c_${legalResource.bwbId}> ;\n`;
      }
      
      // Link to cost
      if (cost.identifier) {
        const encodedCostId = encodeURIComponent(cost.identifier);
        ttl += `    cv:hasCost <https://regels.overheid.nl/costs/${encodedCostId}> ;\n`;
      }
      
      // Link to output
      if (output.identifier) {
        const encodedOutputId = encodeURIComponent(output.identifier);
        ttl += `    cpsv:produces <https://regels.overheid.nl/outputs/${encodedOutputId}> ;\n`;
      }
      
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Organization
    if (organization.identifier) {
      const encodedOrgId = encodeURIComponent(organization.identifier);
      ttl += `<https://regels.overheid.nl/organizations/${encodedOrgId}> a org:Organization ;\n`;
      if (organization.prefLabel) ttl += `    skos:prefLabel "${escapeTTLString(organization.prefLabel)}"@nl ;\n`;
      if (organization.homepage) ttl += `    foaf:homepage <${organization.homepage}> ;\n`;
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Legal Resource
    if (legalResource.bwbId) {
      ttl += `<https://identifier.overheid.nl/tooi/def/thes/kern/c_${legalResource.bwbId}> a eli:LegalResource ;\n`;
      if (legalResource.title) ttl += `    dct:title "${escapeTTLString(legalResource.title)}"@nl ;\n`;
      if (legalResource.description) ttl += `    dct:description "${escapeTTLString(legalResource.description)}"@nl ;\n`;
      if (legalResource.version) {
        ttl += `    eli:is_realized_by <https://identifier.overheid.nl/tooi/def/thes/kern/c_${legalResource.bwbId}/${legalResource.version}> ;\n`;
      }
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Temporal Rules
    temporalRules.forEach((rule, index) => {
      if (rule.uri || rule.extends) {
        const ruleUri = rule.uri || `https://regels.overheid.nl/rules/rule${index + 1}`;
        ttl += `<${ruleUri}> a ronl:TemporalRule ;\n`;
        if (rule.extends) ttl += `    ronl:extends <${rule.extends}> ;\n`;
        if (rule.validFrom) ttl += `    ronl:validFrom "${rule.validFrom}"^^xsd:date ;\n`;
        if (rule.validUntil) ttl += `    ronl:validUntil "${rule.validUntil}"^^xsd:date ;\n`;
        if (rule.confidenceLevel) ttl += `    ronl:confidenceLevel "${escapeTTLString(rule.confidenceLevel)}" ;\n`;
        if (rule.description) ttl += `    dct:description "${escapeTTLString(rule.description)}"@nl ;\n`;
        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    // Cost
    if (cost.identifier) {
      const encodedCostId = encodeURIComponent(cost.identifier);
      ttl += `<https://regels.overheid.nl/costs/${encodedCostId}> a cv:Cost ;\n`;
      if (cost.value) ttl += `    cv:value "${escapeTTLString(cost.value)}" ;\n`;
      if (cost.currency) ttl += `    cv:currency "${escapeTTLString(cost.currency)}" ;\n`;
      if (cost.description) ttl += `    dct:description "${escapeTTLString(cost.description)}"@nl ;\n`;
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Output
    if (output.identifier) {
      const encodedOutputId = encodeURIComponent(output.identifier);
      ttl += `<https://regels.overheid.nl/outputs/${encodedOutputId}> a cv:Output ;\n`;
      if (output.name) ttl += `    dct:title "${escapeTTLString(output.name)}"@nl ;\n`;
      if (output.description) ttl += `    dct:description "${escapeTTLString(output.description)}"@nl ;\n`;
      if (output.type) ttl += `    dct:type <${output.type}> ;\n`;
      ttl = ttl.slice(0, -2) + ' .\n';
    }

    return ttl;
  };

  // Download TTL
  const downloadTTL = () => {
    const ttl = generateTTL();
    const blob = new Blob([ttl], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${service.identifier || 'service'}.ttl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validate form
  const validateForm = () => {
    const errors = [];
    if (!service.identifier) errors.push('Service identifier is required');
    if (!service.name) errors.push('Service name is required');
    if (legalResource.bwbId && !/^[A-Z]{2,10}\d+$/.test(legalResource.bwbId)) {
      errors.push('BWB ID must match pattern (e.g., BWBR0002820)');
    }

    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'));
    } else {
      alert('✅ Validation successful! All required fields are filled correctly.');
    }
  };

  // Render functions for each tab
  const renderServiceInfo = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Identifier *</label>
        <input
          type="text"
          value={service.identifier}
          onChange={(e) => setService({ ...service, identifier: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., aow-leeftijd"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
        <input
          type="text"
          value={service.name}
          onChange={(e) => setService({ ...service, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., AOW Leeftijdsbepaling"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={service.description}
          onChange={(e) => setService({ ...service, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="3"
          placeholder="Describe the service..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Thematic Area</label>
        <input
          type="text"
          value={service.thematicArea}
          onChange={(e) => setService({ ...service, thematicArea: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., https://example.org/themes/social-security"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
        <input
          type="text"
          value={service.sector}
          onChange={(e) => setService({ ...service, sector: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., Social Protection"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
        <input
          type="text"
          value={service.keyword}
          onChange={(e) => setService({ ...service, keyword: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., pension, retirement"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
        <select
          value={service.language}
          onChange={(e) => setService({ ...service, language: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="nl">Nederlands</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Identifier</label>
        <input
          type="text"
          value={organization.identifier}
          onChange={(e) => setOrganization({ ...organization, identifier: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., svb"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
        <input
          type="text"
          value={organization.prefLabel}
          onChange={(e) => setOrganization({ ...organization, prefLabel: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., Sociale Verzekeringsbank"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Homepage URL</label>
        <input
          type="url"
          value={organization.homepage}
          onChange={(e) => setOrganization({ ...organization, homepage: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://www.svb.nl"
        />
      </div>
    </div>
  );

  const renderLegalResource = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">BWB ID</label>
        <input
          type="text"
          value={legalResource.bwbId}
          onChange={(e) => setLegalResource({ ...legalResource, bwbId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., BWBR0002820"
          pattern="[A-Z]{2,10}\d+"
        />
        <p className="text-xs text-gray-500 mt-1">Format: Letters followed by numbers (e.g., BWBR0002820)</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Version Date</label>
        <input
          type="text"
          value={legalResource.version}
          onChange={(e) => setLegalResource({ ...legalResource, version: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., 2024-01-01"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Legal Title</label>
        <input
          type="text"
          value={legalResource.title}
          onChange={(e) => setLegalResource({ ...legalResource, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., Algemene Ouderdomswet"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={legalResource.description}
          onChange={(e) => setLegalResource({ ...legalResource, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="3"
          placeholder="Describe the legal resource..."
        />
      </div>
    </div>
  );

  const renderTemporalRules = () => (
    <div className="space-y-6">
      {temporalRules.map((rule, index) => (
        <div key={rule.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700">Temporal Rule {index + 1}</h4>
            {temporalRules.length > 1 && (
              <button
                onClick={() => removeTemporalRule(rule.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule URI</label>
              <input
                type="text"
                value={rule.uri}
                onChange={(e) => updateTemporalRule(rule.id, 'uri', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://regels.overheid.nl/rules/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extends (Rule URI)</label>
              <input
                type="text"
                value={rule.extends}
                onChange={(e) => updateTemporalRule(rule.id, 'extends', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="URI of the rule being extended"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                <input
                  type="date"
                  value={rule.validFrom}
                  onChange={(e) => updateTemporalRule(rule.id, 'validFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={rule.validUntil}
                  onChange={(e) => updateTemporalRule(rule.id, 'validUntil', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Level</label>
              <select
                value={rule.confidenceLevel}
                onChange={(e) => updateTemporalRule(rule.id, 'confidenceLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={rule.description}
                onChange={(e) => updateTemporalRule(rule.id, 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="2"
                placeholder="Describe this temporal rule..."
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addTemporalRule}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        <Plus size={18} /> Add Temporal Rule
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Public Service TTL Editor</h1>
                <p className="text-gray-600 text-sm">Generate RDF/Turtle files for government services</p>
              </div>
            </div>
            
            {/* Import Button */}
            <div>
              <input
                type="file"
                id="ttl-import"
                accept=".ttl"
                onChange={handleImportFile}
                className="hidden"
              />
              <label
                htmlFor="ttl-import"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer shadow-md transition-colors"
              >
                <Upload size={20} />
                Import TTL File
              </label>
            </div>
          </div>

          {/* Import Status Message */}
          {importStatus.show && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
              importStatus.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {importStatus.success ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <AlertCircle className="text-red-600" size={24} />
              )}
              <p className={importStatus.success ? 'text-green-800' : 'text-red-800'}>
                {importStatus.message}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            {['service', 'organization', 'legal', 'rules', 'preview'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab === 'service' && <span className="flex items-center justify-center gap-2"><FileText size={18} />Service</span>}
                {tab === 'organization' && <span className="flex items-center justify-center gap-2"><Building2 size={18} />Organization</span>}
                {tab === 'legal' && <span className="flex items-center justify-center gap-2"><Scale size={18} />Legal</span>}
                {tab === 'rules' && <span className="flex items-center justify-center gap-2"><Clock size={18} />Rules</span>}
                {tab === 'preview' && <span className="flex items-center justify-center gap-2"><FileUp size={18} />Preview</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'service' && renderServiceInfo()}
            {activeTab === 'organization' && renderOrganization()}
            {activeTab === 'legal' && renderLegalResource()}
            {activeTab === 'rules' && renderTemporalRules()}
            {activeTab === 'preview' && (
              <div>
                <h3 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4">TTL Preview</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm font-mono max-h-96 overflow-y-auto">
                  {generateTTL()}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4 justify-end">
          <button
            onClick={validateForm}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-colors"
          >
            <CheckCircle size={20} /> Validate
          </button>
          <button
            onClick={downloadTTL}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg transition-colors"
          >
            <Download size={20} /> Download TTL
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t text-center text-gray-600 text-sm">
          <p>
            Public Service TTL Editor - Part of RONL Initiative
            <br />
            Based on{' '}
            <a 
              href="https://git.open-regels.nl/showcases/aow/-/blob/main/NAMESPACE-PROPERTIES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              NAMESPACE-PROPERTIES.md
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;