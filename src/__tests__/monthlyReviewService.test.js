import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { monthlyReviewService } from '../api';

// Service-level contract for the photo gallery API (finance-review-photo-paste, task 6.6).
describe('monthlyReviewService.updateImages', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 7, images: ['data:image/png;base64,AAA'] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PATCHes /api/monthly-reviews/:id/images with { images }', async () => {
    const images = ['data:image/png;base64,AAA'];
    const result = await monthlyReviewService.updateImages(7, images);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/monthly-reviews/7/images');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ images });
    expect(result).toEqual({ id: 7, images });
  });

  it('sends an empty array when the last photo is removed', async () => {
    await monthlyReviewService.updateImages(7, []);
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ images: [] });
  });
});

