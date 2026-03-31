import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type { ArticleRecord, ClusterObject } from '../types.js';
import { generateId } from '../types.js';

// ─── Path Setup ───────────────────────────────────────────────────────────────
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.join(__dirname, '../../public/data/latest');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CLUSTERS_FILE = path.join(DATA_DIR, 'clusters.json');

// ─── Provider Abstraction ─────────────────────────────────────────────────────
// PRAXIS: Do not replace Gemini blindly. Fallback to Groq only on 429 errors.

async function callAI(prompt: string, schema: any): Promise<any> {
    // --- Primary: Gemini ---
    if (process.env.GEMINI_API_KEY) {
        try {
            const ai = new GoogleGenAI({});
            const res = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema
                } as any
            });
            return JSON.parse(res.text || 'null');
        } catch (e: any) {
            const is429 = e?.status === 429
                || e?.message?.includes('429')
                || e?.message?.includes('quota')
                || e?.message?.includes('rate');
            if (is429) {
                console.warn('[Gemini] 429 rate limit hit — falling back to Groq.');
            } else {
                throw e; // Non-rate-limit error: re-throw, don't waste Groq quota
            }
        }
    }

    // --- Fallback: Groq ---
    if (process.env.GROQ_API_KEY) {
        console.log('[Groq] Attempting synthesis via Groq fallback...');
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.3
            })
        });
        if (!response.ok) {
            throw new Error(`[Groq] API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json() as any;
        return JSON.parse(data.choices[0].message.content || 'null');
    }

    throw new Error('No AI provider available. Set GEMINI_API_KEY or GROQ_API_KEY.');
}

// ─── Synthesis ────────────────────────────────────────────────────────────────
export async function runSynthesis() {
    console.log("Starting Layer C & D: Synthesis");

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        console.warn("No AI provider keys provided. Skipping synthesis.");
        process.exit(0);
    }

    if (!fs.existsSync(ARTICLES_FILE)) {
        console.log("No articles file found. Skipping.");
        return;
    }

    const articles: ArticleRecord[] = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
    let existingClusters: ClusterObject[] = [];
    if (fs.existsSync(CLUSTERS_FILE)) {
        try { existingClusters = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf-8')); } catch(e) {}
    }

    // Only process recent articles (last 24 hours)
    const recentArticles = articles.filter(a =>
        a.published_at && new Date(a.published_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    if (recentArticles.length === 0) {
        console.log("No recent articles. Skipping.");
        return;
    }

    // STEP 1: Clustering (one AI call to group all articles)
    console.log(`Clustering ${recentArticles.length} recent articles...`);
    const payload = recentArticles.map(a => ({
        id: a.article_id,
        title: a.title,
        source: a.source_id
    }));

    const clusterSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING },
                articleIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["topic", "articleIds"]
        }
    };

    const clusterPrompt = `Group the following news articles into clusters by topic/event.
Each cluster should have a "topic" (short label, max 5 words) and "articleIds" (array of strings).
PRIORITY:
1. Always include clusters related to the Middle East, UAE, or Dubai.
2. Always include clusters involving global disasters or threat levels (source: gdacs).
3. Group other significant international events with multi-source coverage.
Only include 1-article clusters if the topic is extremely high-severity (e.g. GDACS alert).
Articles:\n${JSON.stringify(payload, null, 2)}`;

    let predictedClusters: {topic: string, articleIds: string[]}[] = [];
    try {
        predictedClusters = await callAI(clusterPrompt, clusterSchema) || [];
    } catch(e: any) {
        console.error("Clustering failed:", e.message);
        return;
    }

    const newClusters: ClusterObject[] = [];
    const now = new Date().toISOString();

    // STEP 2: Comparison (Layer D) — one call per qualified cluster
    for (const c of predictedClusters.slice(0, 8)) {
        const memberArticles = recentArticles.filter(a => c.articleIds.includes(a.article_id));

        // PRAXIS: Strict qualification — require 2+ articles per cluster
        // Exception: GDACS single-article alerts are always qualified
        const isGdacs = memberArticles.some(a => a.source_id === 'gdacs');
        if (memberArticles.length < 2 && !isGdacs) {
            console.log(`Skipping "${c.topic}": only ${memberArticles.length} article(s), not GDACS.`);
            continue;
        }

        // PRAXIS: Fingerprint-based caching — skip if cluster is unchanged
        const clusterId = generateId(c.articleIds.sort().join('-'));
        const alreadyExists = existingClusters.find(ex => ex.cluster_id === clusterId);
        if (alreadyExists) {
            console.log(`Cache hit for "${c.topic}" — reusing existing synthesis.`);
            newClusters.push(alreadyExists);
            continue;
        }

        console.log(`Generating comparison for: ${c.topic} (${memberArticles.length} articles)`);

        // PRAXIS: Trim inputs to max 800 chars per article to reduce tokens
        const compareText = memberArticles
            .slice(0, 5)
            .map(a => {
                const excerpt = (a.body_text || a.excerpt || '').substring(0, 800);
                return `SOURCE: ${a.source_id}\nTITLE: ${a.title}\nTEXT:\n${excerpt}`;
            })
            .join('\n\n---\n\n');

        const compareSchema = {
            type: Type.OBJECT,
            properties: {
                shared_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
                source_differences: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                synthesis: { type: Type.STRING },
                confidence: { type: Type.STRING }
            },
            required: ["shared_facts", "source_differences", "synthesis", "confidence"]
        };

        const comparePrompt = `ACT AS A SENIOR INTELLIGENCE ANALYST.
Analyze these news articles about the same event. Respond with:
1. shared_facts: array of verified facts that multiple sources agree on.
2. source_differences: array of strings highlighting unique framing or omissions from each outlet.
3. synthesis: concise, neutral intelligence summary (max 3 sentences).
4. confidence: assessment of whether reporting is consistent or contains contradictions.

Articles:
${compareText}`;

        try {
            const comparison = await callAI(comparePrompt, compareSchema);
            if (comparison) {
                const sourceRefs = memberArticles.map(a => ({
                    id: a.article_id,
                    url: a.url,
                    source: a.source_id,
                    title: a.title
                }));
                newClusters.push({
                    cluster_id: clusterId,
                    topic_label: c.topic,
                    event_window_start: memberArticles[memberArticles.length - 1]?.published_at || now,
                    event_window_end: memberArticles[0]?.published_at || now,
                    article_ids: memberArticles.map(a => a.article_id),
                    source_ids: [...new Set(memberArticles.map(a => a.source_id))],
                    article_count: memberArticles.length,
                    source_count: new Set(memberArticles.map(a => a.source_id)).size,
                    qualification_status: 'qualified',
                    qualification_score: 0.9,
                    primary_geography: null,
                    topic_type: null,
                    created_at: now,
                    updated_at: now,
                    region_tag: memberArticles[0]?.region_tag || 'global',
                    // Synthesis fields
                    shared_facts: comparison.shared_facts,
                    source_differences: comparison.source_differences,
                    synthesis: comparison.synthesis,
                    confidence: comparison.confidence,
                    sources: sourceRefs
                });
            }
            // Brief pause between calls to avoid burst rate-limiting
            await new Promise(r => setTimeout(r, 2000));
        } catch(e: any) {
            console.error(`Comparison failed for "${c.topic}":`, e.message);
        }
    }

    const finalClusters = [...newClusters, ...existingClusters]
        .filter((v, i, a) => a.findIndex(t => t.cluster_id === v.cluster_id) === i)
        .slice(0, 50);

    fs.writeFileSync(CLUSTERS_FILE, JSON.stringify(finalClusters, null, 2));
    console.log(`Synthesis complete. Generated ${newClusters.length} new, retained ${finalClusters.length - newClusters.length} cached clusters.`);
}

if (process.argv[1] && (process.argv[1].endsWith('LayerCD_Synthesis.ts') || process.argv[1].endsWith('LayerCD_Synthesis.js'))) {
    runSynthesis().catch(console.error);
}
