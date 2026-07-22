import {
  buildResourceUri,
  encodeURIComponentTTL,
  escapeTTLString,
  formatTTLDate,
  formatTTLLiteral,
  formatTTLUri,
  isValidUri,
  sanitizeFilename,
  sanitizeIri,
  sanitizeRuleIdPath,
} from './ttlHelpers';

describe('escapeTTLString', () => {
  test('escapes backslashes, quotes, and whitespace control chars', () => {
    expect(escapeTTLString('a\\b"c\nd\re\tf')).toBe('a\\\\b\\"c\\nd\\re\\tf');
  });

  test('returns empty string for falsy input', () => {
    expect(escapeTTLString('')).toBe('');
    expect(escapeTTLString(undefined)).toBe('');
  });

  test('backslashes are escaped before quotes, not double-processed', () => {
    // A literal backslash followed by a quote must not become \\\" turning
    // into something that re-escapes the already-escaped backslash.
    expect(escapeTTLString('\\"')).toBe('\\\\\\"');
  });
});

describe('encodeURIComponentTTL', () => {
  test('replaces spaces with %20', () => {
    expect(encodeURIComponentTTL('Artikel 20 lid 1')).toBe('Artikel%2020%20lid%201');
  });

  test('returns empty string for falsy input', () => {
    expect(encodeURIComponentTTL('')).toBe('');
  });
});

describe('sanitizeFilename', () => {
  test('defaults to "service" for falsy input', () => {
    expect(sanitizeFilename('')).toBe('service');
    expect(sanitizeFilename(undefined)).toBe('service');
  });

  test('converts %20 and whitespace to hyphens, strips invalid characters', () => {
    expect(sanitizeFilename('My Service%20Name!')).toBe('My-Service-Name');
  });
});

describe('sanitizeRuleIdPath', () => {
  test('defaults to "incomplete" for falsy input', () => {
    expect(sanitizeRuleIdPath('')).toBe('incomplete');
  });

  test('converts a real CPRMV ruleIdPath into a URL-safe identifier', () => {
    expect(sanitizeRuleIdPath('BWBR0015703_2026-01-01_0, Artikel 20, lid 1, onderdeel a.')).toBe(
      'BWBR0015703_2026-01-01_0_Artikel-20_lid-1_onderdeel-a'
    );
  });

  test('collapses repeated separators and trims leading/trailing ones', () => {
    // Collapsing (_+ / -+) only merges runs of the *same* character, so a
    // mixed underscore-then-hyphen boundary (from ", " -> "_" followed by a
    // later " " -> "-") is left as "-_", not further merged into one.
    expect(sanitizeRuleIdPath(', , foo , , bar ,')).toBe('foo-_bar');
  });
});

describe('sanitizeIri', () => {
  test('replaces whitespace runs with a single underscore', () => {
    expect(sanitizeIri('foo   bar\tbaz')).toBe('foo_bar_baz');
  });

  test('percent-encodes illegal IRI characters', () => {
    expect(sanitizeIri('a<b>c"d{e}f|g^h`i\\j')).toBe('a%3Cb%3Ec%22d%7Be%7Df%7Cg%5Eh%60i%5Cj');
  });

  test('leaves structural characters (scheme, /, :, #, ?) intact', () => {
    const uri = 'https://example.com/path#frag?query=1';
    expect(sanitizeIri(uri)).toBe(uri);
  });

  test('is idempotent — re-running on already-sanitized input is a no-op', () => {
    const once = sanitizeIri('Artikel 20 <lid> 1');
    expect(sanitizeIri(once)).toBe(once);
  });

  test('coerces null/undefined to an empty string rather than throwing', () => {
    expect(sanitizeIri(null)).toBe('');
    expect(sanitizeIri(undefined)).toBe('');
  });
});

describe('formatTTLDate', () => {
  test('wraps a date string with the xsd:date type', () => {
    expect(formatTTLDate('2026-01-01')).toBe('"2026-01-01"^^xsd:date');
  });

  test('returns null for a falsy date', () => {
    expect(formatTTLDate('')).toBeNull();
  });
});

describe('formatTTLLiteral', () => {
  test('formats a plain literal without a language tag', () => {
    expect(formatTTLLiteral('hello')).toBe('"hello"');
  });

  test('formats a literal with a language tag', () => {
    expect(formatTTLLiteral('hallo', 'nl')).toBe('"hallo"@nl');
  });

  test('escapes the value before quoting', () => {
    expect(formatTTLLiteral('quote " here')).toBe('"quote \\" here"');
  });

  test('returns null for a falsy value', () => {
    expect(formatTTLLiteral('')).toBeNull();
  });
});

describe('formatTTLUri', () => {
  test('wraps a URI in angle brackets', () => {
    expect(formatTTLUri('https://example.com')).toBe('<https://example.com>');
  });

  test('returns null for a falsy URI', () => {
    expect(formatTTLUri('')).toBeNull();
  });
});

describe('isValidUri', () => {
  test.each([
    ['https://example.com', true],
    ['http://example.com', true],
    ['ftp://example.com', false],
    ['not a uri', false],
    ['', false],
  ])('isValidUri(%p) -> %p', (input, expected) => {
    expect(isValidUri(input)).toBe(expected);
  });
});

describe('buildResourceUri', () => {
  test('returns a full URI unchanged', () => {
    expect(buildResourceUri('https://example.com/org/1')).toBe('https://example.com/org/1');
  });

  test('constructs a URI from a bare identifier using the default base path', () => {
    expect(buildResourceUri('my org')).toBe('https://regels.overheid.nl/organizations/my%20org');
  });

  test('uses a custom base path when provided', () => {
    expect(buildResourceUri('foo', 'https://example.com/things/')).toBe(
      'https://example.com/things/foo'
    );
  });

  test('returns null for a falsy identifier', () => {
    expect(buildResourceUri('')).toBeNull();
  });
});
