import { describe, expect, test } from 'vitest';

import { getProblemDetail } from './problem';

describe('getProblemDetail', () => {
  test('reads detail from an RFC 9457 problem response', () => {
    const body = {
      type: 'about:blank',
      status: 400,
      title: 'Bad Request',
      detail: 'Host not allowed: evil.example',
      instance: '/v1/triplydb/update-service',
      code: 'INVALID_INPUT',
    };

    expect(getProblemDetail(body, 'fallback')).toBe('Host not allowed: evil.example');
  });

  test('reads error.message from the older envelope PROD still answers', () => {
    const body = { success: false, error: { code: 'INVALID_INPUT', message: 'Malformed DMN' } };

    expect(getProblemDetail(body, 'fallback')).toBe('Malformed DMN');
  });

  test('reads a bare-string error', () => {
    expect(getProblemDetail({ success: false, error: 'upstream unreachable' }, 'fallback')).toBe(
      'upstream unreachable'
    );
  });

  test('prefers detail when a body carries more than one shape', () => {
    const body = { detail: 'new reason', error: { message: 'old reason' } };

    expect(getProblemDetail(body, 'fallback')).toBe('new reason');
  });

  test('skips an empty detail and falls through to the older shapes', () => {
    expect(getProblemDetail({ detail: '', error: { message: 'old reason' } }, 'fallback')).toBe(
      'old reason'
    );
  });

  test('falls back when the body carries no reason', () => {
    expect(getProblemDetail({ success: false }, 'fallback')).toBe('fallback');
    expect(getProblemDetail({ error: { code: 'X' } }, 'fallback')).toBe('fallback');
    expect(getProblemDetail({ detail: 42 }, 'fallback')).toBe('fallback');
  });

  test('falls back for input that is not an object', () => {
    expect(getProblemDetail(null, 'fallback')).toBe('fallback');
    expect(getProblemDetail(undefined, 'fallback')).toBe('fallback');
    expect(getProblemDetail('Internal Server Error', 'fallback')).toBe('fallback');
  });
});
