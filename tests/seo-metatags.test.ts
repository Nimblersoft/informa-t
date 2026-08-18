import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("SEO & Social Sharing Metatags Validation", () => {
  const rootDir = path.resolve(__dirname, "..");
  const indexPath = path.join(rootDir, "src/index.html");
  const presentationHtmlPath = path.join(rootDir, "src/public/presentation/index.html");
  const ogImagePath = path.join(rootDir, "src/public/assets/og-image.jpg");
  const ogImageRootPath = path.join(rootDir, "src/public/og-image.jpg");
  const faviconSvgPath = path.join(rootDir, "src/public/favicon.svg");
  const manifestPath = path.join(rootDir, "src/public/site.webmanifest");

  it("ensures public social sharing assets and icons exist with valid sizes", () => {
    expect(fs.existsSync(ogImagePath), "og-image.jpg in assets directory").toBe(true);
    expect(fs.statSync(ogImagePath).size).toBeGreaterThan(10000);

    expect(fs.existsSync(ogImageRootPath), "og-image.jpg fallback in public root").toBe(true);
    expect(fs.statSync(ogImageRootPath).size).toBeGreaterThan(10000);

    expect(fs.existsSync(faviconSvgPath), "favicon.svg").toBe(true);
    expect(fs.statSync(faviconSvgPath).size).toBeGreaterThan(500);

    expect(fs.existsSync(manifestPath), "site.webmanifest").toBe(true);
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifestContent.name).toContain("informa-t");
    expect(manifestContent.icons.length).toBeGreaterThan(0);
  });

  it("verifies main index.html contains essential SEO tags, Open Graph, and Twitter Cards", () => {
    const html = fs.readFileSync(indexPath, "utf-8");

    // Primary SEO
    expect(html).toMatch(/<title>[\s\S]*informa-t[\s\S]*<\/title>/i);
    expect(html).toMatch(/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+name=["']keywords["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+name=["']author["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+name=["']robots["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<link\s+rel=["']canonical["']/i);

    // Open Graph
    expect(html).toMatch(/<meta\s+property=["']og:type["']\s+content=["']website["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:site_name["']\s+content=["']informa-t["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:title["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:description["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:image["']\s+content=["'][^"']+og-image\.jpg["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:image:width["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:image:height["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:locale["']/i);

    // Twitter Cards
    expect(html).toMatch(/<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']/i);
    expect(html).toMatch(/<meta\s+name=["']twitter:title["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+name=["']twitter:description["']\s+content=["'][^"']+["']/i);
    expect(html).toMatch(/<meta\s+name=["']twitter:image["']\s+content=["'][^"']+og-image\.jpg["']/i);

    // Favicon and theme
    expect(html).toMatch(/<link\s+rel=["']icon["']\s+type=["']image\/svg\+xml["']\s+href=["']\/favicon\.svg["']/i);
    expect(html).toMatch(/<meta\s+name=["']theme-color["']/i);

    // Schema.org Structured Data
    expect(html).toMatch(/<script\s+type=["']application\/ld\+json["']>/i);
    const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    expect(jsonLdMatch).not.toBeNull();
    if (jsonLdMatch) {
      const parsed = JSON.parse(jsonLdMatch[1]);
      expect(parsed["@context"]).toBe("https://schema.org");
      expect(parsed["@graph"]).toBeDefined();
    }
  });

  it("verifies presentation HTML contains social sharing metadata", () => {
    const html = fs.readFileSync(presentationHtmlPath, "utf-8");

    expect(html).toMatch(/<meta\s+property=["']og:title["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:image["']/i);
    expect(html).toMatch(/<meta\s+name=["']twitter:card["']/i);
    expect(html).toMatch(/<meta\s+name=["']twitter:image["']/i);
  });
});
