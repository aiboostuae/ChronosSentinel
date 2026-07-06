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
                shared_facts:        { type: Type.ARRAY, items: { type: Type.STRING } },
                source_claims:       { type: Type.ARRAY, items: { type: Type.STRING } },
                framing_differences: { type: Type.ARRAY, items: { type: Type.STRING } },
                contested_claims:    { type: Type.ARRAY, items: { type: Type.STRING } },
                unverified_claims:   { type: Type.ARRAY, items: { type: Type.STRING } },
                loaded_language:     { type: Type.ARRAY, items: { type: Type.STRING } },
                safe_conclusions:    { type: Type.ARRAY, items: { type: Type.STRING } },
                unknowns:            { type: Type.ARRAY, items: { type: Type.STRING } },
                synthesis:           { type: Type.STRING },
                confidence:          { type: Type.STRING }
            },
            required: [
                "shared_facts", "source_claims", "framing_differences",
                "contested_claims", "unverified_claims", "loaded_language",
                "safe_conclusions", "unknowns", "synthesis", "confidence"
            ]
        };

        const comparePrompt = `You are a neutral intelligence analyst applying strict Truth and Source Framing Discipline.
Your task is to analyze the following news articles about the same event and populate each field exactly as defined.

STRICT RULES — YOU MUST FOLLOW ALL OF THEM:
1. You must NEVER make editorial judgments. Do not use words like: mischaracterizes, falsely claims, conflates, propaganda, extremist, far-left, far-right, biased, misleading — unless a source explicitly uses those words about another source, in which case you must attribute them directly to that source.
2. You must NEVER decide which source is correct unless at least 2 independent sources establish the same fact.
3. When a source uses charged or opinionated language, you must attribute it: write "[SOURCE_ID] describes the group as [term]" — never state it as fact.
4. Every item in source_claims, unverified_claims, and loaded_language MUST include the source ID in brackets at the start: "[source_id] ..."
5. Every item in framing_differences MUST compare two or more specific sources by name.
6. Do not speculate about motive or intent unless directly stated in the text.
7. safe_conclusions must only contain statements ALL sources would agree with — factual, verifiable, uncontested.
8. unknowns must list what is genuinely not answerable from the provided sources.
9. synthesis must be a maximum of 3 sentences, written in entirely neutral, factual language with no editorial framing.

FIELD DEFINITIONS:
- shared_facts: Facts corroborated by 2 or more independent sources. State exactly what they agree on.
- source_claims: Specific claims made by individual sources. Prefix each with [source_id]. Do not assert truth.
- framing_differences: How different sources frame the same event differently. Name the sources explicitly.
- contested_claims: Claims where sources directly contradict each other. Describe the contradiction neutrally.
- unverified_claims: Claims appearing in only one source, not confirmed elsewhere. Prefix with [source_id].
- loaded_language: Any charged, opinionated, or emotionally loaded language. Attribute it: "[source_id] uses the term '...' to describe..."
- safe_conclusions: Only conclusions that ALL sources would agree with. No inference beyond the text.
- unknowns: Key questions the sources leave unanswered.
- synthesis: A neutral 3-sentence maximum summary. No judgment. No editorial framing.
- confidence: Assess factual consistency across sources. Use: HIGH / MEDIUM / LOW / CONTESTED. Add a one-sentence justification.

Articles:
${compareText}`;

        try {
            const comparison = await callAI(comparePrompt, compareSchema);
            if (comparison) {
                // ── Fallback values ──
                const isFallback = !!comparison._fallback;
                const synText         = isFallback ? 'Automated deterministic fallback summary due to AI provider failure.' : (comparison.synthesis || '');
                const conf            = isFallback ? 'LOW (Deterministic Fallback)' : (comparison.confidence || 'LOW');
                const sharedFacts     = isFallback ? ['Fallback activated.']       : (comparison.shared_facts || []);
                const sourceClaims    = isFallback ? ['No data available.']        : (comparison.source_claims || []);
                const framingDiffs    = isFallback ? ['No comparative data.']      : (comparison.framing_differences || []);
                const contestedClaims = isFallback ? []                            : (comparison.contested_claims || []);
                const unverified      = isFallback ? []                            : (comparison.unverified_claims || []);
                const loadedLang      = isFallback ? []                            : (comparison.loaded_language || []);
                const safeConclusions = isFallback ? []                            : (comparison.safe_conclusions || []);
                const unknowns        = isFallback ? ['No analysis possible.']     : (comparison.unknowns || []);

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
                    qualification_score: isFallback ? 0 : 0.9,
                    primary_geography: null,
                    topic_type: null,
                    created_at: now,
                    updated_at: now,
                    region_tag: memberArticles[0]?.region_tag || 'global',
                    // ── Truth & Source Framing Discipline fields ──
                    shared_facts:        sharedFacts,
                    source_claims:       sourceClaims,
                    framing_differences: framingDiffs,
                    contested_claims:    contestedClaims,
                    unverified_claims:   unverified,
                    loaded_language:     loadedLang,
                    safe_conclusions:    safeConclusions,
                    unknowns:            unknowns,
                    synthesis:           synText,
                    confidence:          conf,
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
