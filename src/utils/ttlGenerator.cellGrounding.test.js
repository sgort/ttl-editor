// Tests for cell-level legislative grounding TTL emission — Layer 3 of
// examples/organizations/amsterdam/cprmv-cell-level-linking-prototype.md.
//
// A DMN <inputEntry>/<outputEntry> cell carrying dct:source/cprmv:sourceQuote/
// cprmv:isBasedOn (read by dmnHelpers' extractCell, see dmnHelpers.test.js) is
// emitted as its own cprmv:Rule resource, listed in its rule's cprmv:hasPart.
// A cell with cprmv:sourceQuote is APT-grounded and emits its grounding
// directly; a cell with only dct:source (no quote) is CPT-grounded and instead
// references a deduplicated concept resource, minted once per unique source id
// and shared across every cell/rule that points at it. Compound (numbered
// attribute family) cells get their own nested hasPart list of per-grounding
// sub-resources, mixing APT/CPT-style groundings freely.

import fs from 'fs';
import path from 'path';

import { TTLGenerator } from './ttlGenerator';

const SERVICE_URI = 'https://regels.overheid.nl/services/cell-grounding-test';

const dmnContent = `<?xml version="1.0"?>
  <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
               xmlns:cprmv="https://standaarden.open-regels.nl/standards/cprmv/0.4.1#"
               xmlns:dct="http://purl.org/dc/terms/">
    <decision id="d1">
      <decisionTable id="table1">
        <rule id="rule1">
          <inputEntry id="ie1a"
                      dct:source="apt-1"
                      cprmv:sourceQuote="Woonadres"
                      cprmv:isBasedOn="https://lokaleregelgeving.overheid.nl/CVDR1/1">
            <text>true</text>
          </inputEntry>
          <inputEntry id="ie1b" dct:source="cpt-shared">
            <text>false</text>
          </inputEntry>
          <inputEntry id="ie1c">
            <text>-</text>
          </inputEntry>
          <outputEntry id="oe1a" dct:source="cpt-shared">
            <text>true</text>
          </outputEntry>
        </rule>
      </decisionTable>
      <decisionTable id="table2">
        <rule id="rule2">
          <inputEntry id="ie2a"
                      dct:source="cpt-2"
                      cprmv:isBasedOn="https://wetten.overheid.nl/jci1.3:c:BWBR0002&amp;artikel=9">
            <text>true</text>
          </inputEntry>
          <inputEntry id="ie2b"
                      dct:source1="concept-A"
                      cprmv:sourceQuote1="hij is meerderjarig"
                      cprmv:isBasedOn1="https://wetten.overheid.nl/jci1.3:c:BWBR0000001&amp;artikel=1"
                      dct:source2="concept-B">
            <text>&gt;= 21 and &lt; pensioengerechtigde leeftijd</text>
          </inputEntry>
        </rule>
      </decisionTable>
    </decision>
  </definitions>`;

const gen = () =>
  new TTLGenerator({
    service: { identifier: 'cell-grounding-test' },
    organization: {},
    legalResource: {},
    temporalRules: [],
    parameters: [],
    cprmvRules: [],
    cost: {},
    output: {},
    concepts: [],
    dmnData: { content: dmnContent, fileName: 'test.dmn', decisionKey: 'd1' },
  });

