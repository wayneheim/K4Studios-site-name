/**
 * Find images with boilerplate/missing content that Google flagged as duplicates
 * 
 * Checks for:
 * - Missing or very short story (< 50 chars)
 * - Boilerplate story patterns
 * - Missing title
 * - Copyright-only content
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const galleriesDir = path.join(__dirname, '../src/data/Galleries');

// Boilerplate patterns to detect
const boilerplatePatterns = [
  /^©\s*Wayne\s*Heim/i,
  /^This image embodies/i,
  /captured by Wayne Heim in his signature style/i,
  /Part of Wayne Heim's .* fine art photography series/i,
];

function isBoilerplate(text) {
  if (!text || text.length < 50) return true;
  const trimmed = text.trim();
  for (const pattern of boilerplatePatterns) {
    if (pattern.test(trimmed)) return true;
  }
  // Check if it's just copyright
  if (/^©?\s*Wayne\s*Heim\s*\d*$/i.test(trimmed)) return true;
  return false;
}

function findMjsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMjsFiles(fullPath, files);
    } else if (entry.name.endsWith('.mjs') && !entry.name.includes('Entrance')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function analyzeGallery(filePath) {
  const issues = [];
  
  try {
    // Dynamic import for .mjs files
    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
    const module = await import(fileUrl);
    const galleryData = module.galleryData || module.default?.galleryData || [];
    
    if (!Array.isArray(galleryData)) return issues;
    
    for (const img of galleryData) {
      if (!img.id || img.id === 'i-k4studios') continue; // Skip placeholder
      
      const hasBoilerplateStory = isBoilerplate(img.story);
      const hasBoilerplateDesc = isBoilerplate(img.description);
      const missingTitle = !img.title || img.title.length < 10;
      
      if (hasBoilerplateStory && hasBoilerplateDesc) {
        issues.push({
          id: img.id,
          gallery: filePath.replace(galleriesDir, '').replace(/\\/g, '/'),
          title: img.title || 'MISSING',
          story: (img.story || '').substring(0, 60),
          description: (img.description || '').substring(0, 60),
          issue: 'boilerplate',
        });
      }
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
  
  return issues;
}

async function main() {
  const files = findMjsFiles(galleriesDir);
  console.log(`Found ${files.length} gallery .mjs files\n`);
  
  const allIssues = [];
  
  for (const file of files) {
    const issues = await analyzeGallery(file);
    allIssues.push(...issues);
  }
  
  // Group by gallery
  const byGallery = {};
  for (const issue of allIssues) {
    if (!byGallery[issue.gallery]) {
      byGallery[issue.gallery] = [];
    }
    byGallery[issue.gallery].push(issue);
  }
  
  console.log('\n📊 SUMMARY BY GALLERY:\n');
  for (const [gallery, issues] of Object.entries(byGallery)) {
    console.log(`${gallery}: ${issues.length} images with boilerplate content`);
  }
  
  console.log(`\n📌 TOTAL: ${allIssues.length} images need unique content\n`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../boilerplate-images-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allIssues, null, 2));
  console.log(`📄 Detailed report saved to: boilerplate-images-report.json`);
  
  // Also save a CSV for easy review
  const csvPath = path.join(__dirname, '../boilerplate-images-report.csv');
  const csvHeader = 'Gallery,Image ID,Title,Story Preview\n';
  const csvRows = allIssues.map(i => 
    `"${i.gallery}","${i.id}","${i.title.replace(/"/g, '""')}","${i.story.replace(/"/g, '""')}"`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`📄 CSV report saved to: boilerplate-images-report.csv`);
}

main().catch(console.error);
