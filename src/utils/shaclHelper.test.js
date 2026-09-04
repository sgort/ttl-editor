import { validateTtl } from './shaclHelper';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateTtl', () => {
  test('returns the backend result data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          valid: true,
          layers: {
            cprmv: { label: 'CPRMV 0.4.1', issues: [] },
            'cpsv-ap': { label: 'CPSV-AP 3.2.0', issues: [] },
            'ronl-custom': { label: 'RONL Custom', issues: [] },
          },
          summary: { errors: 0, warnings: 0, infos: 0 },
        },
      }),
    });

    const result = await validateTtl('@prefix cpsv: <http://purl.org/vocab/cpsv#> .');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/shacl/validate'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result).toEqual({
      valid: true,
      layers: expect.any(Object),
      summary: { errors: 0, warnings: 0, infos: 0 },
    });
  });

  test('returns a neutral invalid shape when the backend responds but success is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: { message: 'Malformed Turtle' } }),
    });

    const result = await validateTtl('not turtle');

    expect(result.valid).toBe(false);
    expect(result.parseError).toBe('Malformed Turtle');
    expect(result.summary).toEqual({ errors: 1, warnings: 0, infos: 0 });
    expect(result.unavailable).toBeUndefined();
  });

  test('never throws — a network failure yields a distinct unavailable state instead', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

    const result = await validateTtl('@prefix cpsv: <http://purl.org/vocab/cpsv#> .');

    expect(result.valid).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(result.parseError).toContain('validation backend could not be reached');
    expect(result.summary).toEqual({ errors: 0, warnings: 0, infos: 0 });
  });
});
