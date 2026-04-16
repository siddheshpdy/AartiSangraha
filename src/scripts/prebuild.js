import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { transliterate } from '@indic-transliteration/sanscript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.resolve(__dirname, '../content');
const dataDir = path.resolve(__dirname, '../data');
const outputPath = path.join(dataDir, 'Aartya.json');

const contentTypes = ['Aartya', 'Bhovtya', 'Pradakshina', 'Stotra', 'Mantra', 'Shloka'];

function generateEngFields(data) {
    const newData = { ...data };
    const transliterateOptions = { skip_sgml: true };

    if (data.title && !data.titleEng) {
        newData.titleEng = transliterate(data.title, 'devanagari', 'iast', transliterateOptions).replace(/\|/g, '').replace(/ ।/g, '.').trim();
    }
    if (data.deity && !data.deityEng) {
        newData.deityEng = transliterate(data.deity, 'devanagari', 'iast', transliterateOptions).trim();
    }
    if (data.lyrics && !data.lyricsEng) {
        newData.lyricsEng = transliterate(data.lyrics, 'devanagari', 'iast', transliterateOptions).replace(/\|/g, '').replace(/ ।/g, '.').trim();
    }
    // **Handle optional description field**
    if (data.description && !data.descriptionEng) {
        newData.descriptionEng = transliterate(data.description, 'devanagari', 'iast', transliterateOptions).replace(/\|/g, '').replace(/ ।/g, '.').trim();
    }
    return newData;
}

async function buildAartiData() {
    let allAartya = [];

    for (const type of contentTypes) {
        const typeDir = path.join(contentDir, type);
        if (!fs.existsSync(typeDir)) continue;

        const files = fs.readdirSync(typeDir).filter(file => file.endsWith('.md'));

        for (const file of files) {
            const filePath = path.join(typeDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            const entries = fileContent.split('---').filter(entry => entry.trim() !== '');

            for (const entry of entries) {
                try {
                    const { data, content } = matter(entry);
                    if (!data.id || !data.title) continue;

                    const aartiData = {
                        ...data,
                        description: data.description || null, // Add the optional description
                        lyrics: content.trim(),
                    };
                    
                    allAartya.push(generateEngFields(aartiData));
                } catch (e) {
                    console.error(`Error processing an entry in ${file}:`, e);
                }
            }
        }
    }

    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(allAartya, null, 2));
    console.log(`✅ Successfully built ${allAartya.length} items to Aartya.json`);
}

buildAartiData();