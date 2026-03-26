/**
 * Stage2_Synthesize.js
 */
const fs = require('fs').promises;
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
const STAGE_PATH = path.join(__dirname, 'stage_data.json');
const OUTPUT_PATH = path.join(__dirname, '../../public/data/latest/clusters.json');

async function synthesize() {
    console.log('[Stage 2] Starting network synthesis...');
    const rawPayload = await fs.readFile(STAGE_PATH, 'utf8');
    const payload = JSON.parse(rawPayload);

    const systemPrompt = `You are the Chronos Sentinel Intelligence Processor. 
    Synthesize these news articles into strategic intelligence clusters.
    Group related stories, assign a canonical label, and determine severity.
    Output MUST be a JSON array: [{ id, canonicalLabel, summary, severity, timestamp, sources }]`;

    const userPrompt = `Synthesize: ${JSON.stringify(payload)}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        })
    });

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    let clusters = JSON.parse(text);
    
    const now = new Date().toISOString();
    clusters = clusters.map((c, i) => ({
        ...c,
        id: c.id || `cluster-${Date.now()}-${i}`,
        timestamp: c.timestamp || now
    }));

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(clusters, null, 2));
    console.log(`[Stage 2] SUCCESS: ${clusters.length} clusters written.`);
}
synthesize();
