// Script to scrape SHL catalog - Individual Test Solutions (type=1)
import ZAI from 'z-ai-web-dev-sdk';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

const CACHE_DIR = './upload/catalog_cache';

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const zai = await ZAI.create();
  
  // type=1 = Individual Test Solutions, type=2 = Pre-packaged Job Solutions
  // Scrape all Individual Test Solution pages
  const allProducts = [];
  const seenSlugs = new Set();
  
  // Paginate through Individual Test Solutions
  for (let start = 0; start <= 500; start += 12) {
    try {
      const url = `https://www.shl.com/solutions/products/product-catalog/?start=${start}&type=1`;
      
      console.log(`Scraping Individual Test Solutions page: start=${start}...`);
      
      const cacheFile = `${CACHE_DIR}/individual_${start}.json`;
      let result;
      
      if (existsSync(cacheFile)) {
        result = JSON.parse(readFileSync(cacheFile, 'utf-8'));
        console.log('  (from cache)');
      } else {
        result = await zai.functions.invoke('page_reader', { url });
        writeFileSync(cacheFile, JSON.stringify(result));
        await new Promise(r => setTimeout(r, 1500));
      }
      
      const html = result.data?.html || '';
      
      if (!html || html.length < 100) {
        console.log('  Empty page, stopping.');
        break;
      }
      
      // Extract product data from table rows
      const rowRegex = /<tr data-course-id="(\d+)">(.*?)<\/tr>/gs;
      let rowMatch;
      let newCount = 0;
      
      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowHtml = rowMatch[2];
        
        const linkMatch = rowHtml.match(/href="(\/products\/product-catalog\/view\/([^/]+)\/)"[^>]*>([^<]+)<\/a>/);
        if (!linkMatch) continue;
        
        const slug = linkMatch[2];
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);
        
        const name = linkMatch[3].trim();
        const url_path = linkMatch[1];
        
        // Extract test type keys
        const testTypeKeys = [];
        const keyRegex = /product-catalogue__key"[^>]*>([A-Z])<\/span>/g;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(rowHtml)) !== null) {
          testTypeKeys.push(keyMatch[1]);
        }
        
        // Extract remote testing and adaptive
        const cells = rowHtml.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
        let remote = false, adaptive = false;
        cells.forEach((cell, i) => {
          if (i === 0) return;
          if (cell.includes('-yes')) {
            if (i === 1) remote = true;
            else if (i === 2) adaptive = true;
          }
        });
        
        allProducts.push({
          slug,
          name,
          url: `https://www.shl.com${url_path}`,
          test_types: testTypeKeys,
          remote_testing: remote,
          adaptive,
        });
        newCount++;
      }
      
      console.log(`  New products: ${newCount}, Total: ${allProducts.length}`);
      
      if (newCount === 0) {
        console.log('No new products found, stopping pagination.');
        break;
      }
    } catch (e) {
      console.error(`Error on start=${start}:`, e.message);
      break;
    }
  }
  
  console.log(`\nTotal Individual Test Solutions: ${allProducts.length}`);
  writeFileSync('./upload/individual_products.json', JSON.stringify(allProducts, null, 2));
  console.log('Saved to upload/individual_products.json');
  
  // Also scrape Pre-packaged Job Solutions for completeness
  const prepackagedProducts = [];
  const seenSlugs2 = new Set();
  
  for (let start = 0; start <= 500; start += 12) {
    try {
      const url = `https://www.shl.com/solutions/products/product-catalog/?start=${start}&type=2`;
      
      console.log(`Scraping Pre-packaged Job Solutions page: start=${start}...`);
      
      const cacheFile = `${CACHE_DIR}/prepackaged_${start}.json`;
      let result;
      
      if (existsSync(cacheFile)) {
        result = JSON.parse(readFileSync(cacheFile, 'utf-8'));
        console.log('  (from cache)');
      } else {
        result = await zai.functions.invoke('page_reader', { url });
        writeFileSync(cacheFile, JSON.stringify(result));
        await new Promise(r => setTimeout(r, 1500));
      }
      
      const html = result.data?.html || '';
      
      if (!html || html.length < 100) {
        console.log('  Empty page, stopping.');
        break;
      }
      
      const rowRegex = /<tr data-course-id="(\d+)">(.*?)<\/tr>/gs;
      let rowMatch;
      let newCount = 0;
      
      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowHtml = rowMatch[2];
        
        const linkMatch = rowHtml.match(/href="(\/products\/product-catalog\/view\/([^/]+)\/)"[^>]*>([^<]+)<\/a>/);
        if (!linkMatch) continue;
        
        const slug = linkMatch[2];
        if (seenSlugs2.has(slug)) continue;
        seenSlugs2.add(slug);
        
        const name = linkMatch[3].trim();
        const url_path = linkMatch[1];
        
        const testTypeKeys = [];
        const keyRegex = /product-catalogue__key"[^>]*>([A-Z])<\/span>/g;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(rowHtml)) !== null) {
          testTypeKeys.push(keyMatch[1]);
        }
        
        const cells = rowHtml.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
        let remote = false, adaptive = false;
        cells.forEach((cell, i) => {
          if (i === 0) return;
          if (cell.includes('-yes')) {
            if (i === 1) remote = true;
            else if (i === 2) adaptive = true;
          }
        });
        
        prepackagedProducts.push({
          slug,
          name,
          url: `https://www.shl.com${url_path}`,
          test_types: testTypeKeys,
          remote_testing: remote,
          adaptive,
        });
        newCount++;
      }
      
      console.log(`  New products: ${newCount}, Total: ${prepackagedProducts.length}`);
      
      if (newCount === 0) {
        console.log('No new products found, stopping pagination.');
        break;
      }
    } catch (e) {
      console.error(`Error on start=${start}:`, e.message);
      break;
    }
  }
  
  console.log(`\nTotal Pre-packaged Job Solutions: ${prepackagedProducts.length}`);
  writeFileSync('./upload/prepackaged_products.json', JSON.stringify(prepackagedProducts, null, 2));
  console.log('Saved to upload/prepackaged_products.json');
}

main().catch(console.error);
