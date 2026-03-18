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

const transliterateMap = {
  consonants: {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'nj',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
    'क्ष': 'ksh', 'ज्ञ': 'dny'
  },
  vowels: {
    'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ru'
  },
  matras: {
    'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ru', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
  }
};

function transliterate(text) {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    let nextChar = text[i + 1];

    if (transliterateMap.consonants[char]) {
      result += transliterateMap.consonants[char];
      // Add 'a' (schwa) if the next character isn't a matra, halant, or end of a word
      if (nextChar !== '्' && !transliterateMap.matras[nextChar]) {
         if (nextChar !== undefined && !/[\s।॥,.;:!?\n\r]/.test(nextChar)) {
           result += 'a';
         }
      }
    } else if (transliterateMap.vowels[char]) {
      result += transliterateMap.vowels[char];
    } else if (transliterateMap.matras[char]) {
      result += transliterateMap.matras[char];
    } else if (char !== '्') {
      result += char; // Pass through English letters & punctuation natively
    }
  }
  // Capitalize the first letter of each line for readability
  return result.replace(/(^\s*|[\n\r।॥]\s*)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

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
                const lyrics = content.trim();
                allContent.push({ 
                    id: `${category}-${file.replace('.md', '')}-${index}`, 
                    type: category,
                    title: transliterate(data.title || ""),
                    deity: transliterate(data.deity || "").toUpperCase(),
                    titleEng: transliterate(data.title || ""),
                    deityEng: transliterate(data.deity || "").toUpperCase(), // Deity names often look better in uppercase
                    lyricsEng: transliterate(lyrics),
                    link: data.link || "",
                    lyrics: lyrics 

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