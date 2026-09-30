import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type { ArticleRecord, ClusterObject } from '../types.js';
import { generateId } from '../types.js';
import { generatePublicSurfaces } from './GeneratePublicSurfaces.js';

// ─── Path Setup ───────────────────────────────────────────────────────────────
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.join(__dirname, '../../public/data/latest');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CLUSTERS_FILE = path.join(DATA_DIR, 'clusters.json');

// ─── Provider Abstraction ─────────────────────────────────────────────────────
// PRAXIS: Do not replace Gemini blindly. Fallback to Groq only on 429 errors.

async function callAI(prompt: string, schema: any): Promise<any> {
    const models = ['gemini-3.1-flash-lite', 'gemini-3-flash', 'gemini-3.5-flash'];
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
        try {
            await generatePublicSurfaces();
        } catch(e: any) {
            console.error("Public surface generation failed:", e.message);
        }
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
Each cluster should have a "topic" (short label, max 8 words) and "articleIds" (array of strings).

THE INCIDENT DISENTANGLEMENT RULE:
1. Chronic Regional Streams: Group slow, macro-geopolitical developments into broad regional buckets.
2. Acute Kinetic Anomalies: ANY event involving physical violence, airspace closure, transport emergency, or kinetic force MUST break out into an independent, standalone cluster titled specifically to that event (e.g., "Flydubai FZ1073: In-Flight Assault & Emergency Diversion"). NEVER append a sudden, life-threatening incident into a broad regional bucket.

PRIORITY:
1. Acute Kinetic events MUST be separated into standalone clusters.
2. Always include clusters related to the Middle East, UAE, or Dubai.
3. Always include clusters involving global disasters (source: gdacs).
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
                title: { type: Type.STRING },
                severity: { type: Type.STRING },
                incident_type: { type: Type.STRING },
                synthesis: { type: Type.STRING },
                consensus: { type: Type.ARRAY, items: { type: Type.STRING } },
                divergence: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: [
                "title", "severity", "incident_type", "synthesis", "consensus", "divergence"
            ]
        };

        const comparePrompt = `You are a neutral intelligence analyst applying strict Kinetic Ground Truth discipline.
Your task is to analyze the following news articles about the same event and populate each field exactly as defined.

STRICT RULES — YOU MUST FOLLOW ALL OF THEM:
1. Kinetic Ground Truth: You must prioritize physical reality over narrative. What physical event occurred? What weapons/instruments were used? What is the telemetry?
2. De-Sanitization: You must systematically strip out corporate and institutional euphemisms. An armed cockpit breach is not an "in-flight incident." Report the physical action as it occurred.
3. Universal Threat Severity Matrix: Classify severity deterministically into EXACTLY ONE of these levels:
   - CRITICAL: Active hijacking, transponder Squawk 7500/7700, suicide detonations, mass stabbings, direct ballistic impacts on civilian centers, sudden airspace/border closures, active evacuation orders.
   - HIGH: Intercepted ballistic/drone salvos, military infrastructure strikes, naval vessel interdictions/seizures, confirmed active armed skirmishes.
   - MODERATE: Diplomatic expulsions, localized troop buildups, martial law alerts, state of emergency declarations.
   - LOW: Routine political statements, bilateral trade talks, general diplomatic commentary.

FIELD DEFINITIONS:
- title: Precise, Event-Specific Title (No generic regional labels).
- severity: EXACTLY ONE OF: CRITICAL, HIGH, MODERATE, LOW.
- incident_type: e.g., Aviation, Ballistic, Terrorism, Maritime, Infrastructure, Diplomacy.
- synthesis: One high-density executive paragraph stating the physical reality: Actors, instruments used, kinetic actions, telemetry, and current real-world status. De-sanitize corporate/state PR euphemisms immediately.
- consensus: Array of undisputed physical facts corroborated across all feeds.
- divergence: Array of framing/spin differences. Identify what specific detail each entity intentionally omitted, sanitized, or spun. Mention the source explicitly.

Articles:
${compareText}`;

        try {
            const comparison = await callAI(comparePrompt, compareSchema);
            if (comparison) {
                // ── Fallback values ──
                const isFallback = !!comparison._fallback;
                const synText       = isFallback ? 'Automated deterministic fallback summary due to AI provider failure.' : (comparison.synthesis || '');
                const severity      = isFallback ? 'LOW' : (comparison.severity || 'LOW');
                const incidentType  = isFallback ? 'System' : (comparison.incident_type || 'Unknown');
                const topicLabel    = isFallback ? 'Fallback Synthesis' : (comparison.title || c.topic);
                const consensus     = isFallback ? ['Fallback activated.'] : (comparison.consensus || []);
                const divergence    = isFallback ? ['No comparative data.'] : (comparison.divergence || []);

                const sourceRefs = memberArticles.map(a => ({
                    id: a.article_id,
                    url: a.url,
                    source: a.source_id,
                    title: a.title
                }));

                newClusters.push({
                    cluster_id: clusterId,
                    topic_label: topicLabel,
                    event_window_start: memberArticles[memberArticles.length - 1]?.published_at || now,
                    event_window_end: memberArticles[0]?.published_at || now,
                    article_ids: memberArticles.map(a => a.article_id),
                    source_ids: [...new Set(memberArticles.map(a => a.source_id))],
                    article_count: memberArticles.length,
                    source_count: new Set(memberArticles.map(a => a.source_id)).size,
                    qualification_status: 'qualified',
                    qualification_score: isFallback ? 0 : 0.9,
                    primary_geography: null,
                    topic_type: null,
                    created_at: now,
                    updated_at: now,
                    region_tag: memberArticles[0]?.region_tag || 'global',
                    // ── Kinetic Ground Truth Engine fields ──
                    severity:            severity,
                    incident_type:       incidentType,
                    synthesis:           synText,
                    consensus:           consensus,
                    divergence:          divergence,
                    sources:             sourceRefs,
                    model_used:          comparison._telemetry?.used_model || clusterTelemetry.used_model
                });
            }
            // Brief pause between calls to avoid burst rate-limiting
            await new Promise(r => setTimeout(r, 2000));
        } catch(e: any) {
            console.error(`Comparison failed for "${c.topic}":`, e.message);
        }
    }

    // Merge new clusters on top of existing ones.
    // We preserve ALL versions of an evolving story here — the frontend will
    // group them into "Event Threads" so duplicates never show side-by-side.
    // Only deduplicate by exact cluster_id to avoid completely identical saves.
    const seen = new Set<string>();
    const finalClusters: ClusterObject[] = [];
    for (const cluster of [...newClusters, ...existingClusters]) {
        if (!seen.has(cluster.cluster_id)) {
            seen.add(cluster.cluster_id);
            finalClusters.push(cluster);
        }
    }
    // Cap at 200 to retain enough history for Event Thread timeline view
    finalClusters.splice(200);

    fs.writeFileSync(CLUSTERS_FILE, JSON.stringify(finalClusters, null, 2));
    console.log(`Synthesis complete. Generated ${newClusters.length} new, retained ${finalClusters.length - newClusters.length} cached clusters.`);
    
    // Generate public surfaces (CS-009)
    try {
        await generatePublicSurfaces();
    } catch(e: any) {
        console.error("Public surface generation failed:", e.message);
    }
}

if (process.argv[1] && (process.argv[1].endsWith('LayerCD_Synthesis.ts') || process.argv[1].endsWith('LayerCD_Synthesis.js'))) {
    runSynthesis()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
