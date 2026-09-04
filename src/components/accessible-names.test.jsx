import { render, screen } from '@testing-library/react';

import CostSection from './tabs/CostSection';
import CPRMVTab from './tabs/CPRMVTab';
import LegalTab from './tabs/LegalTab';
import OrganizationTab from './tabs/OrganizationTab';
import OutputSection from './tabs/OutputSection';
import ParametersTab from './tabs/ParametersTab';
import RulesTab from './tabs/RulesTab';
import ServiceTab from './tabs/ServiceTab';
import VendorTab from './tabs/VendorTab';

/**
 * The guard for the label-association change.
 *
 * 102 form controls had no id and no htmlFor, so getByLabelText was unusable and
 * screen readers had nothing to announce. The lint rule
 * (jsx-a11y/label-has-associated-control) proves a htmlFor EXISTS; it cannot
 * prove it RESOLVES — a typo'd htmlFor, or a duplicated id from the index-scoped
 * scheme applied wrongly, both pass lint and both silently leave the control
 * unnamed.
 *
 * toHaveAccessibleName computes the name the way a browser does, following the
 * association. So this asserts the thing the lint rule cannot: that every
 * rendered control actually has a name a user of assistive technology would
 * hear.
 *
 * Rows rendered from arrays are included deliberately — their ids are
 * index-scoped, and a static id repeated across rows is the most likely way this
 * scheme breaks.
 */

const NAMED_ROLES = ['textbox', 'combobox', 'spinbutton', 'checkbox', 'radio'];

const expectEveryControlToBeNamed = () => {
  const controls = NAMED_ROLES.flatMap((role) => screen.queryAllByRole(role));

  // A component that renders no controls at all would pass vacuously.
  expect(controls.length).toBeGreaterThan(0);

  // Asking Testing Library for controls WITH a non-empty accessible name, then
  // taking the difference, reports which control is unnamed rather than just
  // that one is — "Expected element to have accessible name" on its own makes
  // you hunt through the render for which of thirty it meant.
  const named = new Set(NAMED_ROLES.flatMap((role) => screen.queryAllByRole(role, { name: /\S/ })));

  const unnamed = controls
    .filter((c) => !named.has(c))
    .map(
      (c) =>
        `<${c.tagName.toLowerCase()} type="${c.getAttribute('type') ?? ''}"` +
        ` id="${c.id}" placeholder="${c.getAttribute('placeholder') ?? ''}">`
    );

  expect(unnamed).toEqual([]);
};

const service = {
  identifier: 'svc-1',
  name: '',
  description: '',
  authority: '',
  sector: '',
  customSector: '',
  keywords: '',
  language: '',
};
const cost = { identifier: 'cost-1', value: '', description: '', currency: 'EUR' };
const output = { identifier: 'out-1', name: '', description: '', type: '' };
const organization = { identifier: '', name: '', homepage: '' };
const legalResource = { bwbId: '', version: '', title: '', description: '' };
const dmnData = {
  isImported: false,
  deployed: false,
  validationStatus: 'not-validated',
  fileName: '',
  content: '',
};

const rows = (extra = {}) => [
  { id: 1, ...extra },
  { id: 2, ...extra },
];

describe('every form control has an accessible name', () => {
  test('ServiceTab', () => {
    render(
      <ServiceTab
        service={service}
        setService={vi.fn()}
        cost={cost}
        setCost={vi.fn()}
        output={output}
        setOutput={vi.fn()}
      />
    );
    expectEveryControlToBeNamed();
  });

  test('CostSection, with its progressive-disclosure fields revealed', () => {
    render(<CostSection cost={cost} setCost={vi.fn()} />);
    expectEveryControlToBeNamed();
  });

  test('OutputSection, with its progressive-disclosure fields revealed', () => {
    render(<OutputSection output={output} setOutput={vi.fn()} />);
    expectEveryControlToBeNamed();
  });

  test('OrganizationTab', () => {
    render(
      <OrganizationTab
        organization={organization}
        setOrganization={vi.fn()}
        dmnData={dmnData}
        setDmnData={vi.fn()}
      />
    );
    expectEveryControlToBeNamed();
  });

  test('LegalTab', () => {
    render(
      <LegalTab
        legalResource={legalResource}
        setLegalResource={vi.fn()}
        ronlAnalysis=""
        setRonlAnalysis={vi.fn()}
        ronlMethod=""
        setRonlMethod={vi.fn()}
        analysisConcepts={[]}
        methodConcepts={[]}
        loadingConcepts={false}
        conceptsError={null}
      />
    );
    expectEveryControlToBeNamed();
  });

  test('ParametersTab, across two rows', () => {
    render(
      <ParametersTab
        parameters={rows({ notation: '', label: '', value: '', unit: 'EUR', description: '' })}
        addParameter={vi.fn()}
        removeParameter={vi.fn()}
        updateParameter={vi.fn()}
      />
    );
    expectEveryControlToBeNamed();
  });

  test('RulesTab, across two rows', () => {
    render(
      <RulesTab
        temporalRules={rows({ identifier: '', title: '', uri: '', extends: '' })}
        addTemporalRule={vi.fn()}
        removeTemporalRule={vi.fn()}
        updateTemporalRule={vi.fn()}
      />
    );
    expectEveryControlToBeNamed();
  });

  test('CPRMVTab, across two rows', () => {
    render(
      <CPRMVTab
        cprmvRules={rows({ ruleId: '', rulesetId: '', definition: '', ruleIdPath: '' })}
        addCPRMVRule={vi.fn()}
        removeCPRMVRule={vi.fn()}
        updateCPRMVRule={vi.fn()}
        handleImportJSON={vi.fn()}
        setCprmvRules={vi.fn()}
        legalResource={legalResource}
      />
    );
    expectEveryControlToBeNamed();
  });

  test('VendorTab, with the Blueriq detail form open', () => {
    render(
      <VendorTab
        mappingConfig={{ mappings: {} }}
        setMappingConfig={vi.fn()}
        availableMappings={[]}
        onImportComplete={vi.fn()}
        vendorService={{
          selectedVendor: 'https://regels.overheid.nl/termen/Blueriq',
          contact: {
            organizationName: '',
            contactPerson: '',
            email: '',
            phone: '',
            website: '',
            logo: '',
          },
          serviceNotes: '',
          technical: { serviceUrl: '', license: '', accessType: 'fair-use' },
          certification: {
            status: 'not-certified',
            certifiedBy: '',
            certifiedAt: '',
            certificationNote: '',
          },
        }}
        setVendorService={vi.fn()}
        vendorConcepts={[{ uri: 'https://regels.overheid.nl/termen/Blueriq', label: 'Blueriq' }]}
        loadingVendors={false}
        vendorsError=""
        service={{}}
        organization={{}}
      />
    );
    expectEveryControlToBeNamed();
  });
});

describe('ids are unique across rows rendered from an array', () => {
  test('two parameter rows do not share an id', () => {
    // The index-scoped scheme is what makes this true. A static id would repeat
    // here, silently pointing every label at the first row's control — which
    // both the lint rule and a single-row test would miss.
    render(
      <ParametersTab
        parameters={rows({ notation: '', label: '', value: '', unit: 'EUR', description: '' })}
        addParameter={vi.fn()}
        removeParameter={vi.fn()}
        updateParameter={vi.fn()}
      />
    );

    const ids = screen
      .queryAllByRole('textbox')
      .map((el) => el.id)
      .filter(Boolean);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
