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

function isDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

// Casual Marathi to English Transliteration Maps
const vowelMap = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ru'
};

const consonantMap = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'nj',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क्ष': 'ksh', 'ज्ञ': 'dny'
};

const matraMap = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ru', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
};

function marathiToEnglish(text) {
  if (!text) return "";
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    let nextChar = text[i + 1];

    if (consonantMap[char]) {
      result += consonantMap[char];
      
      // Add implicit 'a' (schwa)
      let isEndOfWord = !nextChar || /[\s।॥,.;:!?'"\n\r]/.test(nextChar);
      let nextIsMatraOrHalant = nextChar === '्' || matraMap[nextChar] || vowelMap[nextChar];
      
      // In Marathi, we usually drop the 'a' at the end of the word (e.g. 'dev' not 'deva')
      if (!nextIsMatraOrHalant && !isEndOfWord) {
        result += 'a';
      }
    } else if (vowelMap[char]) {
      result += vowelMap[char];
    } else if (matraMap[char]) {
      result += matraMap[char];
    } else if (char !== '्') {
      result += char; 
    }
  }
  
  // Capitalize the first letter of each line/sentence for readability
  return result.replace(/(^\s*|[\n\r।॥]\s*)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

// Dictionary to enforce perfect Marathi spelling for common names
const devanagariDict = {
  "ganapati": "गणपती",
  "ganpati": "गणपती",
  "ganesh": "गणेश",
  "ram": "राम",
  "krishna": "कृष्ण",
  "shankar": "शंकर",
  "devi": "देवी",
  "datta": "दत्त",
  "vitthal": "विठ्ठल",
  "vithhal": "विठ्ठल",
  "maruti": "मारुती",
  "khandoba": "खंडोबा",
  "dnyaneshwar": "ज्ञानेश्वर",
  "namdev": "नामदेव",
  "tukaram": "तुकराम",
  "durga": "दुर्गा",
  "sai": "साई",
  "bhavani": "भवानी",
  "mahalaxmi": "महालक्ष्मी",
  "mangaur": "मनगौरी"
};

function getDevanagari(text) {
  if (!text) return "";
  if (isDevanagari(text)) return text;
  
  // 1. Exact match override for common deities
  if (devanagariDict[text.toLowerCase()]) {
    return devanagariDict[text.toLowerCase()];
  }

  // If it's English and not in dictionary, just return it.
  // Guessing Devanagari from English creates gibberish without ML/APIs.
  return text;
}

// Dictionary to enforce perfect English spelling for common Marathi names
const englishDict = {
  "इतर": "Other",
  "दत्त": "Datta",
  "विठ्ठल": "Vitthal",
  "गणपती": "Ganpati",
  "गणेश": "Ganesh",
  "राम": "Ram",
  "कृष्ण": "Krishna",
  "शंकर": "Shankar",
  "देवी": "Devi",
  "मारुती": "Maruti",
  "खंडोबा": "Khandoba",
  "ज्ञानेश्वर": "Dnyaneshwar",
  "नामदेव": "Namdev",
  "तुकराम": "Tukaram",
  "दुर्गा": "Durga",
  "साई": "Sai",
  "भवानी": "Bhavani",
  "महालक्ष्मी": "Mahalaxmi",
  "मनगौरी": "Mangauri"
};

function getEnglish(text) {
  if (!text) return "";

  // 1. Exact match override for common Marathi names to English
  if (englishDict[text.trim()]) {
    return englishDict[text.trim()];
  }

  if (isDevanagari(text)) {
    return marathiToEnglish(text);
  }
  return text; // Already English
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
                    title: getDevanagari(data.title || ""),
                    deity: getDevanagari(data.deity || ""),
                    titleEng: getEnglish(data.title || ""),
                    deityEng: getEnglish(data.deity || "").toUpperCase(), // Deity names often look better in uppercase
                    lyricsEng: getEnglish(lyrics),
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