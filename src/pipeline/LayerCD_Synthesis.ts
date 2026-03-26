// @ts-nocheck
/**
 * LayerCD_Synthesis.ts
 * Stabilization Phase: CommonJS for robust execution with @google/genai v1.46.0
 */

interface StoryCluster {
    id: string;
    canonicalLabel: string;
    summary: string;
    severity: 'High' | 'Medium' | 'Low';
    timestamp: string;
    sources: Array<{ id: string; title: string; url: string; source: string }>;
}

(async () => {
    const fs = require('fs');
    const path = require('path');
    const { GoogleGenAI } = require('@google/genai');

    const API_KEY = process.env.GEMINI_API_KEY;
    const DATA_DIR = path.join(__dirname, '../../public/data/latest');
    const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
    const OUTPUT_PATH = path.join(DATA_DIR, 'clusters.json');

    console.log('[Synthesis] Initializing Intelligence Pipeline...');

    if (!API_KEY) {
        console.error('[Synthesis] CRITICAL: GEMINI_API_KEY environment variable is missing.');
        process.exit(1);
    }

    async function runSynthesis() {
        try {
            if (!fs.existsSync(ARTICLES_PATH)) {
                console.error('[Synthesis] articles.json not found. Run LayerB scraper first.');
                return;
            }

            const rawData = fs.readFileSync(ARTICLES_PATH, 'utf8');
            const articles = JSON.parse(rawData);
            
            console.log(`[Synthesis] Processing ${articles.length} scraped articles...`);

            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const systemPrompt = `You are the Chronos Sentinel Intelligence Processor. 
            Synthesize the provided news articles into strategic intelligence clusters.
            Group related stories, assign a canonical label, and determine severity.
            Severity MUST be one of: 'High', 'Medium', 'Low'.
            Focus on Middle East stability, global security, and disaster alerts.
            Output MUST be a JSON array of objects following this schema:
            {
              "id": "string",
              "canonicalLabel": "string",
              "summary": "string",
              "severity": "High" | "Medium" | "Low",
              "timestamp": "ISO-8601 string",
              "sources": [{ "id": "string", "title": "string", "url": "string", "source": "string" }]
            }`;

            // Provide a representative sample for synthesis
            const payload = articles.slice(0, 30).map((a: any) => ({
                id: a.id,
                title: a.title,
                source: a.sourceId,
                text: a.cleanedText ? a.cleanedText.substring(0, 500) : '' 
            }));

            const userPrompt = `Synthesize these articles: ${JSON.stringify(payload)}`;

            console.log('[Synthesis] Invoking Gemini Intelligence Engine (gemini-2.0-flash)...');
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                    systemInstruction: {
                        role: 'system',
                        parts: [{ text: systemPrompt }]
                    },
                    temperature: 0.2,
                    responseMimeType: 'application/json'
                }
            });

            console.log('[Synthesis] Response received. Validating telemetry...');
            
            const text = response.text;
            if (!text) {
                throw new Error('Empty response from Gemini API');
            }

            let clusters: StoryCluster[] = JSON.parse(text);

            // Ensure every cluster has a timestamp and deterministic ID if missing
            const now = new Date().toISOString();
            clusters = clusters.map((c, i) => ({
                ...c,
                id: c.id || `cluster-${Date.now()}-${i}`,
                timestamp: c.timestamp || now
            }));

            fs.writeFileSync(OUTPUT_PATH, JSON.stringify(clusters, null, 2));
            console.log(`[Synthesis] SUCCESS: Generated ${clusters.length} intelligence clusters.`);
            console.log(`[Synthesis] Storage: ${OUTPUT_PATH}`);

        } catch (error: any) {
            console.error('[Synthesis] FAIL:', error.message);
            if (error.stack) console.error(error.stack);
            process.exit(1);
        }
    }

    await runSynthesis();
})();
