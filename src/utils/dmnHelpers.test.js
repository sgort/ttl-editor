import {
  buildServiceUri,
  evaluateTestCaseExpectation,
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  extractPrimaryDecisionKey,
  extractRulesFromDMN,
  generateConceptDefinition,
  generateConceptLabel,
  generateConceptNotation,
  generateConceptUri,
  sanitizeServiceIdentifier,
  validateDMNData,
} from './dmnHelpers';

describe('sanitizeServiceIdentifier', () => {
  test('defaults to "unknown-service" for falsy input', () => {
    expect(sanitizeServiceIdentifier('')).toBe('unknown-service');
    expect(sanitizeServiceIdentifier(undefined)).toBe('unknown-service');
  });

  test('lowercases, hyphenates spaces, strips invalid chars, trims edges', () => {
    expect(sanitizeServiceIdentifier('  My Service! Name  ')).toBe('my-service-name');
  });

  test('collapses repeated hyphens', () => {
    expect(sanitizeServiceIdentifier('a -- b')).toBe('a-b');
  });
});

describe('buildServiceUri', () => {
  test('builds a full URI from a sanitized identifier', () => {
    expect(buildServiceUri('My Service')).toBe('https://regels.overheid.nl/services/my-service');
  });
});

function decisionsDmn(decisions) {
  // decisions: [{ id, requires: [otherId, ...] }]
  const decisionXml = decisions
    .map(
      (d) => `
      <decision id="${d.id}" name="${d.id}">
        ${(d.requires || [])
          .map(
            (r) =>
              `<informationRequirement><requiredDecision href="#${r}" /></informationRequirement>`
          )
          .join('\n')}
      </decision>`
    )
    .join('\n');
  return `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">${decisionXml}</definitions>`;
}

describe('extractPrimaryDecisionKey', () => {
  test('returns the sole decision when there is only one', () => {
    const xml = decisionsDmn([{ id: 'onlyDecision' }]);
    expect(extractPrimaryDecisionKey(xml)).toBe('onlyDecision');
  });

  test('prefers a root decision — one nothing else requires', () => {
    const xml = decisionsDmn([
      { id: 'intermediate', requires: [] },
      { id: 'root', requires: ['intermediate'] },
    ]);
    expect(extractPrimaryDecisionKey(xml)).toBe('root');
  });

  test('skips p_* constant decisions', () => {
    const xml = decisionsDmn([{ id: 'p_someConstant' }, { id: 'realDecision' }]);
    expect(extractPrimaryDecisionKey(xml)).toBe('realDecision');
  });

  test('falls back to the first decision when every decision is a p_* constant', () => {
    const xml = decisionsDmn([{ id: 'p_a' }, { id: 'p_b' }]);
    expect(extractPrimaryDecisionKey(xml)).toBe('p_a');
  });

  test('with multiple independent roots, document order breaks the tie', () => {
    const xml = decisionsDmn([{ id: 'firstRoot' }, { id: 'secondRoot' }]);
    expect(extractPrimaryDecisionKey(xml)).toBe('firstRoot');
  });

  test('returns an empty string when there are no decisions at all', () => {
    const xml = `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"></definitions>`;
    expect(extractPrimaryDecisionKey(xml)).toBe('');
  });

  test('returns an empty string rather than throwing on malformed input', () => {
    expect(extractPrimaryDecisionKey(null)).toBe('');
  });
});

describe('extractInputsFromTestResult', () => {
  test('returns [] when there is no testBody', () => {
    expect(extractInputsFromTestResult({})).toEqual([]);
  });

  test('parses a JSON-string testBody', () => {
    const dmnData = {
      testBody: JSON.stringify({
        variables: { leeftijd: { type: 'Integer', value: 65 } },
      }),
    };
    expect(extractInputsFromTestResult(dmnData)).toEqual([
      { name: 'leeftijd', type: 'Integer', exampleValue: 65 },
    ]);
  });

  test('accepts an already-parsed object testBody', () => {
    const dmnData = { testBody: { variables: { naam: { type: 'String', value: 'Jan' } } } };
    expect(extractInputsFromTestResult(dmnData)).toEqual([
      { name: 'naam', type: 'String', exampleValue: 'Jan' },
    ]);
  });

  test('returns [] rather than throwing on unparseable testBody', () => {
    expect(extractInputsFromTestResult({ testBody: '{not json' })).toEqual([]);
  });
});

