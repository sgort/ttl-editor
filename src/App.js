import React, { useState, } from 'react';
import { Download, CheckCircle, AlertCircle, Plus, Trash2, FileText } from 'lucide-react';

// Main App Component
const PublicServiceTTLEditor = () => {
  const [activeTab, setActiveTab] = useState('service');
  const [serviceData, setServiceData] = useState({
    serviceId: '',
    titleNl: '',
    titleEn: '',
    descriptionNl: '',
    descriptionEn: '',
    identifier: '',
    creator: '',
    publisher: '',
    subjectNl: '',
    subjectEn: '',
    issued: '',
    modified: '',
    language: 'nld',
    goalNl: '',
    goalEn: '',
    analysis: 'ronl:WetsanalyseJAS',
    method: 'ronl:ConcordiaLegal',
  });

  const [organization, setOrganization] = useState({
    id: '',
    nameNl: '',
    nameEn: '',
    homepage: '',
    tooiId: '',
  });

  const [legalResource, setLegalResource] = useState({
    titleNl: '',
    titleEn: '',
    lawId: '',
    version: '',
    accessUrls: [''],
  });

  const [channel, _setChannel] = useState({
    titleNl: '',
    titleEn: '',
    descriptionNl: '',
    descriptionEn: '',
    accessUrl: '',
    channelType: 'Web Portal',
  });

  const [contact, _setContact] = useState({
    name: '',
    email: '',
    phone: '',
    url: '',
  });

  const [businessRule, _setBusinessRule] = useState({
    ruleId: '',
    titleNl: '',
    titleEn: '',
    descriptionNl: '',
    descriptionEn: '',
    version: '1.0',
    lawId: '',
    lawVersion: '',
    rulesetType: 'temporal-mapping',
    ruleMethod: 'decision-table',
  });

  const [temporalRules, setTemporalRules] = useState([
    {
      year: '2024',
      titleNl: '',
      titleEn: '',
      extends: '',
      validFrom: '',
      validUntil: '',
      ruleType: 'temporal-period',
      confidence: 'high',
      noteNl: '',
      noteEn: '',
      descriptionNl: '',
      descriptionEn: '',
    }
  ]);

  const [dmnDistribution, _setDmnDistribution] = useState({
    triplyDbUrl: '',
    triplyDbByteSize: '',
    gitlabViewUrl: '',
    gitlabRawUrl: '',
    gitlabRepo: '',
    issued: '',
    dmnModelId: '',
    dmnDecisionId: '',
  });

  const [_showPreview, _setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Generate TTL
  const generateTTL = () => {
    let ttl = `@prefix cpsv-ap: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix vcard: <http://www.w3.org/2006/vcard/ns#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ronl: <https://regels.overheid.nl/termen/> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

#################################################################################
#                           ORGANIZATION                                        #
#################################################################################

<https://organisaties.overheid.nl/${organization.id}/${organization.nameNl.replace(/\s+/g, '_')}> a foaf:Organization ;
    foaf:name "${organization.nameNl}"@nl ;
    foaf:name "${organization.nameEn}"@en ;
    foaf:homepage <${organization.homepage}> ;
    foaf:uri <https://identifier.overheid.nl/tooi/id/zbo/${organization.tooiId}> .

#################################################################################
#                           PUBLIC SERVICE                                      #
#################################################################################

<${serviceData.serviceId}_service> a cpsv-ap:PublicService ;
    dct:title "${serviceData.titleNl}"@nl ;
    dct:title "${serviceData.titleEn}"@en ;
    dct:description "${serviceData.descriptionNl}"@nl ;
    dct:description "${serviceData.descriptionEn}"@en ;
    
    dct:identifier <${serviceData.identifier}> ;
    dct:creator <https://organisaties.overheid.nl/${organization.id}/${organization.nameNl.replace(/\s+/g, '_')}> ;
    dct:publisher <https://organisaties.overheid.nl/${organization.id}/${organization.nameNl.replace(/\s+/g, '_')}> ;
    dct:subject "${serviceData.subjectNl}"@nl ;
    dct:subject "${serviceData.subjectEn}"@en ;
    dct:issued "${serviceData.issued}"^^xsd:date ;
    dct:modified "${serviceData.modified}"^^xsd:date ;
    dct:language "${serviceData.language}" ;
    
    cprmv:implements "${legalResource.lawId}" ;
    cprmv:implementsVersion "${legalResource.version}" ;
    
    ronl:analysis ${serviceData.analysis} ;
    ronl:method ${serviceData.method} ;
    ronl:implements <${businessRule.ruleId}> ;
    
    cpsv-ap:hasChannel [
        a cpsv-ap:Channel ;
        dct:title "${channel.titleNl}"@nl ;
        dct:title "${channel.titleEn}"@en ;
        cpsv-ap:accessURL <${channel.accessUrl}> ;
        dct:description "${channel.descriptionNl}"@nl ;
        dct:description "${channel.descriptionEn}"@en ;
    ] ;
    
    cpsv-ap:hasContactPoint [
        a vcard:Organization ;
        vcard:fn "${contact.name}"@en ;
        vcard:hasEmail <mailto:${contact.email}> ;
        vcard:hasTelephone [
            a vcard:Work, vcard:Voice ;
            vcard:hasValue <tel:${contact.phone}> ;
        ] ;
        vcard:hasURL <${contact.url}> ;
    ] ;
    
    cpsv-ap:goal "${serviceData.goalNl}"@nl ;
    cpsv-ap:goal "${serviceData.goalEn}"@en ;
    
    cpsv-ap:hasLegalResource [
        a cpsv-ap:LegalResource ;
        dct:title "${legalResource.titleNl}"@nl ;
        dct:title "${legalResource.titleEn}"@en ;
${legalResource.accessUrls.map(url => `        dcat:accessURL <${url}> ;`).join('\n')}
        cprmv:implements "${legalResource.lawId}" ;
        cprmv:implementsVersion "${legalResource.version}" ;
    ] .

#################################################################################
#                           BUSINESS RULES                                      #
#################################################################################

<${businessRule.ruleId}> a cpsv-ap:Rule ;
    dct:title "${businessRule.titleNl}"@nl ;
    dct:title "${businessRule.titleEn}"@en ;
    dct:description "${businessRule.descriptionNl}"@nl ;
    dct:description "${businessRule.descriptionEn}"@en ;
    dct:version "${businessRule.version}" ;
    
    cprmv:implements "${businessRule.lawId}" ;
    cprmv:implementsVersion "${businessRule.lawVersion}" ;
    cprmv:rulesetType "${businessRule.rulesetType}" ;
    cprmv:ruleMethod "${businessRule.ruleMethod}" ;
    
    dcat:distribution [
        a dcat:Distribution ;
        dct:title "DMN Beslissingsmodel (TriplyDB Assets)"@nl ;
        dcat:accessURL <${dmnDistribution.triplyDbUrl}> ;
        dcat:downloadURL <${dmnDistribution.triplyDbUrl}> ;
        dcat:byteSize "${dmnDistribution.triplyDbByteSize}"^^xsd:nonNegativeInteger ;
        dct:issued "${dmnDistribution.issued}"^^xsd:date ;
    ] ;
    
    dcat:distribution [
        a dcat:Distribution ;
        dct:title "DMN Beslissingsmodel (GitLab Repository)"@nl ;
        dcat:accessURL <${dmnDistribution.gitlabViewUrl}> ;
        dcat:downloadURL <${dmnDistribution.gitlabRawUrl}> ;
        dct:issued "${dmnDistribution.issued}"^^xsd:date ;
        prov:wasGeneratedBy [
            a prov:Activity ;
            rdfs:label "Git commit"@en ;
            prov:used <${dmnDistribution.gitlabRepo}> ;
        ] ;
    ] .

#################################################################################
#                           TEMPORAL RULES                                      #
#################################################################################

${temporalRules.map(rule => `
<${businessRule.ruleId.replace('_regels', '')}_regel_${rule.year}> a cpsv-ap:Rule ;
    dct:title "${rule.titleNl}"@nl ;
    dct:title "${rule.titleEn}"@en ;
    cprmv:extends "${rule.extends}" ;
    cprmv:validFrom "${rule.validFrom}"^^xsd:date ;
    cprmv:validUntil "${rule.validUntil}"^^xsd:date ;
    cprmv:ruleType "${rule.ruleType}" ;
    cprmv:confidence "${rule.confidence}" ;
    ${rule.noteNl ? `cprmv:note "${rule.noteNl}"@nl ;` : ''}
    ${rule.noteEn ? `cprmv:note "${rule.noteEn}"@en ;` : ''}
    dct:description "${rule.descriptionNl}"@nl ;
    dct:description "${rule.descriptionEn}"@en ;
    cpsv-ap:isPartOf <${businessRule.ruleId}> .
`).join('\n')}`;

    return ttl;
  };

  // Validation
  const validateForm = () => {
    const errors = [];
    
    if (!serviceData.serviceId) errors.push('Service ID is required');
    if (!serviceData.titleNl) errors.push('Dutch title is required');
    if (!legalResource.lawId) errors.push('Law ID is required');
    if (!/^BWB[RN]\d{7}$/.test(legalResource.lawId)) errors.push('Law ID must match pattern BWB[RN]1234567');
    if (!organization.id) errors.push('Organization ID is required');
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Add temporal rule
  const addTemporalRule = () => {
    setTemporalRules([...temporalRules, {
      year: '',
      titleNl: '',
      titleEn: '',
      extends: '',
      validFrom: '',
      validUntil: '',
      ruleType: 'temporal-period',
      confidence: 'high',
      noteNl: '',
      noteEn: '',
      descriptionNl: '',
      descriptionEn: '',
    }]);
  };

  // Remove temporal rule
  const removeTemporalRule = (index) => {
    setTemporalRules(temporalRules.filter((_, i) => i !== index));
  };

  // Download TTL
  const downloadTTL = () => {
    if (!validateForm()) {
      alert('Please fix validation errors before downloading');
      return;
    }
    
    const ttl = generateTTL();
    const blob = new Blob([ttl], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceData.serviceId}_enhanced.ttl`;
    a.click();
  };

  // Render form sections
  const renderServiceInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-700 border-b pb-2">Service Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Service ID *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="aow_leeftijd"
            value={serviceData.serviceId}
            onChange={(e) => setServiceData({...serviceData, serviceId: e.target.value})}
          />
          <span className="text-xs text-gray-500">Pattern: lowercase_with_underscores</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Identifier URI *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="https://standaarden.overheid.nl/owms/terms/service-id"
            value={serviceData.identifier}
            onChange={(e) => setServiceData({...serviceData, identifier: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title (Dutch) *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Bepaling leeftijd AOW"
            value={serviceData.titleNl}
            onChange={(e) => setServiceData({...serviceData, titleNl: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Title (English)</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Determination of AOW age"
            value={serviceData.titleEn}
            onChange={(e) => setServiceData({...serviceData, titleEn: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Description (Dutch)</label>
          <textarea
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            rows="3"
            value={serviceData.descriptionNl}
            onChange={(e) => setServiceData({...serviceData, descriptionNl: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description (English)</label>
          <textarea
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            rows="3"
            value={serviceData.descriptionEn}
            onChange={(e) => setServiceData({...serviceData, descriptionEn: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Issued Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={serviceData.issued}
            onChange={(e) => setServiceData({...serviceData, issued: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Modified Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={serviceData.modified}
            onChange={(e) => setServiceData({...serviceData, modified: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Language</label>
          <select
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={serviceData.language}
            onChange={(e) => setServiceData({...serviceData, language: e.target.value})}
          >
            <option value="nld">Dutch (nld)</option>
            <option value="eng">English (eng)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-700 border-b pb-2">Organization</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Organization ID *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="28212263"
            value={organization.id}
            onChange={(e) => setOrganization({...organization, id: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">TOOI ID</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="zb000143"
            value={organization.tooiId}
            onChange={(e) => setOrganization({...organization, tooiId: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name (Dutch) *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Sociale Verzekeringsbank"
            value={organization.nameNl}
            onChange={(e) => setOrganization({...organization, nameNl: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Name (English)</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Social Insurance Bank"
            value={organization.nameEn}
            onChange={(e) => setOrganization({...organization, nameEn: e.target.value})}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Homepage URL</label>
        <input
          type="url"
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="https://www.svb.nl/nl/"
          value={organization.homepage}
          onChange={(e) => setOrganization({...organization, homepage: e.target.value})}
        />
      </div>
    </div>
  );

  const renderLegalResource = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-700 border-b pb-2">Legal Resource</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Law ID (BWB) *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="BWBR0002221"
            value={legalResource.lawId}
            onChange={(e) => setLegalResource({...legalResource, lawId: e.target.value})}
          />
          <span className="text-xs text-gray-500">Pattern: BWB[RN]1234567</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Version</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="2025-01-01_0"
            value={legalResource.version}
            onChange={(e) => setLegalResource({...legalResource, version: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title (Dutch)</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Algemene Ouderdomswet (AOW)"
            value={legalResource.titleNl}
            onChange={(e) => setLegalResource({...legalResource, titleNl: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Title (English)</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="General Old Age Pensions Act"
            value={legalResource.titleEn}
            onChange={(e) => setLegalResource({...legalResource, titleEn: e.target.value})}
          />
        </div>
      </div>
    </div>
  );

  const renderTemporalRules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-semibold text-blue-700">Temporal Rules</h3>
        <button
          onClick={addTemporalRule}
          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>
      
      {temporalRules.map((rule, index) => (
        <div key={index} className="border rounded p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Rule #{index + 1}</h4>
            <button
              onClick={() => removeTemporalRule(index)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="2024"
                value={rule.year}
                onChange={(e) => {
                  const updated = [...temporalRules];
                  updated[index].year = e.target.value;
                  setTemporalRules(updated);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Valid From</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={rule.validFrom}
                onChange={(e) => {
                  const updated = [...temporalRules];
                  updated[index].validFrom = e.target.value;
                  setTemporalRules(updated);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Valid Until</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={rule.validUntil}
                onChange={(e) => {
                  const updated = [...temporalRules];
                  updated[index].validUntil = e.target.value;
                  setTemporalRules(updated);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">Extends (Legal Path)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="BWBR0002221_2024-01-01_0/Artikel_7a/Lid_1"
                value={rule.extends}
                onChange={(e) => {
                  const updated = [...temporalRules];
                  updated[index].extends = e.target.value;
                  setTemporalRules(updated);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Confidence</label>
              <select
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={rule.confidence}
                onChange={(e) => {
                  const updated = [...temporalRules];
                  updated[index].confidence = e.target.value;
                  setTemporalRules(updated);
                }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Public Service TTL Editor</h1>
              <p className="text-gray-600 mt-1">Create CPSV-AP compliant service descriptions with CPRMV extensions</p>
            </div>
            <FileText size={48} className="text-blue-600" />
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-600 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-800">Validation Errors</h3>
                <ul className="list-disc list-inside text-red-700 text-sm mt-2">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            {['service', 'organization', 'legal', 'rules', 'preview'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm font-mono">
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
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
          >
            <CheckCircle size={20} /> Validate
          </button>
          <button
            onClick={downloadTTL}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg"
          >
            <Download size={20} /> Download TTL
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>Based on CPSV-AP 3.0 | CPRMV 0.3.0 | RONL Vocabulary</p>
          <p className="mt-1">See <a href="./NAMESPACE-PROPERTIES.md" className="text-blue-600 hover:underline">NAMESPACE-PROPERTIES.md</a> for complete property reference</p>
        </div>
      </div>
    </div>
  );
};

export default PublicServiceTTLEditor;