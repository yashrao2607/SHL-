// Comprehensive script to scrape ALL SHL Individual Test Solutions
import ZAI from 'z-ai-web-dev-sdk';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

const CACHE_DIR = './upload/catalog_cache';

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const zai = await ZAI.create();
  
  const allProducts = [];
  const seenSlugs = new Set();
  
  // Scrape all pages - the main page shows 12 per type, and pagination goes up to start=372 for type=1
  // But the page reader doesn't execute JS, so type filter doesn't work
  // However, the HTML contains both sections with different row attributes:
  // - Pre-packaged: data-course-id
  // - Individual: data-entity-id
  
  // We need to paginate through the full catalog
  // Each page shows 12 pre-packaged + 12 individual = 24 products
  // Total individual: up to 372/12 * 12 = 384+
  
  for (let start = 0; start <= 500; start += 12) {
    try {
      let url;
      if (start === 0) {
        url = 'https://www.shl.com/solutions/products/product-catalog/';
      } else {
        url = `https://www.shl.com/solutions/products/product-catalog/?start=${start}&type=1`;
      }
      
      console.log(`Scraping page: start=${start}...`);
      
      const cacheFile = `${CACHE_DIR}/page_${start}.json`;
      let result;
      
      if (existsSync(cacheFile)) {
        result = JSON.parse(readFileSync(cacheFile, 'utf-8'));
        console.log('  (from cache)');
      } else {
        result = await zai.functions.invoke('page_reader', { url });
        writeFileSync(cacheFile, JSON.stringify(result));
        await new Promise(r => setTimeout(r, 2000));
      }
      
      const html = result.data?.html || '';
      
      if (!html || html.length < 100) {
        console.log('  Empty page, stopping.');
        break;
      }
      
      // Extract Individual Test Solution rows (data-entity-id)
      const entityRegex = /<tr\s+data-entity-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
      let entityMatch;
      let newCount = 0;
      
      while ((entityMatch = entityRegex.exec(html)) !== null) {
        const rowHtml = entityMatch[2];
        
        const linkMatch = rowHtml.match(/href="(\/products\/product-catalog\/view\/([^/]+)\/)"[^>]*>([^<]+)<\/a>/);
        if (!linkMatch) continue;
        
        const slug = linkMatch[2];
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);
        
        const name = linkMatch[3].trim();
        const urlPath = linkMatch[1];
        
        // Extract test type keys
        const testTypeKeys = [];
        const keyRegex = /product-catalogue__key"[^>]*>([A-Z])<\/span>/g;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(rowHtml)) !== null) {
          testTypeKeys.push(keyMatch[1]);
        }
        
        // Extract remote testing and adaptive
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          cells.push(cellMatch[1]);
        }
        
        const remote = cells.length > 1 && cells[1].includes('-yes');
        const adaptive = cells.length > 2 && cells[2].includes('-yes');
        
        allProducts.push({
          slug,
          name,
          url: `https://www.shl.com${urlPath}`,
          test_types: testTypeKeys,
          remote_testing: remote,
          adaptive,
        });
        newCount++;
      }
      
      console.log(`  New Individual products: ${newCount}, Total: ${allProducts.length}`);
      
      if (newCount === 0 && start > 0) {
        console.log('No new Individual products found, stopping pagination.');
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
}

main().catch(console.error);
