/**
 * Stage1_Prepare.js
 */
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../public/data/latest');
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const STAGE_PATH = path.join(__dirname, 'stage_data.json');

async function prepare() {
    console.log('[Stage 1] Preparing payload...');
    const rawData = await fs.readFile(ARTICLES_PATH, 'utf8');
    const articles = JSON.parse(rawData);
    const payload = articles.slice(0, 30).map(a => ({
        id: a.id,
        title: a.title,
        source: a.sourceId,
        text: a.cleanedText ? a.cleanedText.substring(0, 500) : '' 
    }));
    await fs.writeFile(STAGE_PATH, JSON.stringify(payload));
    console.log('[Stage 1] Payload written to stage_data.json');
}
prepare();