describe('cell-level legislative grounding (Layer 3)', () => {
  test('an APT-style cell (has sourceQuote) emits its grounding directly, no concept resource', () => {
    const ttl = gen().generateDmnSection();
    expect(ttl).toContain(`<${SERVICE_URI}/rules/rule1/cell/ie1a> a cprmv:Rule`);
    expect(ttl).toContain('dct:identifier "rule1-cell-ie1a"');
    expect(ttl).toContain('dct:source <https://hva.pna-web.com/hva/?type=APT&id=apt-1>');
    expect(ttl).toContain('cprmv:sourceQuote "Woonadres"');
    expect(ttl).toContain('cprmv:isBasedOn <https://lokaleregelgeving.overheid.nl/CVDR1/1>');
  });

  test('a CPT-style cell (source only, no quote) references a minted concept resource instead', () => {
    const ttl = gen().generateDmnSection();
    expect(ttl).toContain(`<${SERVICE_URI}/rules/rule1/cell/ie1b> a cprmv:Rule`);
    expect(ttl).toContain(`cprmv:isBasedOn <${SERVICE_URI}/concepts/cpt-shared>`);
    expect(ttl).toContain(`<${SERVICE_URI}/concepts/cpt-shared> a cprmv:Rule`);
    expect(ttl).toContain('dct:source <https://hva.pna-web.com/hva/?type=CPT&id=cpt-shared>');
  });

  test('the same CPT source id referenced from two different cells mints the concept exactly once', () => {
    const ttl = gen().generateDmnSection();
    // oe1a references the same concept as ie1b
    expect(ttl).toContain(`<${SERVICE_URI}/rules/rule1/cell/oe1a> a cprmv:Rule`);
    expect(ttl).toContain(`dct:identifier "rule1-cell-oe1a"`);
    const conceptOccurrences =
      ttl.split(`<${SERVICE_URI}/concepts/cpt-shared> a cprmv:Rule`).length - 1;
    expect(conceptOccurrences).toBe(1);
  });

  test('an ungrounded cell (no dct:source/cprmv attributes) gets no cell resource', () => {
    const ttl = gen().generateDmnSection();
    expect(ttl).not.toContain('cell/ie1c');
  });

  test("rule1's hasPart list includes only the grounded cells, in document order", () => {
    const ttl = gen().generateDmnSection();
    const ruleBlockMatch = ttl.match(/<[^>]*\/rules\/rule1> a cpsv:Rule[\s\S]*?\n\n/);
    expect(ruleBlockMatch).not.toBeNull();
    const ruleBlock = ruleBlockMatch[0];
    expect(ruleBlock).toContain(
      `cprmv:hasPart ( <${SERVICE_URI}/rules/rule1/cell/ie1a> <${SERVICE_URI}/rules/rule1/cell/ie1b> <${SERVICE_URI}/rules/rule1/cell/oe1a> ) .`
    );
  });

  test('a citation (cprmv:isBasedOn) on a CPT-style cell moves onto the minted concept, not the cell', () => {
    const ttl = gen().generateDmnSection();
    const conceptBlockMatch = ttl.match(
      new RegExp(
        `<${SERVICE_URI.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/concepts/cpt-2> a cprmv:Rule[\\s\\S]*?\\.\\n\\n`
      )
    );
    expect(conceptBlockMatch).not.toBeNull();
    expect(conceptBlockMatch[0]).toContain(
      'cprmv:isBasedOn <https://wetten.overheid.nl/jci1.3:c:BWBR0002&artikel=9>'
    );
    // the cell itself only points at the concept, no direct isBasedOn/quote of its own
    const cellBlockMatch = ttl.match(
      /<[^>]*\/rules\/rule2\/cell\/ie2a> a cprmv:Rule[\s\S]*?\.\n\n/
    );
    expect(cellBlockMatch[0]).not.toContain('cprmv:sourceQuote');
    expect(cellBlockMatch[0]).toContain(`cprmv:isBasedOn <${SERVICE_URI}/concepts/cpt-2>`);
  });

  test('a compound cell (numbered attribute family) gets a nested hasPart list of per-grounding resources', () => {
    const ttl = gen().generateDmnSection();
    expect(ttl).toContain(
      `<${SERVICE_URI}/rules/rule2/cell/ie2b> a cprmv:Rule ;\n    dct:identifier "rule2-cell-ie2b" ;\n    cprmv:hasPart ( <${SERVICE_URI}/rules/rule2/cell/ie2b/grounding/1> <${SERVICE_URI}/rules/rule2/cell/ie2b/grounding/2> ) .`
    );
    // grounding 1: APT-style, direct
    expect(ttl).toContain(`<${SERVICE_URI}/rules/rule2/cell/ie2b/grounding/1> a cprmv:Rule`);
    expect(ttl).toContain('dct:source <https://hva.pna-web.com/hva/?type=APT&id=concept-A>');
    expect(ttl).toContain('cprmv:sourceQuote "hij is meerderjarig"');
    // grounding 2: CPT-style, references its own minted concept
    expect(ttl).toContain(`<${SERVICE_URI}/rules/rule2/cell/ie2b/grounding/2> a cprmv:Rule`);
    expect(ttl).toContain(`cprmv:isBasedOn <${SERVICE_URI}/concepts/concept-B>`);
    expect(ttl).toContain(`<${SERVICE_URI}/concepts/concept-B> a cprmv:Rule`);
  });

  test('a DMN with no grounded cells at all emits rules with no cprmv:hasPart / no cell resources', () => {
    const plainDmn = `<?xml version="1.0"?>
      <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">
        <decision id="d1">
          <decisionTable id="table1">
            <rule id="ruleX">
              <inputEntry><text>true</text></inputEntry>
              <outputEntry><text>250</text></outputEntry>
            </rule>
          </decisionTable>
        </decision>
      </definitions>`;
    const ttl = new TTLGenerator({
      service: { identifier: 'cell-grounding-test' },
      organization: {},
      legalResource: {},
      temporalRules: [],
      parameters: [],
      cprmvRules: [],
      cost: {},
      output: {},
      concepts: [],
      dmnData: { content: plainDmn, fileName: 'test.dmn', decisionKey: 'd1' },
    }).generateDmnSection();

    expect(ttl).toContain('dct:identifier "ruleX"');
    expect(ttl).not.toContain('cell/');
    expect(ttl).not.toContain('cprmv:hasPart');
  });
});

