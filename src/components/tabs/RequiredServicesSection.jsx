import { useCallback, useEffect, useState } from 'react';

import { sanitizeServiceIdentifier } from '../../utils/dmnHelpers';
import { buildDatasetSparqlUrl, fetchPublishedServicesAt } from '../../utils/serviceCatalogHelper';

/**
 * RequiredServicesSection - the services this one makes use of (dct:requires,
 * CPSV-AP PublicService.requires). Context only: execution order lives in the
 * BPMN. Options come from the public services published to the configured
 * Triply dataset; a URI can always be pasted instead, so the required service
 * does not have to be published first.
 */
export default function RequiredServicesSection({ service, setService, triplyDBConfig }) {
  const requires = service.requires || [];
  const ownUri = service.identifier
    ? `https://regels.overheid.nl/services/${sanitizeServiceIdentifier(service.identifier)}`
    : null;

  // The list is keyed to the endpoint it was loaded from (#227): after a
  // dataset change the previous dataset's services are not shown while the new
  // request is in flight, and fields the query does not use (the API token)
  // neither refetch nor reset it.
  const endpoint = buildDatasetSparqlUrl(triplyDBConfig);
  const [loaded, setLoaded] = useState(null); // { endpoint, services, state: 'ready' | 'error' }
  const [refreshCount, setRefreshCount] = useState(0);
  const [selected, setSelected] = useState('');
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState('');

  // State is only set once the request settles, never synchronously in the
  // effect; a superseded request (endpoint change, refresh, unmount) is ignored.
  useEffect(() => {
    if (!endpoint) return undefined;
    let current = true;
    fetchPublishedServicesAt(endpoint)
      .then((services) => {
        if (current) setLoaded({ endpoint, services, state: 'ready' });
      })
      .catch((err) => {
        if (!current) return;
        console.warn('[RequiredServices] Could not load published services:', err.message);
        setLoaded({ endpoint, services: [], state: 'error' });
      });
    return () => {
      current = false;
    };
  }, [endpoint, refreshCount]);

  const refresh = useCallback(() => {
    setLoaded(null);
    setRefreshCount((n) => n + 1);
  }, []);

  const isCurrent = Boolean(endpoint) && loaded?.endpoint === endpoint;
  const published = isCurrent ? loaded.services : [];
  let shownState = 'loading';
  if (!endpoint) shownState = 'unconfigured';
  else if (isCurrent) shownState = loaded.state;

  const titleOf = (uri) => published.find((s) => s.uri === uri)?.title || uri;

  // Returns why a URI cannot be added, or '' when it can.
  const rejectionFor = (uri) => {
    // Exclude the characters Turtle's IRIREF does not allow: they would be
    // written into `dct:requires <…>` and break the file.
    if (!/^https?:\/\/[^\s<>"{}|\\^`]+$/i.test(uri)) return 'Enter an http(s) URI.';
    if (uri === ownUri) return 'A service cannot require itself.';
    if (requires.includes(uri)) return 'That service is already listed.';
    return '';
  };

  const add = (rawUri) => {
    // A URI copied out of Turtle brings its angle brackets along.
    const uri = rawUri
      .trim()
      .replace(/^<(.*)>$/, '$1')
      .trim();
    const rejection = rejectionFor(uri);
    setMessage(rejection);
    if (rejection) return false;
    setService({ ...service, requires: [...requires, uri] });
    return true;
  };

  const remove = (uri) => {
    // A rejection such as "already listed" no longer applies once the list changes (#228).
    setMessage('');
    setService({ ...service, requires: requires.filter((u) => u !== uri) });
  };

  const options = published.filter((s) => s.uri !== ownUri && !requires.includes(s.uri));

  return (
    <div>
      <p className="block text-sm text-gray-700 mb-1">
        <span className="font-medium">Required services</span>
        <span className="text-gray-500"> (dct:requires)</span>
      </p>
      <p className="text-xs text-gray-500 mb-2">
        Services this service makes use of. Context only; order lives in the BPMN.
      </p>

      {requires.length > 0 && (
        <ul className="mb-2 space-y-1">
          {requires.map((uri) => (
            <li
              key={uri}
              className="flex items-center justify-between gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm"
            >
              <span className="truncate" title={uri}>
                {titleOf(uri)}
              </span>
              <button
                type="button"
                onClick={() => remove(uri)}
                aria-label={`Remove ${titleOf(uri)}`}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 mb-2">
        <label htmlFor="service-tab-required-service-select" className="sr-only">
          Published service
        </label>
        <select
          id="service-tab-required-service-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={shownState !== 'ready'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">
            {shownState === 'loading'
              ? 'Loading published services…'
              : 'Choose a published service'}
          </option>
          {options.map((s) => (
            <option key={s.uri} value={s.uri} title={s.uri}>
              {s.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => add(selected) && setSelected('')}
          disabled={shownState !== 'ready' || !selected}
          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={!endpoint}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh list
        </button>
      </div>

      {(shownState === 'error' || shownState === 'unconfigured') && (
        <p className="text-xs text-amber-700 mb-2">
          {shownState === 'error'
            ? 'Could not load published services. You can still paste a URI.'
            : 'No Triply dataset configured. You can still paste a URI.'}
        </p>
      )}

      <div className="flex gap-2">
        <label htmlFor="service-tab-required-service-uri" className="sr-only">
          Required service URI
        </label>
        <input
          id="service-tab-required-service-uri"
          type="text"
          value={pasted}
          onChange={(e) => {
            setPasted(e.target.value);
            setMessage('');
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://…/services/…"
        />
        <button
          type="button"
          onClick={() => add(pasted) && setPasted('')}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          Add URI
        </button>
      </div>

      {message && <p className="text-xs text-red-600 mt-1">{message}</p>}
    </div>
  );
}