describe('extractOutputsFromTestResult', () => {
  test('returns [] when there is no lastTestResult', () => {
    expect(extractOutputsFromTestResult({})).toEqual([]);
  });

  test('handles the array-of-objects Operaton format', () => {
    const dmnData = {
      lastTestResult: [{ rechtOpSubsidie: { value: true, type: 'Boolean' } }],
    };
    expect(extractOutputsFromTestResult(dmnData)).toEqual([
      { name: 'rechtOpSubsidie', type: 'Boolean', exampleValue: true },
    ]);
  });

  test('handles the direct-object Operaton format', () => {
    const dmnData = {
      lastTestResult: { hoogte: { value: 250, type: 'Integer' } },
    };
    expect(extractOutputsFromTestResult(dmnData)).toEqual([
      { name: 'hoogte', type: 'Integer', exampleValue: 250 },
    ]);
  });

  test('ignores object-format entries without a value property', () => {
    const dmnData = { lastTestResult: { notAnOutput: 'plain string' } };
    expect(extractOutputsFromTestResult(dmnData)).toEqual([]);
  });
});

describe('extractRulesFromDMN', () => {
  test('returns [] for empty content', () => {
    expect(extractRulesFromDMN('', 'https://regels.overheid.nl/services/x')).toEqual([]);
  });

  test('extracts rule attributes and input/output entry text', () => {
    const xml = `<?xml version="1.0"?>
      <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
                   xmlns:cprmv="https://standaarden.open-regels.nl/standards/cprmv/0.4.1#">
        <decision id="d1">
          <decisionTable id="table1">
            <rule id="rule1" cprmv:extends="https://wetten.overheid.nl/BWBR1/Art1"
                  cprmv:validFrom="2026-01-01" cprmv:confidence="high">
              <inputEntry><text>true</text></inputEntry>
              <outputEntry><text>250</text></outputEntry>
            </rule>
          </decisionTable>
        </decision>
      </definitions>`;
    const rules = extractRulesFromDMN(xml, 'https://regels.overheid.nl/services/my service');

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      id: 'rule1',
      uri: 'https://regels.overheid.nl/services/my-service/rules/rule1',
      extends: 'https://wetten.overheid.nl/BWBR1/Art1',
      validFrom: '2026-01-01',
      confidence: 'high',
      inputs: ['true'],
      outputs: ['250'],
      tableId: 'table1',
    });
  });

  test('returns [] rather than throwing on malformed content', () => {
    expect(extractRulesFromDMN('<not-valid', 'https://example.com')).toEqual([]);
  });
});

