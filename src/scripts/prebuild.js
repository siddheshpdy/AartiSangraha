import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

// These two lines are needed for ES Modules to handle paths correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content');
const outputDir = path.join(__dirname, '../data');
const outputFile = path.join(outputDir, 'aartis.json');

export function generateAartis() {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Ensure content directory exists
    if (!fs.existsSync(contentDir)) {
        console.warn(`Content dir not found: ${contentDir}`);
        return;
    }

    const files = fs.readdirSync(contentDir);
    const aartis = [];

    files.filter(f => f.endsWith('.md')).forEach(file => {
        const fileContent = fs.readFileSync(path.join(contentDir, file), 'utf8');
        
        // Regex to split file containing multiple frontmatter blocks (--- ... ---)
        const regex = /(?:^|\r?\n)---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*?)(?=\r?\n---\s*\r?\n|$)/g;
        
        let index = 1;
        for (const match of fileContent.matchAll(regex)) {
            const rawBlock = `---\n${match[1]}\n---\n${match[2]}`;
            const { data, content } = matter(rawBlock);
            aartis.push({ id: `${file.replace('.md', '')}-${index}`, ...data, lyrics: content.trim() });
            index++;
        }
    });

    fs.writeFileSync(outputFile, JSON.stringify(aartis, null, 2));
    console.log("✅ JSON generated!");
}

// Run directly if executed as a script (e.g., via npm run prebuild-json)
if (process.argv[1] === __filename) {
    generateAartis();
}