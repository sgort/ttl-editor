import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Code,
  FileText,
  FlaskConical,
  Info,
  Play,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  generateConceptDefinition,
  generateConceptLabel,
  generateConceptNotation,
  generateConceptUri,
} from '../../utils/dmnHelpers';

const DMNTab = ({ dmnData, setDmnData, setConcepts }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);

  // Intermediate decision test state
  const [decisions, setDecisions] = useState([]);
  const [intermediateResults, setIntermediateResults] = useState([]);
  const [isRunningIntermediateTests, setIsRunningIntermediateTests] = useState(false);
  const [intermediateExpanded, setIntermediateExpanded] = useState(false);

  // Test cases state
  const [testCases, setTestCases] = useState([]);
  const [testCaseResults, setTestCaseResults] = useState([]);
  const [isRunningTestCases, setIsRunningTestCases] = useState(false);
  const [testCasesExpanded, setTestCasesExpanded] = useState(false);
  const [testCasesFileName, setTestCasesFileName] = useState('');

  // Syntactic validation result (from backend /v1/dmns/validate)
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationExpanded, setValidationExpanded] = useState(true);

  // Default Operaton configuration
  const [apiConfig, setApiConfig] = useState({
    baseUrl: 'https://operaton.open-regels.nl',
    decisionKey: '',
    evaluateEndpoint: '/engine-rest/decision-definition/key/{key}/evaluate',
    deploymentEndpoint: '/engine-rest/deployment/create',
  });

  // Check if DMN was imported - show notice instead of normal UI
  if (dmnData.isImported) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 DMN Data Imported</h3>
              <p className="text-blue-800 mb-4 leading-relaxed">
                This TTL file contains DMN decision model data that was imported from an external
                source. The DMN data is <strong>preserved</strong> in your TTL exports but cannot be
                edited in this interface.
              </p>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                When you import a TTL file that already contains DMN data, it preserves that data
                exactly as it was, including deployment IDs, test results, and rule extractions.
                This ensures data integrity and prevents accidental modifications to production
                decision models.
              </p>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                You can still edit all other aspects of your service (Service, Organization, Legal,
                Rules, Parameters) and the DMN data will remain unchanged in your exports.
              </p>
              <button
                onClick={() => {
                  setDmnData({
                    fileName: '',
                    content: '',
                    decisionKey: '',
                    deployed: false,
                    deploymentId: null,
                    deployedAt: null,
                    apiEndpoint: '',
                    lastTestResult: null,
                    lastTestTimestamp: null,
                    testBody: null,
                    importedDmnBlocks: null,
                    isImported: false,
                    validationStatus: 'not-validated',
                    validatedBy: '',
                    validatedAt: '',
                    validationNote: '',
                  });
                }}
                className="mt-4 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Clear Imported DMN Data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Extract primary decision key from DMN XML.
   * Skips constant parameters (p_* prefix) to find the actual testable decision.
   */
  const extractPrimaryDecisionKey = (dmnContent) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

      // Find first non-constant decision (skip p_*)
      const decisionElements = xmlDoc.querySelectorAll('decision');
      const allDecisionIds = Array.from(decisionElements)
        .map((d) => d.getAttribute('id'))
        .filter(Boolean);

      for (const decision of decisionElements) {
        const id = decision.getAttribute('id');
        if (id && !id.startsWith('p_')) {
          console.log(
            `[DMN] Extracted primary decision key: "${id}" (skipped ${allDecisionIds.filter((d) => d.startsWith('p_')).length} p_* constant(s))`
          );
          return id;
        }
      }

      // Fallback: if all decisions are p_*, use the first one anyway
      if (decisionElements.length > 0) {
        const firstId = decisionElements[0].getAttribute('id');
        if (firstId) {
          console.warn(`[DMN] All decisions are constants (p_*), using first one: "${firstId}"`);
          return firstId;
        }
      }
    } catch (err) {
      console.error('Error extracting decision key from DMN:', err);
    }
    return '';
  };

  /**
   * Parse all decision elements from DMN XML to support intermediate testing.
   * Filters out constant parameters (p_* prefix) automatically.
   * Returns [{id, name, inputs: [{name, typeRef}]}]
   */
  const parseDMNDecisionsFromXML = (dmnContent) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');
      const decisionElements = xmlDoc.querySelectorAll('decision');
      const parsed = [];
      let skippedConstants = 0;

      decisionElements.forEach((decision) => {
        const id = decision.getAttribute('id');
        const name = decision.getAttribute('name') || id;

        // Skip constant parameters (convention: decisions starting with p_)
        if (id && id.startsWith('p_')) {
          skippedConstants++;
          return;
        }

        // Collect input variable names from informationRequirement -> requiredInput
        // which point to inputData elements
        const inputNames = new Map();

        decision.querySelectorAll('informationRequirement').forEach((req) => {
          const requiredInput = req.querySelector('requiredInput');
          if (requiredInput) {
            const href = requiredInput.getAttribute('href') || '';
            const inputDataId = href.replace('#', '');
            const inputDataEl = xmlDoc.getElementById(inputDataId);
            if (inputDataEl) {
              const varName = inputDataEl.getAttribute('name');
              if (varName) inputNames.set(varName, 'String');
            }
          }
        });

        // Also collect from the decision table's input expressions (for typeRef)
        const decisionTable = decision.querySelector('decisionTable');
        if (decisionTable) {
          decisionTable.querySelectorAll('input').forEach((inputEl) => {
            const label = inputEl.getAttribute('label') || '';
            const inputExpr = inputEl.querySelector('inputExpression');
            const typeRef = inputExpr ? inputExpr.getAttribute('typeRef') || 'String' : 'String';
            // Only store if label matches a known inputData name (case-insensitive match)
            // Otherwise skip — we rely on informationRequirement for variable names
            inputNames.forEach((_, varName) => {
              if (label.toLowerCase() === varName.toLowerCase()) {
                inputNames.set(varName, typeRef);
              }
            });
          });
        }

        if (id) {
          parsed.push({
            id,
            name,
            inputs: Array.from(inputNames.entries()).map(([varName, typeRef]) => ({
              name: varName,
              typeRef,
            })),
          });
        }
      });

      // Log filtering stats for debugging
      if (skippedConstants > 0) {
        console.log(
          `[DMN Parse] Filtered ${skippedConstants} constant parameter(s) (p_*), kept ${parsed.length} testable decision(s)`
        );
      }

      return parsed;
    } catch (err) {
      console.error('Error parsing DMN decisions:', err);
      return [];
    }
  };

  /**
   * Generate concepts from DMN test results and store in state
   */
  const generateConceptsFromTest = (testResult, testBodyData) => {
    const serviceIdentifier = dmnData.decisionKey || 'unknown-service';
    const inputs = extractInputsFromTestResult({ testBody: testBodyData });
    const outputs = extractOutputsFromTestResult({ lastTestResult: testResult });

    const usedNotations = [];
    const generatedConcepts = [];
    let idCounter = 1;

    inputs.forEach((input, index) => {
      const notation = generateConceptNotation(input.name, usedNotations);
      usedNotations.push(notation);
      generatedConcepts.push({
        id: idCounter++,
        uri: generateConceptUri(input.name, serviceIdentifier),
        variableName: input.name,
        prefLabel: generateConceptLabel(input.name),
        definition: generateConceptDefinition(input.name, input.type, 'input'),
        notation: notation,
        linkedTo: `input/${index + 1}`,
        linkedToType: 'input',
        exactMatch: `https://regels.overheid.nl/concepts/${input.name}`,
        type: 'dmn:InputVariable',
      });
    });

    outputs.forEach((output, index) => {
      const notation = generateConceptNotation(output.name, usedNotations);
      usedNotations.push(notation);
      generatedConcepts.push({
        id: idCounter++,
        uri: generateConceptUri(output.name, serviceIdentifier),
        variableName: output.name,
        prefLabel: generateConceptLabel(output.name),
        definition: generateConceptDefinition(output.name, output.type, 'output'),
        notation: notation,
        linkedTo: `output/${index + 1}`,
        linkedToType: 'output',
        exactMatch: `https://regels.overheid.nl/concepts/${output.name}`,
        type: 'dmn:OutputVariable',
      });
    });

    setConcepts(generatedConcepts);
  };

  const generateRequestBodyFromDMN = (dmnContent) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

      // Read top-level <inputData> elements — these are the actual DRD input variables
      const inputDataElements = xmlDoc.querySelectorAll('inputData');

      if (inputDataElements.length === 0) {
        return '';
      }

      const variables = {};

      inputDataElements.forEach((inputData) => {
        const name = inputData.getAttribute('name');
        if (!name) return;

        const nameLower = name.toLowerCase();

        // Try to read typeRef from <variable> child element (present in most RONL DMNs)
        const variableElement = inputData.querySelector('variable');
        const typeRef = variableElement?.getAttribute('typeRef')?.toLowerCase();

        let value = '';
        let type = 'String';

        if (typeRef) {
          switch (typeRef) {
            case 'boolean':
              value = false;
              type = 'Boolean';
              break;
            case 'number':
            case 'double':
            case 'decimal':
              value = 0.0;
              type = 'Double';
              break;
            case 'integer':
            case 'long':
              value = 0;
              type = 'Integer';
              break;
            case 'date': {
              const isBirthDate =
                nameLower.includes('geboorte') ||
                nameLower.includes('birth') ||
                nameLower.includes('dob');
              if (isBirthDate) {
                const today = new Date();
                const randomAge = Math.floor(Math.random() * (68 - 25 + 1)) + 25;
                const birthYear = today.getFullYear() - randomAge;
                const randomMonth = Math.floor(Math.random() * 12);
                const randomDay = Math.floor(Math.random() * 28) + 1;
                const birthDate = new Date(birthYear, randomMonth, randomDay);
                // Use simple format with type String (Operaton handles conversion)
                value = birthDate.toISOString().split('T')[0];
              } else {
                // Use simple format with type String
                value = new Date().toISOString().split('T')[0];
              }
              // CRITICAL: Use 'String' type, not 'Date' - Operaton converts internally
              type = 'String';
              break;
            }
            case 'string':
            default: {
              const isDateVariable =
                nameLower.includes('dag') ||
                nameLower.includes('datum') ||
                nameLower.includes('date') ||
                (nameLower.includes('aanvraag') && nameLower.includes('dag'));
              if (isDateVariable) {
                const isBirthDate =
                  nameLower.includes('geboorte') ||
                  nameLower.includes('birth') ||
                  nameLower.includes('dob') ||
                  nameLower.includes('geboortedatum');
                if (isBirthDate) {
                  const today = new Date();
                  const randomAge = Math.floor(Math.random() * (68 - 25 + 1)) + 25;
                  const birthYear = today.getFullYear() - randomAge;
                  const randomMonth = Math.floor(Math.random() * 12);
                  const randomDay = Math.floor(Math.random() * 28) + 1;
                  // Simple date format works for type: 'String' (no Java Date parsing)
                  value = new Date(birthYear, randomMonth, randomDay).toISOString().split('T')[0];
                } else {
                  // Simple date format works for type: 'String'
                  value = new Date().toISOString().split('T')[0];
                }
              } else {
                value = '';
              }
              type = 'String';
              break;
            }
          }
        } else {
          // No <variable> child — fall back to name-based heuristics (e.g. SVB example DMN)
          const isDateVariable =
            nameLower.includes('dag') || nameLower.includes('datum') || nameLower.includes('date');
          const isBirthDate =
            nameLower.includes('geboorte') ||
            nameLower.includes('birth') ||
            nameLower.includes('dob') ||
            nameLower.includes('geboortedatum');

          if (isDateVariable) {
            if (isBirthDate) {
              const today = new Date();
              const randomAge = Math.floor(Math.random() * (68 - 25 + 1)) + 25;
              const birthYear = today.getFullYear() - randomAge;
              const randomMonth = Math.floor(Math.random() * 12);
              const randomDay = Math.floor(Math.random() * 28) + 1;
              // Simple date format works for type: 'String' (no Java Date parsing)
              value = new Date(birthYear, randomMonth, randomDay).toISOString().split('T')[0];
            } else {
              // Simple date format works for type: 'String'
              value = new Date().toISOString().split('T')[0];
            }
            type = 'String';
          } else if (
            nameLower.includes('aantal') ||
            nameLower.includes('bedrag') ||
            nameLower.includes('inkomen') ||
            nameLower.includes('norm')
          ) {
            value = 0;
            type = 'Integer';
          } else {
            value = '';
            type = 'String';
          }
        }

        variables[name] = { value, type };
      });

      return JSON.stringify({ variables }, null, 2);
    } catch (err) {
      console.error('Error generating request body from DMN:', err);
      return '';
    }
  };

  const loadExampleDMN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/examples/organizations/svb/RONL_BerekenLeeftijden_CPRMV.dmn');

      if (!response.ok) {
        throw new Error(
          `Failed to load example DMN file (${response.status} ${response.statusText}). Make sure the file exists in public/examples/organizations/svb/`
        );
      }

      const content = await response.text();
      const fileName = 'RONL_BerekenLeeftijden_CPRMV.dmn';

      // Extract primary decision key (skips p_* constants)
      const extractedDecisionKey = extractPrimaryDecisionKey(content);

      setUploadedFile({
        name: fileName,
        content,
        size: content.length,
        uploadDate: new Date().toISOString(),
      });

      if (extractedDecisionKey) {
        setApiConfig((prev) => ({ ...prev, decisionKey: extractedDecisionKey }));
      }

      setDmnData({
        ...dmnData,
        fileName,
        content,
        decisionKey: extractedDecisionKey || apiConfig.decisionKey,
      });

      const generatedBody = generateRequestBodyFromDMN(content);
      if (generatedBody) setTestBody(generatedBody);

      // Parse all decisions for intermediate testing
      const parsedDecisions = parseDMNDecisionsFromXML(content);
      setDecisions(parsedDecisions);
      setIntermediateResults([]);
      setTestCaseResults([]);

      // Run backend syntactic validation
      runBackendValidation(content);
    } catch (err) {
      setError(err.message || 'Failed to load example DMN file');
    } finally {
      setIsLoading(false);
    }
  };

  const runBackendValidation = async (content) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    setIsValidating(true);
    setValidationResult(null);
    try {
      const response = await fetch(`${backendUrl}/v1/dmns/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setValidationResult(data.data);
        setValidationExpanded(!data.data.valid);
      } else {
        setValidationResult({
          valid: false,
          parseError: data.error?.message ?? 'Backend validation failed',
          layers: {
            base: { label: 'Base DMN', issues: [] },
            business: { label: 'Business Rules', issues: [] },
            execution: { label: 'Execution Rules', issues: [] },
            interaction: { label: 'Interaction Rules', issues: [] },
            content: { label: 'Content', issues: [] },
          },
          summary: { errors: 1, warnings: 0, infos: 0 },
        });
      }
    } catch (err) {
      // Backend unreachable — fail silently, don't block the DMN workflow
      console.warn('[DMNTab] Validation backend unavailable:', err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.dmn')) {
      setError('Please upload a valid DMN file (.dmn extension)');
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;

      // Extract primary decision key (skips p_* constants)
      const extractedDecisionKey = extractPrimaryDecisionKey(content);

      setUploadedFile({
        name: file.name,
        content,
        size: file.size,
        uploadDate: new Date().toISOString(),
      });

      if (extractedDecisionKey) {
        setApiConfig((prev) => ({ ...prev, decisionKey: extractedDecisionKey }));
      }

      setDmnData({
        ...dmnData,
        fileName: file.name,
        content,
        decisionKey: extractedDecisionKey || apiConfig.decisionKey,
      });

      const generatedBody = generateRequestBodyFromDMN(content);
      if (generatedBody) setTestBody(generatedBody);

      // Parse all decisions for intermediate testing
      const parsedDecisions = parseDMNDecisionsFromXML(content);
      setDecisions(parsedDecisions);
      setIntermediateResults([]);
      setTestCaseResults([]);

      // Run backend syntactic validation
      runBackendValidation(content);
    };

    reader.onerror = () => setError('Error reading file');
    reader.readAsText(file);
  };

  const handleDeployDMN = async () => {
    if (!uploadedFile) {
      setError('Please upload a DMN file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDeploymentStatus(null);

    try {
      const formData = new FormData();
      const blob = new Blob([uploadedFile.content], { type: 'application/xml' });
      formData.append('upload', blob, uploadedFile.name);
      formData.append('deployment-name', apiConfig.decisionKey || uploadedFile.name);

      const deployUrl = `${apiConfig.baseUrl}${apiConfig.deploymentEndpoint}`;
      const response = await fetch(deployUrl, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa('demo:demo') },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deployment failed: ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      setDeploymentStatus({ success: true, data: result });
      setDmnData({
        ...dmnData,
        deployed: true,
        deploymentId: result.id,
        deployedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
      setDeploymentStatus({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateDMN = async () => {
    if (!testBody) {
      setError('Please enter a request body');
      return;
    }

    setIsLoading(true);
    setError(null);

    const evaluateUrl = `${apiConfig.baseUrl}${apiConfig.evaluateEndpoint.replace('{key}', apiConfig.decisionKey)}`;

    try {
      const response = await fetch(evaluateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + btoa('demo:demo'),
        },
        body: testBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evaluation failed: ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      setTestResponse({ success: true, data: result, timestamp: new Date().toISOString() });

      setDmnData({
        ...dmnData,
        lastTestResult: result,
        lastTestTimestamp: new Date().toISOString(),
        testBody: testBody,
        apiEndpoint: evaluateUrl,
      });

      generateConceptsFromTest(result, testBody);
    } catch (err) {
      setError(err.message);
      setTestResponse({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Run each sub-decision in the DRD individually.
   * Uses the full testBody variables for each call (Operaton ignores extras).
   */
  const handleRunIntermediateTests = async () => {
    if (!testBody || decisions.length === 0) return;

    setIsRunningIntermediateTests(true);
    setIntermediateResults([]);
    setIntermediateExpanded(true);

    const results = [];

    for (const decision of decisions) {
      const url = `${apiConfig.baseUrl}${apiConfig.evaluateEndpoint.replace('{key}', decision.id)}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic ' + btoa('demo:demo'),
          },
          body: testBody,
        });

        const raw = await response.text();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }

        const isRestException = raw.includes('"type":"RestException"');
        const isResultArray = Array.isArray(parsed);

        results.push({
          decisionId: decision.id,
          decisionName: decision.name,
          status: isRestException ? 'error' : isResultArray ? 'ok' : 'unexpected',
          raw,
          parsed,
        });
      } catch (err) {
        results.push({
          decisionId: decision.id,
          decisionName: decision.name,
          status: 'error',
          raw: err.message,
          parsed: null,
        });
      }

      // Update state progressively so user sees results as they come in
      setIntermediateResults([...results]);
    }

    setIsRunningIntermediateTests(false);
  };

  /**
   * Load test cases from a JSON file.
   * Normalises both formats:
   *   - toeslagen: [{name, expected, requestBody}]
   *   - duo:       [{testName, testResult, variables}]
   */
  const handleTestCasesUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please upload a valid JSON file (.json extension)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        if (!Array.isArray(raw)) throw new Error('Test cases file must contain a JSON array');

        const normalised = raw.map((tc, i) => {
          // Toeslagen format: {name, expected, requestBody}
          if (tc.requestBody && tc.requestBody.variables) {
            return {
              name: tc.name || `TC${i + 1}`,
              expected: tc.expected || '',
              requestBody: tc.requestBody,
            };
          }
          // DUO format: {testName, testResult, variables}
          if (tc.variables) {
            return {
              name: tc.testName || `TC${i + 1}`,
              expected: tc.testResult || '',
              requestBody: { variables: tc.variables },
            };
          }
          throw new Error(`Test case at index ${i} has an unrecognised format`);
        });

        setTestCases(normalised);
        setTestCaseResults([]);
        setTestCasesFileName(file.name);
        setTestCasesExpanded(true);
        setError(null);
      } catch (err) {
        setError(`Failed to parse test cases: ${err.message}`);
      }
    };

    reader.onerror = () => setError('Error reading test cases file');
    reader.readAsText(file);
  };

  /**
   * Run all loaded test cases against the primary decision key.
   * On the last successful run, generates NL-SBB concepts.
   */
  const handleRunTestCases = async () => {
    if (testCases.length === 0) return;

    setIsRunningTestCases(true);
    setTestCaseResults([]);

    const results = [];
    let lastSuccessResult = null;
    let lastSuccessBody = null;

    for (const tc of testCases) {
      const url = `${apiConfig.baseUrl}${apiConfig.evaluateEndpoint.replace('{key}', apiConfig.decisionKey)}`;
      const bodyStr = JSON.stringify(tc.requestBody);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic ' + btoa('demo:demo'),
          },
          body: bodyStr,
        });

        const raw = await response.text();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }

        const isRestException = raw.includes('"type":"RestException"');
        const success = !isRestException && response.ok;

        if (success) {
          lastSuccessResult = parsed;
          lastSuccessBody = bodyStr;
        }

        results.push({ name: tc.name, expected: tc.expected, success, raw, parsed });
      } catch (err) {
        results.push({
          name: tc.name,
          expected: tc.expected,
          success: false,
          raw: err.message,
          parsed: null,
        });
      }

      setTestCaseResults([...results]);
    }

    // Generate NL-SBB concepts from last successful result
    if (lastSuccessResult && lastSuccessBody) {
      generateConceptsFromTest(lastSuccessResult, lastSuccessBody);
    }

    setIsRunningTestCases(false);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setTestResponse(null);
    setDeploymentStatus(null);
    setError(null);
    setTestBody('');
    setDecisions([]);
    setIntermediateResults([]);
    setTestCases([]);
    setTestCaseResults([]);
    setTestCasesFileName('');
    setApiConfig((prev) => ({ ...prev, decisionKey: '' }));
    setValidationResult(null);
    setIsValidating(false);
    setDmnData({
      fileName: '',
      content: '',
      decisionKey: '',
      deployed: false,
      deploymentId: null,
      deployedAt: null,
      apiEndpoint: '',
      lastTestResult: null,
      lastTestTimestamp: null,
    });
    setConcepts([]);
  };

  const formatJSON = (obj) => JSON.stringify(obj, null, 2);

  const statusBadge = (status) => {
    if (status === 'ok')
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          ✅ OK
        </span>
      );
    if (status === 'error')
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          ❌ ERROR
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        ⚠️ UNEXPECTED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <FileText className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">DMN Decision Engine Integration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload DMN files, deploy to Operaton, and test decision evaluations. Successful tests
              will be saved as metadata in your TTL file.
            </p>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="text-gray-600" size={18} />
          <h4 className="font-semibold text-gray-800">API Configuration</h4>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              type="text"
              value={apiConfig.baseUrl}
              onChange={(e) => setApiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://operaton.open-regels.nl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision Key</label>
            <input
              type="text"
              value={apiConfig.decisionKey}
              onChange={(e) => {
                setApiConfig((prev) => ({ ...prev, decisionKey: e.target.value }));
                setDmnData({ ...dmnData, decisionKey: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. RONL_BerekenLeeftijden"
            />
          </div>
          {apiConfig.decisionKey && (
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Evaluation URL:</p>
              <code className="text-xs text-gray-700 break-all">
                {apiConfig.baseUrl}
                {apiConfig.evaluateEndpoint.replace('{key}', apiConfig.decisionKey)}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* DMN File Upload */}
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code className="text-gray-600" size={18} />
            <h4 className="font-semibold text-gray-800">DMN File</h4>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadExampleDMN}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Load Example
            </button>
            {uploadedFile && (
              <button
                onClick={handleClearFile}
                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear
              </button>
            )}
          </div>
        </div>

        {!uploadedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <Upload className="mx-auto text-gray-400 mb-3" size={40} />
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700 font-medium">Choose a file</span>
              <input type="file" accept=".dmn" onChange={handleFileUpload} className="hidden" />
            </label>
            <p className="text-gray-500 text-sm mt-2">or drag and drop</p>
            <p className="text-gray-400 text-xs mt-1">DMN, XML files supported</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3 flex-1">
              <CheckCircle className="text-green-600 mt-1" size={20} />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(uploadedFile.size / 1024).toFixed(2)} KB • Uploaded{' '}
                  {new Date(uploadedFile.uploadDate).toLocaleString()}
                </p>
                {apiConfig.decisionKey && (
                  <p className="text-sm text-gray-600 mt-1">
                    Decision Key:{' '}
                    <code className="bg-white px-2 py-0.5 rounded text-xs">
                      {apiConfig.decisionKey}
                    </code>
                  </p>
                )}
                {decisions.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    DRD:{' '}
                    <span className="font-medium text-gray-700">
                      {decisions.length} testable decision{decisions.length !== 1 ? 's' : ''}{' '}
                      detected
                    </span>
                    <span className="text-xs text-gray-500 ml-1">(p_* constants filtered)</span>
                  </p>
                )}
              </div>
            </div>

            {/* Syntactic Validation */}
            {(isValidating || validationResult) && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <button
                  type="button"
                  onClick={() => setValidationExpanded((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                        <span className="text-sm font-medium text-gray-700">Validating…</span>
                      </>
                    ) : validationResult?.valid ? (
                      <>
                        <ShieldCheck size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-green-700">Syntax valid</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          Syntax issues found
                        </span>
                      </>
                    )}
                    {validationResult && !isValidating && (
                      <div className="flex gap-1 ml-1">
                        {validationResult.summary.errors > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            {validationResult.summary.errors}E
                          </span>
                        )}
                        {validationResult.summary.warnings > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                            {validationResult.summary.warnings}W
                          </span>
                        )}
                        {validationResult.summary.infos > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {validationResult.summary.infos}I
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {validationResult &&
                    !isValidating &&
                    (validationExpanded ? (
                      <ChevronUp size={14} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400" />
                    ))}
                </button>

                {validationExpanded && validationResult && !isValidating && (
                  <div className="mt-2 space-y-1.5">
                    {validationResult.parseError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded px-2 py-1.5 text-xs text-red-700">
                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                        <span>{validationResult.parseError}</span>
                      </div>
                    )}
                    {Object.values(validationResult.layers).map((layer) => {
                      if (layer.issues.length === 0) return null;
                      return (
                        <div key={layer.label}>
                          <p className="text-xs font-medium text-gray-500 mb-1">{layer.label}</p>
                          {layer.issues.map((issue, idx) => {
                            const bg =
                              issue.severity === 'error'
                                ? 'bg-red-50 border-red-100 text-red-700'
                                : issue.severity === 'warning'
                                  ? 'bg-yellow-50 border-yellow-100 text-yellow-700'
                                  : 'bg-blue-50 border-blue-100 text-blue-700';
                            const Icon =
                              issue.severity === 'error'
                                ? AlertCircle
                                : issue.severity === 'warning'
                                  ? AlertTriangle
                                  : Info;
                            return (
                              <div
                                key={`${issue.code}-${idx}`}
                                className={`flex items-start gap-1.5 border rounded px-2 py-1.5 text-xs ${bg} mb-1`}
                              >
                                <Icon size={11} className="flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="font-mono opacity-60 mr-1">{issue.code}</span>
                                  {issue.message}
                                  {issue.location && (
                                    <span className="block font-mono opacity-50 truncate">
                                      {issue.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Deployment Button */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <button
                onClick={handleDeployDMN}
                disabled={isLoading || deploymentStatus?.success}
                className={`w-full px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 ${
                  deploymentStatus?.success
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Deploying...
                  </>
                ) : deploymentStatus?.success ? (
                  <>
                    <CheckCircle size={16} />
                    Deployed — ID: {deploymentStatus.data?.id?.slice(0, 8)}…
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Deploy to Operaton
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Evaluate (existing) */}
      {uploadedFile && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Play className="text-gray-600" size={18} />
            <h4 className="font-semibold text-gray-800">Test Evaluation</h4>
            <span className="text-xs text-gray-500 ml-1">(Postman-style)</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Body</label>
            {testBody && (
              <p className="text-xs text-gray-500 mb-2">
                ✨ Auto-generated from DMN input variables. Adjust values as needed.
              </p>
            )}
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter JSON request body or upload a DMN file to auto-generate"
            />
          </div>

          <button
            onClick={handleEvaluateDMN}
            disabled={isLoading || !deploymentStatus?.success}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Evaluating...
              </>
            ) : (
              <>
                <Play size={16} />
                Evaluate Decision
              </>
            )}
          </button>

          {!deploymentStatus?.success && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ Please deploy the DMN file first before testing
            </p>
          )}

          {testResponse && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Response</label>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    testResponse.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {testResponse.success ? '200 OK' : 'ERROR'}
                </span>
              </div>
              <div className="bg-gray-50 border border-gray-300 rounded-md p-4 font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {testResponse.success ? formatJSON(testResponse.data) : testResponse.error}
                </pre>
              </div>
              {testResponse.success && (
                <p className="text-xs text-gray-500 mt-2">
                  Tested at: {new Date(testResponse.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Intermediate Decision Tests ─────────────────────────────────────── */}
      {deploymentStatus?.success && decisions.length > 1 && (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setIntermediateExpanded((v) => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="text-purple-600" size={18} />
              <span className="font-semibold text-gray-800">Intermediate Decision Tests</span>
              <span className="text-xs text-gray-500">
                — test each sub-decision ({decisions.length} testable, p_* constants skipped)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {intermediateResults.length > 0 && (
                <span className="text-xs text-gray-500">
                  {intermediateResults.filter((r) => r.status === 'ok').length}/
                  {intermediateResults.length} passed
                </span>
              )}
              {intermediateExpanded ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </div>
          </button>

          {intermediateExpanded && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Calls <code className="bg-gray-100 px-1 rounded text-xs">/evaluate</code> for each{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">&lt;decision&gt;</code> in the
                DRD using the request body above.
              </p>

              <button
                onClick={handleRunIntermediateTests}
                disabled={isRunningIntermediateTests || !testBody}
                className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRunningIntermediateTests ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Running…
                  </>
                ) : (
                  <>
                    <FlaskConical size={16} />
                    Run Intermediate Tests
                  </>
                )}
              </button>

              {intermediateResults.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 text-xs font-medium text-gray-500 px-2">
                    <span>#</span>
                    <span>Decision</span>
                    <span>Result</span>
                  </div>
                  {intermediateResults.map((r, i) => (
                    <details key={r.decisionId} className="border border-gray-200 rounded">
                      <summary className="grid grid-cols-[auto_1fr_auto] gap-x-3 items-center px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm">
                        <span className="text-gray-400">{i + 1}</span>
                        <span className="font-mono text-xs text-gray-700">{r.decisionId}</span>
                        {statusBadge(r.status)}
                      </summary>
                      <div className="border-t border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1 font-medium">{r.decisionName}</p>
                        <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 overflow-x-auto max-h-48">
                          {r.status === 'ok' ? formatJSON(r.parsed) : r.raw}
                        </pre>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Test Cases ──────────────────────────────────────────────────────── */}
      {deploymentStatus?.success && (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setTestCasesExpanded((v) => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="text-indigo-600" size={18} />
              <span className="font-semibold text-gray-800">Test Cases</span>
              <span className="text-xs text-gray-500">
                — upload JSON, run all cases against the primary decision
              </span>
            </div>
            <div className="flex items-center gap-3">
              {testCases.length > 0 && (
                <span className="text-xs text-gray-500">
                  {testCaseResults.filter((r) => r.success).length}/
                  {testCaseResults.length || testCases.length} passed
                </span>
              )}
              {testCasesExpanded ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </div>
          </button>

          {testCasesExpanded && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Upload a <code className="bg-gray-100 px-1 rounded text-xs">test-cases.json</code>{' '}
                file. Supports both{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  [{'{'}name, expected, requestBody{'}'}]
                </code>{' '}
                and{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  [{'{'}testName, testResult, variables{'}'}]
                </code>
                .
              </p>

              {/* File upload */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors">
                  <Upload size={16} />
                  {testCasesFileName
                    ? `${testCasesFileName} (${testCases.length} cases)`
                    : 'Upload test-cases.json'}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleTestCasesUpload}
                    className="hidden"
                  />
                </label>
                {testCases.length > 0 && (
                  <button
                    onClick={handleRunTestCases}
                    disabled={isRunningTestCases}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {isRunningTestCases ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Running…
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Run All Test Cases
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Loaded cases list (before run) */}
              {testCases.length > 0 && testCaseResults.length === 0 && !isRunningTestCases && (
                <div className="space-y-1">
                  {testCases.map((tc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded text-sm"
                    >
                      <span className="text-gray-400 text-xs w-5">{i + 1}</span>
                      <span className="font-medium text-gray-700">{tc.name}</span>
                      <span className="text-gray-500 text-xs">→ {tc.expected}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {testCaseResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 px-2">
                    <span>
                      {testCaseResults.filter((r) => r.success).length} passed /{' '}
                      {testCaseResults.filter((r) => !r.success).length} failed
                    </span>
                    {testCaseResults.length === testCases.length && !isRunningTestCases && (
                      <span className="text-green-600 font-medium">Run complete</span>
                    )}
                  </div>
                  {testCaseResults.map((r, i) => (
                    <details key={i} className="border border-gray-200 rounded">
                      <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-gray-400 text-xs w-5 shrink-0">{i + 1}</span>
                          <span className="font-medium text-gray-700 truncate">{r.name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                            r.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.success ? '✅ OK' : '❌ FAIL'}
                        </span>
                      </summary>
                      <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Expected:</span> {r.expected}
                        </p>
                        <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 overflow-x-auto max-h-48">
                          {r.success ? formatJSON(r.parsed) : r.raw}
                        </pre>
                      </div>
                    </details>
                  ))}
                  {testCaseResults.some((r) => r.success) && (
                    <p className="text-xs text-indigo-600 mt-2">
                      💡 NL-SBB concepts updated from last successful test case result.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Info */}
      {dmnData?.deployed && testResponse?.success && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-800">Ready to Save</p>
              <p className="text-sm text-blue-700 mt-1">
                DMN metadata and test results will be included in your TTL export. Use the Download
                button to save your complete service description.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DMNTab;
