import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = '../Blog-src/source/_posts';
const TARGET_DIR = './src/content/posts';
const ABBRLINK_MAP_PATH = './scripts/abbrlink-map.json';

// Simple CRC32 implementation for fallback
function crc32(str) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = (() => {
  const t = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c;
  }
  return t;
})();

// Ensure target directory exists
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Detect language based on filename, frontmatter, and content
function detectLanguage(filename, data, content) {
  // 1. Explicit frontmatter
  if (data.lang) {
    const lang = data.lang.toLowerCase();
    if (['zh', 'en', 'ja'].includes(lang)) return lang;
    if (lang === 'zh-tw') return 'zh'; // Map zh-tw to zh for now as requested
    if (lang === 'jp') return 'ja';
  }

  // 2. Filename extension
  if (filename.endsWith('.en.md')) return 'en';
  if (filename.endsWith('.ja.md')) return 'ja';
  if (filename.endsWith('.zh.md')) return 'zh';
  if (filename.endsWith('.zh-tw.md')) return 'zh';

  // 3. Heuristic: Count Chinese/Japanese characters
  // Common CJK range
  const cjkCount = (content.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  
  // If CJK characters are significant, assume Chinese (default)
  // You might want more sophisticated detection for JA vs ZH if needed, 
  // but for now default to 'zh' for CJK content is safer for this user
  if (cjkCount > 50) return 'zh';
  
  return 'en';
}

async function migrate() {
  console.log('🚀 Starting content migration...');
  
  await ensureDir(TARGET_DIR);
  
  // Load Abbrlink Map
  let abbrlinkMap = {};
  try {
    const mapContent = await fs.readFile(ABBRLINK_MAP_PATH, 'utf-8');
    abbrlinkMap = JSON.parse(mapContent);
    console.log(`Loaded ${Object.keys(abbrlinkMap).length} abbrlinks.`);
  } catch (e) {
    console.warn('⚠️ Could not load abbrlink map, will generate new ones.', e.message);
  }

  const files = await glob('**/*.md', { cwd: SOURCE_DIR, absolute: true });
  console.log(`Found ${files.length} markdown files.`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const filename = path.basename(file);
      const content = await fs.readFile(file, 'utf-8');
      const parsed = matter(content);
      const data = parsed.data;

      // Skip if no title (likely invalid)
      if (!data.title) {
        console.warn(`⚠️ Skipping ${filename}: No title found.`);
        continue;
      }

      // Determine Abbrlink
      let abbrlink = data.abbrlink || abbrlinkMap[filename];
      if (!abbrlink) {
        // Generate fallback abbrlink using CRC32 of title + date (mimic Hexo behavior roughly)
        // Hexo-abbrlink uses crc16 or crc32 of title+date usually
        const input = data.title + (data.date ? new Date(data.date).toISOString() : '');
        abbrlink = crc32(input).toString(16);
        console.log(`Generated new abbrlink for ${filename}: ${abbrlink}`);
      }

      // Detect Language
      const lang = detectLanguage(filename, data, parsed.content);

      // Map Frontmatter
      const newFrontmatter = {
        title: data.title,
        published: data.date || new Date(),
        updated: data.updated,
        abbrlink: abbrlink, // Ensure abbrlink is present
        tags: data.tags || [],
        categories: data.categories,
        password: data.password,
        lang: lang,
        description: data.description || '',
      };

      // Merge categories into tags
      if (newFrontmatter.categories) {
        const cats = Array.isArray(newFrontmatter.categories) 
          ? newFrontmatter.categories 
          : [newFrontmatter.categories];
        
        const tags = Array.isArray(newFrontmatter.tags)
          ? newFrontmatter.tags
          : (newFrontmatter.tags ? [newFrontmatter.tags] : []);

        newFrontmatter.tags = [...new Set([...tags, ...cats])];
      }
      
      // Remove undefined/null
      Object.keys(newFrontmatter).forEach(key => 
        (newFrontmatter[key] === undefined || newFrontmatter[key] === null) && delete newFrontmatter[key]
      );

      // Construct new content
      const newContent = matter.stringify(parsed.content, newFrontmatter);
      
      // Write to target
      await fs.writeFile(path.join(TARGET_DIR, filename), newContent, 'utf-8');
      successCount++;
      
    } catch (err) {
      console.error(`❌ Error processing ${file}:`, err);
      errorCount++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

migrate().catch(console.error);
