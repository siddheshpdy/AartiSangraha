import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

// These two lines are needed for ES Modules to handle paths correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content');
const outputDir = path.join(__dirname, '../data');
const outputFile = path.join(outputDir, 'Aartya.json');

export function generateAartya() {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const categories = ['Aartya', 'Bhovtya', 'Pradakshina'];
    const allContent = [];

    categories.forEach(category => {
        const categoryDir = path.join(contentDir, category);
        
        if (!fs.existsSync(categoryDir)) {
            console.warn(`Category dir not found: ${categoryDir}`);
            return; // Skip to the next category
        }

        const files = fs.readdirSync(categoryDir);
        
        files.filter(f => f.endsWith('.md')).forEach(file => {
            const fileContent = fs.readFileSync(path.join(categoryDir, file), 'utf8');
            
            // Regex to split file containing multiple frontmatter blocks (--- ... ---)
            const regex = /(?:^|\r?\n)---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*?)(?=\r?\n---\s*\r?\n|$)/g;
            
            let index = 1;
            for (const match of fileContent.matchAll(regex)) {
                const rawBlock = `---\n${match[1]}\n---\n${match[2]}`;
                const { data, content } = matter(rawBlock);
                allContent.push({ 
                    id: `${category}-${file.replace('.md', '')}-${index}`, 
                    type: category, 
                    ...data, 
                    lyrics: content.trim() 
                });
                index++;
            }
            console.log(`Processed ${category}/${file} with ${index - 1} items.`);
        });
    });

    console.log(`Generated ${allContent.length} items across all categories.`);
    fs.writeFileSync(outputFile, JSON.stringify(allContent, null, 2));
    console.log("✅ JSON generated!");
}

// Run directly if executed as a script (e.g., via npm run prebuild-json)
if (process.argv[1] === __filename) {
    generateAartya();
}