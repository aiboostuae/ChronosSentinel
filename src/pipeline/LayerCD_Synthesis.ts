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
    const models = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const telemetry: any = { attempts: [] };

    if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({});
        for (const model of models) {
            try {
                const res = await ai.models.generateContent({
                    model: model,
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: schema
                    } as any
                });
                const parsed = JSON.parse(res.text || 'null');
                if (parsed) {
                    parsed._telemetry = { used_model: model, attempts: telemetry.attempts };
                    console.log(`[Telemetry] Success using ${model}`);
                    return parsed;
                }
            } catch (e: any) {
                const errorMsg = e.message || e.toString();
                telemetry.attempts.push({ model, error: errorMsg });
                console.warn(`[Telemetry] ${model} failed: ${errorMsg}`);
                
                const is429 = e?.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate');
                if (is429) {
                    console.warn(`[Telemetry] 429 rate limit hit on ${model}. Throttling 5s before next model...`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
    } else {
        telemetry.attempts.push({ model: 'none', error: 'No GEMINI_API_KEY provided' });
    }

    console.warn(`[Telemetry] All Gemini models failed. Using deterministic fallback.`);
    
    // Deterministic Fallback
    return {
        _telemetry: { used_model: 'deterministic-fallback', attempts: telemetry.attempts },
        _fallback: true
    };
}

// ─── Synthesis ────────────────────────────────────────────────────────────────
export async function runSynthesis() {
    console.log("Starting Layer C & D: Synthesis");

    if (!process.env.GEMINI_API_KEY) {
        console.warn("No GEMINI_API_KEY provided. Skipping synthesis.");
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

    let predictedClusters: {topic: string, articleIds: string[], _telemetry?: any, _fallback?: boolean}[] = [];
    try {
        const result = await callAI(clusterPrompt, clusterSchema);
        if (result && result._fallback) {
            // Deterministic fallback clustering
            predictedClusters = [{
                topic: "Fallback Synthesis",
                articleIds: recentArticles.map(a => a.article_id).slice(0, 5),
                _telemetry: result._telemetry
            }];
        } else {
            // Because schema dictates array of clusters, but we added _telemetry to the root object.
            // Wait, if schema is ARRAY, JSON.parse returns an array, so we attached _telemetry to the array object.
            predictedClusters = result || [];
            if (result && result._telemetry) {
                (predictedClusters as any)._telemetry = result._telemetry;
            }
        }
    } catch(e: any) {
        console.error("Clustering failed:", e.message);
        return;
    }

    const clusterTelemetry = (predictedClusters as any)._telemetry || { used_model: 'unknown' };

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
                let synText = comparison.synthesis;
                let sharedFacts = comparison.shared_facts;
                let sourceDiffs = comparison.source_differences;
                let conf = comparison.confidence;
                
                if (comparison._fallback) {
                    synText = "Automated deterministic fallback summary due to AI provider failure.";
                    sharedFacts = ["Fallback activated."];
                    sourceDiffs = ["No comparative data available."];
                    conf = "Low (Deterministic Fallback)";
                }

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
                    qualification_score: comparison._fallback ? 0 : 0.9,
                    primary_geography: null,
                    topic_type: null,
                    created_at: now,
                    updated_at: now,
                    region_tag: memberArticles[0]?.region_tag || 'global',
                    // Synthesis fields
                    shared_facts: sharedFacts,
                    source_differences: sourceDiffs,
                    synthesis: synText,
                    confidence: conf,
                    sources: sourceRefs,
                    model_used: comparison._telemetry?.used_model || clusterTelemetry.used_model
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
    runSynthesis()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
