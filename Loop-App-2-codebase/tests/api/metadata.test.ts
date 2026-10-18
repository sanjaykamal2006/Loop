import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('SEO metadata routes', () => {
  it('robots.txt allows public pages, blocks the API and screenshot tool, and links the sitemap', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules?.disallow).toEqual(
      expect.arrayContaining(['/api/', '/screenshots-preview'])
    );
    expect(rules?.allow).toEqual(expect.arrayContaining(['/']));
    expect(result.sitemap).toContain('/sitemap.xml');
  });

  it('sitemap.xml lists home, terms, and privacy exactly once each', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toHaveLength(3);
    expect(urls.some((url) => url.endsWith('/terms'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/privacy'))).toBe(true);

    const home = urls.find((url) => !url.endsWith('/terms') && !url.endsWith('/privacy'));
    expect(home).toBeTruthy();
    expect(home).not.toContain('/terms');
  });
});
