import { useEffect, useRef } from 'react';

import { extractPrimaryDecisionKey } from '../utils/dmnHelpers';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Query params that make up the LDE → CPSV Editor deep-link contract.
const DSO_IMPORT_PARAMS = [
  'dsoImport',
  'dmnId',
  'env',
  'activityName',
  'authority',
  'activityUrn',
  'fsRef',
];

/**
 * Consumes the DSO → DMN publish handoff deep-link from the Linked Data Explorer.
 *
 * When the app is opened with:
 *   /?dsoImport=dmn&dmnId=<id>&env=<pre|prod>&activityName=<...>
 *     &authority=<...>&activityUrn=<...>&fsRef=<...>
 * this hook (once, on mount):
 *   1. fetches the standalone DMN XML from the shared backend,
 *   2. prefills the DMN / Service / Organization tabs (keeping the DMN tab
 *      interactive — NOT the imported-preserved mode),
 *   3. switches to the DMN tab and raises a review banner,
 *   4. strips the import params from the URL so a refresh can't re-import.
 *
 * Deploy + publish then run through the existing DMNTab / PublishDialog flow.
 *
 * @param {Object}   handlers
 * @param {Function} handlers.setDmnData      - dmnData setter (useEditorState)
 * @param {Function} handlers.setService      - service setter (useEditorState)
 * @param {Function} handlers.setOrganization - organization setter (useEditorState)
 * @param {Function} handlers.setActiveTab    - active-tab setter (App)
 * @param {Function} handlers.notify          - ({ type, message }) => void banner reporter
 */
export function useDsoImport({ setDmnData, setService, setOrganization, setActiveTab, notify }) {
  const consumedRef = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke and re-renders.
    if (consumedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('dsoImport') !== 'dmn') return;
    consumedRef.current = true;

    const dmnId = params.get('dmnId') || '';
    const env = params.get('env') || 'pre';
    const activityName = params.get('activityName') || '';
    const authority = params.get('authority') || '';
    const activityUrn = params.get('activityUrn') || '';
    const fsRef = params.get('fsRef') || '';

    // Strip the import params immediately so a refresh can't re-trigger the import.
    cleanUrl();

    const run = async () => {
      if (!dmnId) {
        notify({ type: 'error', message: 'DSO import: missing dmnId in the deep-link.' });
        return;
      }

      notify({ type: 'info', message: `Importing DMN ${dmnId} from DSO…` });

      try {
        const url =
          `${BACKEND_URL}/v1/dso/toepasbare-regels/${encodeURIComponent(dmnId)}/dmn` +
          (env === 'prod' ? '?env=prod' : '');

        const response = await fetch(url, { headers: { Accept: 'application/xml' } });
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status} ${response.statusText}`);
        }

        const dmnContent = await response.text();
        if (!dmnContent || !dmnContent.trim()) {
          throw new Error('Backend returned an empty DMN document');
        }

        const decisionKey = extractPrimaryDecisionKey(dmnContent);

        // Prefill DMN tab — keep it interactive (do NOT set imported-preserved mode).
        setDmnData((prev) => ({
          ...prev,
          fileName: `decision-${dmnId}.dmn`,
          content: dmnContent,
          decisionKey,
          deployed: false,
          deploymentId: null,
          deployedAt: null,
          isImported: false,
        }));

        // Prefill Service tab from the DSO activity.
        if (activityName || activityUrn) {
          setService((prev) => ({
            ...prev,
            name: activityName || prev.name,
            identifier: activityUrn || prev.identifier || `dso-${dmnId}`,
            description: buildProvenanceDescription(activityUrn, fsRef) || prev.description,
          }));
        }

        // Prefill Organization tab from the resolved authority.
        if (authority) {
          setOrganization((prev) => ({
            ...prev,
            name: authority,
            identifier: prev.identifier || authority,
          }));
        }

        setActiveTab('dmn');
        notify({
          type: 'info',
          message: `Imported "${activityName || `DMN ${dmnId}`}" from DSO — review, deploy, and publish.`,
        });
      } catch (err) {
        console.error('[DSO import] failed:', err);
        notify({
          type: 'error',
          message: `DSO import failed: ${err.message}. You can still upload the DMN manually.`,
        });
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Remove the DSO import params from the address bar without a navigation/reload. */
function cleanUrl() {
  const url = new URL(window.location.href);
  DSO_IMPORT_PARAMS.forEach((p) => url.searchParams.delete(p));
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

/** Build a Dutch provenance sentence for the Service description from DSO refs. */
function buildProvenanceDescription(activityUrn, fsRef) {
  const parts = [];
  if (activityUrn) parts.push(`DSO-activiteit ${activityUrn}`);
  if (fsRef) parts.push(`functionele structuur ${fsRef}`);
  if (parts.length === 0) return '';
  return `Geïmporteerd uit DSO (${parts.join(', ')}).`;
}
