import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('../Blog-src/db.json');
const OUTPUT_PATH = path.resolve('scripts/abbrlink-map.json');

function extractAbbrlinks() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error(`Error: Database file not found at ${DB_PATH}`);
      process.exit(1);
    }

    const dbContent = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent);
    
    const mapping = {};
    const posts = db.models.Post;

    console.log(`Found ${posts.length} posts in database.`);

    posts.forEach(post => {
      // Hexo stores the source path relative to source directory, e.g., "_posts/filename.md"
      const filename = path.basename(post.source);
      // Some posts might not have abbrlink if they are drafts or malformed
      if (post.abbrlink) {
        mapping[filename] = post.abbrlink;
      }
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapping, null, 2));
    console.log(`Successfully extracted ${Object.keys(mapping).length} abbrlinks to ${OUTPUT_PATH}`);
    
  } catch (error) {
    console.error('Failed to extract abbrlinks:', error);
    process.exit(1);
  }
}

extractAbbrlinks();
