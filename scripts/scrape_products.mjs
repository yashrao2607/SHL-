// Scrape individual product pages for detailed metadata
import ZAI from 'z-ai-web-dev-sdk';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

const CACHE_DIR = './upload/product_pages';

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const zai = await ZAI.create();
  
  // All known product slugs from the catalog listing pages
  const slugs = [
    // Individual Test Solutions
    'global-skills-development-report',
    'net-framework-4-5',
    'net-mvc-new',
    'net-mvvm-new',
    'net-wcf-new',
    'net-wpf-new',
    'net-xaml-new',
    'accounts-payable-new',
    'accounts-payable-simulation-new',
    'accounts-receivable-new',
    'accounts-receivable-simulation-new',
    'ado-net-new',
    // More from pagination
    'java-8-new',
    'java-se-8-new',
    'java-se-7-new',
    'c-new',
    'cpp-new',
    'python-new',
    'sql-server-new',
    'mysql-new',
    'oracle-new',
    'javascript-new',
    'html5-new',
    'css3-new',
    'angular-new',
    'react-new',
    'nodejs-new',
    'sap-abap-new',
    'salesforce-new',
    'aws-new',
    'azure-new',
    'python-3-new',
    'r-new',
    'go-new',
    'rust-new',
    'typescript-new',
    'vuejs-new',
    'django-new',
    'flask-new',
    'spring-new',
    'docker-new',
    'kubernetes-new',
    'linux-new',
    'shell-scripting-new',
    'powershell-new',
    'ruby-new',
    'php-new',
    'swift-new',
    'kotlin-new',
    'scala-new',
    'csharp-new',
    'vb-net-new',
    'excel-new',
    'word-new',
    'powerpoint-new',
    'access-new',
    'outlook-new',
    'project-new',
    'sharepoint-new',
    'teams-new',
    'sap-new',
    'tableau-new',
    'power-bi-new',
    'salesforce-admin-new',
    'salesforce-developer-new',
    // Pre-packaged Job Solutions
    'account-manager-solution',
    'administrative-professional-short-form',
    'agency-manager-solution',
    'apprentice-8-0-job-focused-assessment-4261',
    'apprentice-8-0-job-focused-assessment',
    'bank-administrative-assistant-short-form',
    'bank-collections-agent-short-form',
    'bank-operations-supervisor-short-form',
    'bilingual-spanish-reservation-agent-solution',
    'bookkeeping-accounting-auditing-clerk-short-form',
    'branch-manager-short-form',
    'cashier-solution',
  ];
  
  const products = [];
  
  for (const slug of slugs) {
    const url = `https://www.shl.com/products/product-catalog/view/${slug}/`;
    const cacheFile = `${CACHE_DIR}/${slug}.json`;
    
    try {
      let result;
      if (existsSync(cacheFile)) {
        result = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      } else {
        console.log(`Scraping: ${slug}...`);
        result = await zai.functions.invoke('page_reader', { url });
        writeFileSync(cacheFile, JSON.stringify(result));
        await new Promise(r => setTimeout(r, 1500));
      }
      
      const html = result.data?.html || '';
      
      if (!html || html.length < 100) {
        console.log(`  No data for ${slug}`);
        continue;
      }
      
      // Extract product details
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ');
      
      // Extract description
      const descMatch = html.match(/class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/) 
        || html.match(/class="[^"]*product[^"]*overview[^"]*"[^>]*>([\s\S]*?)<\/div>/)
        || html.match(/class="[^"]*intro[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      
      let description = '';
      if (descMatch) {
        description = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      // Extract test type
      const testTypes = html.match(/product-catalogue__key"[^>]*>([A-Z])<\/span>/g) || [];
      const typeKeys = testTypes.map(t => t.match(/>([A-Z])</)?.[1]).filter(Boolean);
      
      // Extract duration
      const durationMatch = html.match(/(\d+)\s*(min|minutes|minute)/i);
      const duration = durationMatch ? `${durationMatch[1]} minutes` : '';
      
      // Extract key facts
      const factsMatch = html.match(/class="[^"]*key-fact[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p|li)>/g) || [];
      
      products.push({
        slug,
        name: title,
        url,
        description: description.substring(0, 500),
        test_types: typeKeys,
        duration,
      });
      
      console.log(`  ✓ ${title} (types: ${typeKeys.join(', ')})`);
    } catch (e) {
      console.error(`  Error for ${slug}: ${e.message}`);
    }
  }
  
  writeFileSync('./upload/scraped_products.json', JSON.stringify(products, null, 2));
  console.log(`\nScraped ${products.length} products total`);
}

main().catch(console.error);
