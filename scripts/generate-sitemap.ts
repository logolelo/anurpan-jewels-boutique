import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://anurpanjewellery.com';

async function getProductHandles() {
  const shopifyDomain = process.env.VITE_SHOPIFY_STORE_DOMAIN;
  const shopifyToken = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

  if (!shopifyDomain || !shopifyToken) {
    console.warn("Shopify domain or storefront access token not set. Skipping dynamic product sitemap generation.");
    return [];
  }

  const query = `
    query {
      products(first: 250) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shopifyDomain}/api/2023-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
        'X-Shopify-Storefront-Access-Token': shopifyToken,
      },
      body: query,
    });
    const data = await response.json();
    return data.data.products.edges.map((edge: { node: { handle: string } }) => edge.node.handle);
  } catch (error) {
    console.error("Error fetching product handles for sitemap:", error);
    return [];
  }
}

async function generateSitemap() {
  const productHandles = await getProductHandles();
  const staticRoutes = [
    '', // homepage
    'products',
    'about-us',
    'contact',
    'terms',
    'refund-policy',
    'privacy-policy',
  ];

  const productRoutes = productHandles.map(handle => `product/${handle}`);

  const allRoutes = [...staticRoutes, ...productRoutes];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allRoutes.map(route => {
    const url = `${BASE_URL}/${route}`;
    const lastmod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
  }).join('')}
</urlset>`;

  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
  console.log('Sitemap generated successfully!');
}

generateSitemap();