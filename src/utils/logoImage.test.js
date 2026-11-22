import { fitWithin, VENDOR_LOGO_MAX_SIDE } from './logoImage';

/**
 * Vendor logos are scaled down before they are stored (#336 in
 * linked-data-explorer). Read as-is, a large file made the publish body pass
 * the backend's 10 MB limit, and the whole publish failed with 413 instead of
 * just the logo.
 *
 * Unlike the organisation logo (cropped to a 256 x 256 square), a vendor logo
 * keeps its proportions: they are often wide wordmarks.
 */
describe('fitWithin', () => {
  test('leaves an image that already fits unchanged', () => {
    expect(fitWithin(300, 120, 512)).toEqual({ width: 300, height: 120 });
    expect(fitWithin(512, 512, 512)).toEqual({ width: 512, height: 512 });
  });

  test('scales a wide image to the maximum width, keeping its proportions', () => {
    expect(fitWithin(4000, 1000, 512)).toEqual({ width: 512, height: 128 });
  });

  test('scales a tall image to the maximum height, keeping its proportions', () => {
    expect(fitWithin(900, 3600, 512)).toEqual({ width: 128, height: 512 });
  });

  test('never rounds a side down to zero', () => {
    expect(fitWithin(10000, 1, 512)).toEqual({ width: 512, height: 1 });
  });

  test('the vendor maximum is 512 pixels on the longest side', () => {
    expect(VENDOR_LOGO_MAX_SIDE).toBe(512);
  });
});
