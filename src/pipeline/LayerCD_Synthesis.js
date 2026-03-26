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

        const payload = articles.slice(0, 3).map(a => ({
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
                temperature: 0.2
            }
        };

        fs.writeFileSync(TEMP_REQ, JSON.stringify(body));

        console.log(`[Synthesis] Invoking Gemini API via CURL: v1/models/gemini-2.0-flash`);
        const curlCmd = `curl -s -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}" ` +
                        `-H "Content-Type: application/json" ` +
                        `-d @${TEMP_REQ} -o ${TEMP_RES}`;
        
        try {
            execSync(curlCmd);
        } catch(e) {
            console.error(`[Synthesis] CURL Execution Failed: ${e.message}`);
            throw e;
        }

        if (!fs.existsSync(TEMP_RES)) {
            throw new Error(`API result file missing: ${TEMP_RES}`);
        }

        const rawRes = fs.readFileSync(TEMP_RES, 'utf8');
        let result;
        try {
            result = JSON.parse(rawRes);
        } catch(e) {
            console.error(`[Synthesis] Raw API Response: ${rawRes.substring(0, 500)}`);
            throw new Error(`Failed to parse API response as JSON: ${e.message}`);
        }
        
        if (!result.candidates || !result.candidates[0].content) {
            console.error('[Synthesis] API Logic Error:', JSON.stringify(result, null, 2));
            throw new Error('Malformed Response (Missing candidates)');
        }

        const rawText = result.candidates[0].content.parts[0].text;
        
        // Robust JSON Extraction
        let jsonText = rawText;
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }

        let clusters;
        try {
            clusters = JSON.parse(jsonText);
        } catch(e) {
            console.error(`[Synthesis] JSON Parse Error. Raw Text: ${rawText.substring(0, 500)}`);
            throw new Error(`Failed to parse extracted JSON: ${e.message}`);
        }

        const now = new Date().toISOString();
        clusters = clusters.map((c, i) => {
            let ts = now;
            if (c.timestamp) {
                try {
                    const parsed = new Date(c.timestamp);
                    if (!isNaN(parsed.getTime())) {
                        ts = parsed.toISOString();
                    }
                } catch(e) {}
            }
            return {
                ...c,
                id: c.id || `cluster-${Date.now()}-${i}`,
                timestamp: ts
            };
        });

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(clusters, null, 2));
        console.log(`[Synthesis] SUCCESS: Generated ${clusters.length} clusters.`);

    } catch (error) {
        console.error('[Synthesis] FAIL:', error.message);
        process.exit(1);
    }
}

runSynthesis();
