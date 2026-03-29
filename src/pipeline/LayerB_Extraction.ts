import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import type { HeadlineRecord, ArticleRecord } from '../types.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.resolve(__dirname, '../../public/data/latest');
const HEADLINES_FILE = path.join(DATA_DIR, 'headlines.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');

export async function runExtraction() {
    console.log("Starting Layer B: Extraction");
    if (!fs.existsSync(HEADLINES_FILE)) {
        console.log("No headlines found.");
        return [];
    }

    const headlines: HeadlineRecord[] = JSON.parse(fs.readFileSync(HEADLINES_FILE, 'utf-8'));
    let articles: ArticleRecord[] = [];
    if (fs.existsSync(ARTICLES_FILE)) {
        try { articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8')); } catch(e) {}
    }

    // Filter headlines: only recent (last 24h), sort by newest, limit to top 15 for MVC scraping limits
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let candidates = headlines
        .filter(h => h.published_at && h.published_at > oneDayAgo)
        .filter(h => !articles.find(a => a.headline_id === h.headline_id))
        .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
        .slice(0, 15);

    console.log(`Found ${candidates.length} new candidate headlines for extraction.`);
    const newArticles: ArticleRecord[] = [];
    const now = new Date().toISOString();

    for (const item of candidates) {
        console.log(`Extracting: ${item.title}`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(item.url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const html = await response.text();
            const $ = cheerio.load(html);
            
            $('nav, header, footer, script, style, aside, .ad, .advertisement, iframe').remove();

            let cleanedText = '';
            $('p').each((_, el) => {
                const text = $(el).text().trim();
                if (text.length > 40) {
                    cleanedText += text + '\n\n';
                }
            });

            cleanedText = cleanedText.trim();
            if (cleanedText.length < 100) continue; // too short

            const excerpt = cleanedText.substring(0, 200) + '...';

            newArticles.push({
                article_id: `art_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                headline_id: item.headline_id,
                source_id: item.source_id,
                title: item.title,
                url: item.url,
                canonical_url: item.canonical_url,
                author: null,
                published_at: item.published_at,
                extracted_at: now,
                excerpt: excerpt,
                body_text: cleanedText,
                content_length: cleanedText.length,
                language: 'en',
                entities: [],
                geography: [],
                extraction_status: 'success',
                extraction_error: null,
                region_tag: item.region_tag
            });

            await new Promise(r => setTimeout(r, 1000)); // Be polite
        } catch (error: any) {
            console.error(`Failed to extract ${item.url}: ${error.message}`);
        }
    }

    const merged = [...newArticles, ...articles].slice(0, 500); // retain history
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(merged, null, 2));
    console.log(`Extraction complete. Added ${newArticles.length} new articles.`);
    return merged;
}

if (process.argv[1] && (process.argv[1].endsWith('LayerB_Extraction.ts') || process.argv[1].endsWith('LayerB_Extraction.js'))) {
    runExtraction().catch(console.error);
}