describe('cell-level legislative grounding against the real Amsterdam DMN', () => {
  // Regression guard against the real DMN this feature was built for, not just
  // the synthetic fixture above — see cprmv-cell-level-linking-prototype.md's
  // worked "Rule 1, column by column" table and its Layer 1 before/after XML.
  const dmnPath = path.join(
    __dirname,
    '../../examples/organizations/amsterdam/individuele inkomenstoeslag-iknow-patched.dmn'
  );
  const realDmnContent = fs.readFileSync(dmnPath, 'utf-8');

  const realTtl = () =>
    new TTLGenerator({
      service: { identifier: 'individuele-inkomenstoeslag-amsterdam' },
      organization: {},
      legalResource: {},
      temporalRules: [],
      parameters: [],
      cprmvRules: [],
      cost: {},
      output: {},
      concepts: [],
      dmnData: { content: realDmnContent, fileName: 'test.dmn', decisionKey: 'd1' },
    }).generateDmnSection();

  test('Rule 1 hasPart lists exactly its 6 grounded cells (of 8 inputs + 1 output)', () => {
    const ttl = realTtl();
    const ruleBlockMatch = ttl.match(/<[^>]*\/rules\/_rule_1> a cpsv:Rule[\s\S]*?\n\n/);
    expect(ruleBlockMatch).not.toBeNull();
    expect(ruleBlockMatch[0]).toContain('cell/_inputEntry_1>');
    expect(ruleBlockMatch[0]).toContain('cell/_inputEntry_3>');
    expect(ruleBlockMatch[0]).toContain('cell/_inputEntry_4>');
    expect(ruleBlockMatch[0]).toContain('cell/_inputEntry_5>');
    expect(ruleBlockMatch[0]).toContain('cell/_inputEntry_7>');
    expect(ruleBlockMatch[0]).toContain('cell/_outputEntry_1>');
    // rightfully ungrounded: _2 (no annotation for the sub-decision), _6/_8 (wildcards)
    expect(ruleBlockMatch[0]).not.toContain('cell/_inputEntry_2>');
    expect(ruleBlockMatch[0]).not.toContain('cell/_inputEntry_6>');
    expect(ruleBlockMatch[0]).not.toContain('cell/_inputEntry_8>');
  });

  test('the three APT cells (_1, _4, _5) emit their quote + citation directly', () => {
    const ttl = realTtl();
    expect(ttl).toContain('cell/_inputEntry_1> a cprmv:Rule');
    expect(ttl).toContain(
      'dct:source <https://hva.pna-web.com/hva/?type=APT&id=61d1181d-a7e6-4da1-a121-89ca30fcb7b0>'
    );
    expect(ttl).toContain('cprmv:sourceQuote "Woonadres"');
    expect(ttl).toContain('cprmv:isBasedOn <https://lokaleregelgeving.overheid.nl/CVDR645454/12>');

    expect(ttl).toContain('cprmv:sourceQuote "hij laag inkomen had"');
    // sanitizeIri turns the DMN attribute's raw space into an underscore -- the
    // citation is otherwise the bare JCI string, resolved via citationUri exactly
    // like the existing rule-level cprmv:extends handling.
    expect(ttl).toContain(
      'cprmv:isBasedOn <https://wetten.overheid.nl/jci1.31:c:NoBWBnumber&hoofdstuk=ontbrekende_nummer&artikel=4>'
    );
  });

  test('the CPT cells (_3, _7, output) reference minted concept resources, not inline groundings', () => {
    const ttl = realTtl();
    expect(ttl).toContain('/concepts/cf35d84d-bec6-42b7-8491-9208ef44d2c9> a cprmv:Rule');
    expect(ttl).toContain(
      'dct:source <https://hva.pna-web.com/hva/?type=CPT&id=cf35d84d-bec6-42b7-8491-9208ef44d2c9>'
    );
    expect(ttl).toContain(
      'cprmv:isBasedOn <https://wetten.overheid.nl/jci1.3:c:BWBR0015703&hoofdstuk=4&paragraaf=4.1&artikel=36&z=2026-07-01&g=2026-07-01>'
    );
    expect(ttl).toContain('/concepts/8bf152a7-22a1-4624-b43b-aa9c9ff68b30> a cprmv:Rule');
    expect(ttl).toContain('/concepts/4b7157ff-2bc6-4ada-ba36-8123e6038dfe> a cprmv:Rule');
  });
});
