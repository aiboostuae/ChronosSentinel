/**
 * LayerCD_Synthesis_Curl.js
 * Stabilization Phase: External CURL for maximum reliability on Windows
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_KEY = process.env.GEMINI_API_KEY;
const DATA_DIR = path.join(__dirname, '../../public/data/latest');
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'clusters.json');
const TEMP_REQ = path.join(__dirname, 'gemini_req.json');
const TEMP_RES = path.join(__dirname, 'gemini_res.json');

console.log('[Synthesis] Initializing Intelligence Pipeline (CURL)...');

if (!API_KEY) {
    console.error('[Synthesis] CRITICAL: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
}

async function runSynthesis() {
    try {
        if (!fs.existsSync(ARTICLES_PATH)) {
            console.error('[Synthesis] articles.json not found.');
            return;
        }

        const articles = JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8'));
        console.log(`[Synthesis] Processing ${articles.length} articles...`);

        const systemPrompt = `You are the Chronos Sentinel Intelligence Processor. 
        Synthesize these news articles into strategic intelligence clusters.
        Group related stories, assign a canonical label, and determine severity.
        Output MUST be a JSON array: [{ id, canonicalLabel, summary, severity, timestamp, sources }]`;

        const payload = articles.slice(0, 30).map(a => ({
            id: a.id,
            title: a.title,
            source: a.sourceId,
            text: a.cleanedText ? a.cleanedText.substring(0, 500) : '' 
        }));

        const combinedPrompt = `${systemPrompt}\n\nSynthesize these articles:\n${JSON.stringify(payload)}`;

        const body = {
            contents: [{
                parts: [{ text: combinedPrompt }]
            }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        };

        fs.writeFileSync(TEMP_REQ, JSON.stringify(body));

        console.log('[Synthesis] Invoking Gemini API (gemini-1.5-flash) via CURL (v1)...');
        const curlCmd = `curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}" ` +
                        `-H "Content-Type: application/json" ` +
                        `-d @${TEMP_REQ} -o ${TEMP_RES}`;
        
        execSync(curlCmd);

        const result = JSON.parse(fs.readFileSync(TEMP_RES, 'utf8'));
        
        if (!result.candidates || !result.candidates[0].content) {
            console.error('[Synthesis] API Error/Response:', JSON.stringify(result));
            throw new Error('Malformed Response');
        }

        const text = result.candidates[0].content.parts[0].text;
        let clusters = JSON.parse(text);

        const now = new Date().toISOString();
        clusters = clusters.map((c, i) => ({
            ...c,
            id: c.id || `cluster-${Date.now()}-${i}`,
            timestamp: c.timestamp || now
        }));

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(clusters, null, 2));
        console.log(`[Synthesis] SUCCESS: Generated ${clusters.length} clusters.`);

    } catch (error) {
        console.error('[Synthesis] FAIL:', error.message);
        process.exit(1);
    }
}

runSynthesis();
