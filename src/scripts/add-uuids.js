import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content');
const categories = ['Aartya', 'Bhovtya', 'Pradakshina'];

let filesModified = 0;
let idsAdded = 0;

categories.forEach(category => {
    const categoryDir = path.join(contentDir, category);
    if (!fs.existsSync(categoryDir)) return;

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
        const filePath = path.join(categoryDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Matches YAML frontmatter blocks: --- [content] ---
        const regex = /(^|\n)(---\r?\n)([\s\S]*?)(\r?\n---)/g;

        content = content.replace(regex, (match, prefix, start, yaml, end) => {
            // Check if an 'id:' field already exists (even if indented or missing spaces)
            if (/^\s*id:/m.test(yaml)) return match;

            // Generate new UUID and prepend it to the YAML block
            const newId = crypto.randomUUID();
            modified = true;
            idsAdded++;
            console.log(`Added UUID ${newId} to an Aarti in ${category}/${file}`);
            return `${prefix}${start}id: ${newId}\n${yaml}${end}`;
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            filesModified++;
        }
    });
});

console.log(`\n✅ Done! Successfully added ${idsAdded} UUIDs across ${filesModified} files.`);