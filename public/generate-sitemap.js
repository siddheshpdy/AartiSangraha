import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aartyaPath = path.resolve(__dirname, '../src/data/Aartya.json');
const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');

try {
  const aartyaData = JSON.parse(fs.readFileSync(aartyaPath, 'utf8'));
  
  const baseUrl = 'https://aartisangraha.co.in';
  const date = new Date().toISOString();
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Add Home page
  sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${date}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;
  
  // Add individual Aarti pages
  aartyaData.forEach((aarti) => {
    sitemap += `  <url>\n    <loc>${baseUrl}/aarti/${aarti.id}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
  });
  
  sitemap += `</urlset>\n`;
  
  fs.writeFileSync(sitemapPath, sitemap);
  console.log('✅ Sitemap generated successfully at public/sitemap.xml');
} catch (error) {
  console.error('❌ Error generating sitemap:', error);
}