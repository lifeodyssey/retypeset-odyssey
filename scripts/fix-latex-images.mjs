import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const TARGET_DIR = './src/content/posts';

async function fixLatex() {
  const files = await glob('**/*.md', { cwd: TARGET_DIR, absolute: true });
  let count = 0;

  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    const originalContent = content;

    // Replace math.fivecakes.com images with $...$
    content = content.replace(/!\[.*?\]\(https:\/\/math\.fivecakes\.com\/\?latex=(.*?)\)/g, (match, latex) => {
      try {
        const decoded = decodeURIComponent(latex);
        return `$${decoded}$`;
      } catch (e) {
        console.error(`Failed to decode: ${latex}`);
        return match;
      }
    });

    if (content !== originalContent) {
      await fs.writeFile(file, content, 'utf-8');
      console.log(`Fixed LaTeX in ${path.basename(file)}`);
      count++;
    }
  }
  console.log(`Fixed ${count} files.`);
}

fixLatex().catch(console.error);