describe('validateDMNData', () => {
  test('is valid when dmnData is absent entirely (DMN is optional)', () => {
    expect(validateDMNData(null)).toEqual({ valid: true, errors: [] });
  });

  test('flags a fileName with no content', () => {
    const result = validateDMNData({ fileName: 'foo.dmn' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('DMN file name exists but content is missing');
  });

  test('flags deployed=true with no deploymentId', () => {
    const result = validateDMNData({ deployed: true });
    expect(result.errors).toContain('DMN is marked as deployed but has no deployment ID');
  });

  test('flags invalid XML content', () => {
    const result = validateDMNData({ content: '<not<valid' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('DMN content is not valid XML');
  });

  test('passes with well-formed, fully-populated data', () => {
    const result = validateDMNData({
      fileName: 'foo.dmn',
      content: '<?xml version="1.0"?><definitions></definitions>',
      deployed: true,
      deploymentId: 'dep-1',
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });
});

describe('generateConceptUri', () => {
  test('scopes the concept under the sanitized service identifier', () => {
    expect(generateConceptUri('geboortedatumAanvrager', 'My Service')).toBe(
      'https://regels.overheid.nl/concepts/my-service/geboortedatumAanvrager'
    );
  });
});

describe('generateConceptLabel', () => {
  test('splits normal camelCase into words and capitalizes the first', () => {
    expect(generateConceptLabel('datumAanvrager')).toBe('Datum Aanvrager');
  });

  test('keeps acronyms together instead of splitting every capital', () => {
    expect(generateConceptLabel('AOWDatum')).toBe('AOW Datum');
  });
});

describe('generateConceptDefinition', () => {
  test('produces an input-flavored Dutch definition', () => {
    expect(generateConceptDefinition('leeftijd', 'Integer', 'input')).toBe(
      'Leeftijd is een numerieke waarde die als invoer dient voor de beslisregel.'
    );
  });

  test('produces an output-flavored Dutch definition', () => {
    expect(generateConceptDefinition('rechtOpSubsidie', 'Boolean', 'output')).toBe(
      'Recht Op Subsidie is een ja/nee waarde die als uitvoer wordt gegenereerd door de beslisregel.'
    );
  });

  test('falls back to a generic type description for an unknown type', () => {
    expect(generateConceptDefinition('iets', 'SomeExoticType', 'input')).toContain('een waarde');
  });
});

describe('generateConceptNotation', () => {
  test('takes the first letter of each camelCase word', () => {
    expect(generateConceptNotation('geboortedatumAanvrager')).toBe('GA');
  });

  test('keeps a leading acronym intact when building initials', () => {
    expect(generateConceptNotation('AOWDatumPartner')).toBe('ADP');
  });

  test('expands a single-word name that would otherwise be one letter', () => {
    expect(generateConceptNotation('leeftijd')).toBe('LEEF');
  });

  test('shortens an overly long notation to <= 6 characters', () => {
    const notation = generateConceptNotation('eenHeleLangeVariabeleNaamHier');
    expect(notation.length).toBeLessThanOrEqual(6);
  });

  test('appends a counter on collision with an existing notation', () => {
    expect(generateConceptNotation('geboortedatumAanvrager', ['GA'])).toBe('GA1');
    expect(generateConceptNotation('geboortedatumAanvrager', ['GA', 'GA1'])).toBe('GA2');
  });
});

describe('evaluateTestCaseExpectation', () => {
  test('passes when a structured expectation matches the flattened output', () => {
    const parsed = [{ rechtOpSubsidie: { value: true, type: 'Boolean' } }];
    const result = evaluateTestCaseExpectation({ rechtOpSubsidie: true }, parsed);
    expect(result.verdict).toBe('pass');
    expect(result.mismatches).toEqual([]);
  });

  test('fails and reports mismatches when values differ', () => {
    const parsed = [{ hoogte: { value: 100 } }];
    const result = evaluateTestCaseExpectation({ hoogte: 250 }, parsed);
    expect(result.verdict).toBe('fail');
    expect(result.mismatches).toEqual([{ key: 'hoogte', expected: 250, actual: 100 }]);
  });

  test('parses a human-readable expected string with quoted values', () => {
    const parsed = [
      { rechtOpSubsidie: { value: false }, reden: { value: 'Aanvrager is failliet' } },
    ];
    const result = evaluateTestCaseExpectation(
      "rechtOpSubsidie=false, reden='Aanvrager is failliet'",
      parsed
    );
    expect(result.verdict).toBe('pass');
  });

  test('treats "empty result" / "no matching rule" as expecting an empty output set', () => {
    expect(evaluateTestCaseExpectation('empty result', []).verdict).toBe('pass');
    expect(evaluateTestCaseExpectation('no matching rule', [{}]).verdict).toBe('pass');
  });

  test('treats a literal "[]" the same as a descriptive empty-result expectation', () => {
    expect(evaluateTestCaseExpectation('[]', []).verdict).toBe('pass');
    expect(evaluateTestCaseExpectation('[]', [{ x: { value: 1 } }]).verdict).toBe('fail');
  });

  test('returns unverified when the expectation has nothing parseable', () => {
    const result = evaluateTestCaseExpectation('some free-form prose', [{ x: { value: 1 } }]);
    expect(result.verdict).toBe('unverified');
  });

  test('loosely compares string/number representations', () => {
    const parsed = [{ hoogte: { value: '250' } }];
    const result = evaluateTestCaseExpectation({ hoogte: 250 }, parsed);
    expect(result.verdict).toBe('pass');
  });
});
