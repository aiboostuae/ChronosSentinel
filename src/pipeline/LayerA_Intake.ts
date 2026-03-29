import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import type { SourceRecord, HeadlineRecord } from '../types.js';
import { generateId } from '../types.js';

const parser = new Parser({ 
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    customFields: {
        item: [
            ['gdacs:alertlevel', 'alertlevel'],
            ['gdacs:level', 'level'],
            ['gdacs:eventtype', 'eventtype']
        ]
    }
});

const SOURCES: SourceRecord[] = [
    { source_id: 'fox', name: 'Fox News', region: 'US', language: 'en', intake_method: 'rss', base_url: 'https://moxie.foxnews.com/google-publisher/latest.xml', active: true, priority: 1 },
    { source_id: 'aljazeera', name: 'Al Jazeera', region: 'Qatar', language: 'en', intake_method: 'rss', base_url: 'https://www.aljazeera.com/xml/rss/all.xml', active: true, priority: 1 },
    { source_id: 'bbc', name: 'BBC News', region: 'UK', language: 'en', intake_method: 'rss', base_url: 'https://feeds.bbci.co.uk/news/world/rss.xml', active: true, priority: 1 },
    { source_id: 'reuters', name: 'Reuters', region: 'Global', language: 'en', intake_method: 'rss', base_url: 'https://feeds.reuters.com/reuters/topNews', active: true, priority: 1 },
    { source_id: 'ap', name: 'AP News', region: 'US', language: 'en', intake_method: 'rss', base_url: 'https://feeds.apnews.com/rss/apf-topnews', active: true, priority: 1 },
    { source_id: 'guardian', name: 'The Guardian', region: 'UK', language: 'en', intake_method: 'rss', base_url: 'https://www.theguardian.com/world/rss', active: true, priority: 1 },
    { source_id: 'arabianbusiness', name: 'Arabian Business', region: 'UAE', language: 'en', intake_method: 'rss', base_url: 'https://www.arabianbusiness.com/rss', active: true, priority: 1 },
    { source_id: 'gdacs', name: 'Global Disaster Alerts', region: 'Global', language: 'en', intake_method: 'rss', base_url: 'https://www.gdacs.org/xml/rss.xml', active: true, priority: 1 }
];

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.resolve(__dirname, '../../public/data/latest');
const HEADLINES_FILE = path.join(DATA_DIR, 'headlines.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

export async function runIntake() {
    console.log("Starting Layer A: Intake");
    let allHeadlines: HeadlineRecord[] = [];
    
    if (fs.existsSync(HEADLINES_FILE)) {
        try {
            allHeadlines = JSON.parse(fs.readFileSync(HEADLINES_FILE, 'utf-8'));
        } catch(e) { /* ignore */ }
    }

    const newHeadlines: HeadlineRecord[] = [];
    const activeAlerts: any[] = [];
    const now = new Date().toISOString();

    for (const source of SOURCES) {
        if (!source.active) continue;
        console.log(`Fetching RSS for ${source.name}...`);
        try {
            const feed = await parser.parseURL(source.base_url);
            
            if (source.source_id === 'gdacs') {
                // Special handling for GDACS alerts
                console.log(`GDACS: Found ${feed.items.length} raw items.`);
                for (const item of feed.items) {
                    activeAlerts.push({
                        alert_id: item.guid || generateId(item.link || item.title || ''),
                        title: item.title,
                        description: item.contentSnippet,
                        severity: (item as any).alertlevel || (item as any).level || 'Green',
                        url: item.link,
                        published_at: item.isoDate || now
                    });
                }
                continue;
            }

            for (const item of feed.items) {
                if (!item.title || !item.link) continue;
                
                const hash = generateId(item.link);
                if (!allHeadlines.find(h => h.hash === hash)) {
                    const regionTag = ['aljazeera', 'arabianbusiness'].includes(source.source_id) ? 'middle-east' : 'global';
                    newHeadlines.push({
                        headline_id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        source_id: source.source_id,
                        title: item.title,
                        url: item.link,
                        canonical_url: item.link,
                        section: null,
                        published_at: item.isoDate || item.pubDate || now,
                        ingested_at: now,
                        seen_before: false,
                        extraction_status: 'pending',
                        hash: hash,
                        region_tag: regionTag
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to fetch ${source.name}:`, error);
        }
    }

    // Keep the most recent 1000 headlines
    const merged = [...newHeadlines, ...allHeadlines].slice(0, 1000);
    
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HEADLINES_FILE, JSON.stringify(merged, null, 2));
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(activeAlerts, null, 2));
    
    console.log(`Intake complete. Added ${newHeadlines.length} headlines, ${activeAlerts.length} alerts.`);
    return merged;
}

if (process.argv[1] && (process.argv[1].endsWith('LayerA_Intake.ts') || process.argv[1].endsWith('LayerA_Intake.js'))) {
    runIntake().catch(console.error);
}
