import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import type { ArticleRecord, ClusterObject } from '../types.js';

const API_KEY = process.env.GEMINI_API_KEY;
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.resolve(__dirname, '../../public/data/latest');
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'clusters.json');

console.log('[Synthesis] Initializing Intelligence Pipeline...');

if (!API_KEY) {
    console.error('[Synthesis] CRITICAL: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
}

export async function runSynthesis() {
    try {
        if (!fs.existsSync(ARTICLES_PATH)) {
            console.error('[Synthesis] articles.json not found. Run LayerB scraper first.');
            return;
        }

        const rawData = fs.readFileSync(ARTICLES_PATH, 'utf8');
        const articles: ArticleRecord[] = JSON.parse(rawData);
        
        console.log(`[Synthesis] Grouping ${articles.length} articles into local clusters...`);

        // 1. Local Temporal Clustering (Simple Windowing)
        const localClusters: ArticleRecord[][] = [];
        const sorted = [...articles].sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
        
        for (const art of sorted) {
            let found = false;
            for (const cluster of localClusters) {
                const reference = cluster[0];
                if (!reference) continue;
                const timeDiff = Math.abs(new Date(art.published_at || '').getTime() - new Date(reference.published_at || '').getTime()) / (1000 * 60 * 60);
                
                if (timeDiff <= 24) {
                    const artWords = art.title.toLowerCase().split(/\W+/).filter(w => w.length > 4);
                    const refWords = reference.title.toLowerCase().split(/\W+/).filter(w => w.length > 4);
                    const overlap = artWords.filter(w => refWords.includes(w));
                    
                    if (overlap.length >= 2) {
                        cluster.push(art);
                        found = true;
                        break;
                    }
                }
            }
            if (!found) localClusters.push([art]);
        }

        console.log(`[Synthesis] Formed ${localClusters.length} candidate clusters locally.`);

        // 2. Cluster Qualification & Synthesis
        const finalClusters: ClusterObject[] = [];
        const ai = new GoogleGenAI(API_KEY!);

        for (const group of localClusters) {
            if (!group || group.length === 0) continue;
            const uniqueSources = new Set(group.map(a => a.source_id)).size;
            const firstArt = group[0]!;
            const recencyHours = (Date.now() - new Date(firstArt.published_at || '').getTime()) / (1000 * 60 * 60);
            
            // SECTION 1 & 2 of 06-cluster-qualification.md
            let score = 0;
            score += (uniqueSources >= 5) ? 3 : (uniqueSources >= 3) ? 2 : (uniqueSources >= 2) ? 1 : 0; // Source Diversity
            score += (recencyHours < 6) ? 2 : (recencyHours < 12) ? 1 : 0; // Recency
            score += 3; // Geopolitics / Economic baseline weight

            const qualified = uniqueSources >= 2 && score >= 5;

            if (qualified) {
                console.log(`[Synthesis] Synthesizing Qualified Cluster (Score: ${score}, Sources: ${uniqueSources})...`);
                
                const systemPromptPath = path.resolve(__dirname, '../../docs/engineered_prompts/02-gemini-prompt.md');
                const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');
                const selectedArticles = group.slice(0, 5);
                const inputPayload = selectedArticles.map(a => ({
                    source: a.source_id,
                    title: a.title,
                    content: a.body_text ? a.body_text.substring(0, 1000) : ''
                }));

                try {
                    const result = await ai.models.generateContent({
                        model: 'gemini-2.0-flash',
                        contents: [{ 
                            role: 'user', 
                            parts: [{ 
                                text: `INPUT ARTICLES:\n${JSON.stringify(inputPayload, null, 2)}\n\nOUTPUT JSON FORMAT (STRICT):\n{
                                    "shared_facts": ["fact 1", "fact 2"],
                                    "source_differences": ["source name 1 emphasized x...", "source name 2 omitted y..."],
                                    "synthesis": "One paragraph summary...",
                                    "confidence": "Consistent / Conflict / Unclear"
                                }` 
                            }] 
                        }],
                        config: {
                            systemInstruction: systemPrompt,
                            temperature: 0.1,
                            responseMimeType: 'application/json'
                        }
                    });

                    const synthesisText = result.text || '{}';
                    const synthesisData = JSON.parse(synthesisText);
                    
                    const clusterId = `cl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    
                    finalClusters.push({
                        cluster_id: clusterId,
                        topic_label: firstArt.title.split(':').pop()?.trim() || 'Intelligence Update',
                        event_window_start: group[group.length - 1].published_at || '',
                        event_window_end: group[0].published_at || '',
                        article_ids: group.map(a => a.article_id),
                        source_ids: Array.from(new Set(group.map(a => a.source_id))),
                        article_count: group.length,
                        source_count: uniqueSources,
                        qualification_status: 'qualified',
                        qualification_score: score,
                        primary_geography: group.some(a => a.region_tag === 'middle-east') ? 'Middle East' : 'Global',
                        topic_type: 'geopolitics',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        region_tag: group.some(a => a.region_tag === 'middle-east') ? 'middle-east' : 'global',

                        // Combined Synthesis for UI - Strict Mapping
                        shared_facts: synthesisData.shared_facts || [],
                        source_differences: synthesisData.source_differences || [],
                        synthesis: synthesisData.synthesis || '',
                        confidence: synthesisData.confidence || 'Unconfirmed',
                        sources: group.map(a => ({ id: a.source_id, title: a.title, url: a.url, source: a.source_id }))
                    });
                } catch (pe: any) {
                    console.error('[Synthesis] Failed to synthesize cluster:', pe.message);
                }
            }
        }

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalClusters, null, 2));
        console.log(`[Synthesis] SUCCESS: Generated ${finalClusters.length} qualified intelligence clusters.`);
        console.log(`[Synthesis] Storage: ${OUTPUT_PATH}`);

    } catch (error: any) {
        console.error('[Synthesis] FAIL:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

if (process.argv[1] && (process.argv[1].endsWith('LayerCD_Synthesis.ts') || process.argv[1].endsWith('LayerCD_Synthesis.js'))) {
    runSynthesis().catch(console.error);
}
