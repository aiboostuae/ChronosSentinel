import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { ArticleRecord, StoryCluster, generateId } from '../types';

const DATA_DIR = path.join(__dirname, '../../public/data/latest');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CLUSTERS_FILE = path.join(DATA_DIR, 'clusters.json');

if (!process.env.GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY provided.");
    process.exit(0);
}

const ai = new GoogleGenAI({});

export async function runSynthesis() {
    console.log("Starting Layer C & D: Synthesis");
    if (!fs.existsSync(ARTICLES_FILE)) return;
    
    const articles: ArticleRecord[] = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
    let existingClusters: StoryCluster[] = [];
    if (fs.existsSync(CLUSTERS_FILE)) {
        try { existingClusters = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf-8')); } catch(e) {}
    }

    // Only process recent articles (last 48 hours)
    const recentArticles = articles.filter(a => new Date(a.publishTime).getTime() > Date.now() - 48 * 60 * 60 * 1000);
    if(recentArticles.length === 0) return;

    // STEP 1: Clustering
    console.log(`Clustering ${recentArticles.length} recent articles...`);
    const payload = recentArticles.map(a => ({ id: a.id, title: a.title, source: a.sourceId }));
    
    const clusterPrompt = `Group the following news articles into clusters if they are about the EXACT SAME real-world event.
Return a JSON array of clusters, where each cluster has a "topic" (short label) and "articleIds" (array of strings). Only include clusters with 2 or more articles from DIFFERENT sources.
Articles:\n${JSON.stringify(payload, null, 2)}`;

    const clusterOptions = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    articleIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["topic", "articleIds"]
            }
        }
    };

    let predictedClusters: {topic: string, articleIds: string[]}[] = [];
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: clusterPrompt,
            config: clusterOptions as any
        });
        predictedClusters = JSON.parse(res.text || "[]");
    } catch(e: any) {
        console.error("Clustering failed:", e.message);
        return;
    }

    const newClusters: StoryCluster[] = [];

    // STEP 2: Comparison (Layer D)
    for (const c of predictedClusters) {
        const memberArticles = recentArticles.filter(a => c.articleIds.includes(a.id));
        if (memberArticles.length < 2) continue;

        const clusterId = generateId(c.articleIds.sort().join('-'));
        const alreadyExists = existingClusters.find(ex => ex.clusterId === clusterId);
        if (alreadyExists) {
            newClusters.push(alreadyExists);
            continue;
        }

        console.log(`Generating comparison for: ${c.topic}`);
        
        const compareText = memberArticles.map(a => `SOURCE: ${a.sourceId}\nTITLE: ${a.title}\nTEXT:\n${a.cleanedText}`).join('\n\n---\n\n');
        
        const comparePrompt = `Analyze these news articles about the same event. Extract the following comparison data:
1. sharedFacts: an array of facts that multiple sources agree on.
2. sourceDistinctions: an array of objects ({ source, point }) highlighting what one outlet emphasizes or omits.
3. synthesisSummary: a 2-3 sentence neutral summary of the event.
4. confidenceNote: whether details materially conflict.
Do NOT invent bias. Only compare wording, emphasis, scope, fact overlap.

Articles:
${compareText}`;

        const compareOptions = {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    sharedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sourceDistinctions: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, properties: { source: {type: Type.STRING}, point: {type: Type.STRING} } 
                        } 
                    },
                    synthesisSummary: { type: Type.STRING },
                    confidenceNote: { type: Type.STRING }
                },
                required: ["sharedFacts", "sourceDistinctions", "synthesisSummary", "confidenceNote"]
            }
        };

        try {
            const compRes = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: comparePrompt,
                config: compareOptions as any
            });
            const comparison = JSON.parse(compRes.text || "{}");
            
            newClusters.push({
                clusterId,
                canonicalLabel: c.topic,
                topic: c.topic,
                memberArticles,
                comparison,
                confidenceScore: 0.9
            });
            
            // Rate limit safety
            await new Promise(r => setTimeout(r, 2000));
        } catch(e: any) {
             console.error(`Comparison failed for ${c.topic}:`, e.message);
        }
    }

    const finalClusters = [...newClusters, ...existingClusters].filter((v, i, a) => a.findIndex(t => (t.clusterId === v.clusterId)) === i).slice(0, 50);
    fs.writeFileSync(CLUSTERS_FILE, JSON.stringify(finalClusters, null, 2));
    console.log(`Synthesis complete. Generated/Retained ${finalClusters.length} clusters.`);
}

if (require.main === module) {
    runSynthesis().catch(console.error);
}
