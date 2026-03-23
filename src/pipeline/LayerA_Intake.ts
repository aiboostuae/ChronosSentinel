import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import { SourceRecord, HeadlineRecord, generateId } from '../types';

const parser = new Parser({ timeout: 5000 });

const SOURCES: SourceRecord[] = [
    { id: 'fox', name: 'Fox News', region: 'US', language: 'en', intakeMethod: 'rss', url: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
    { id: 'aljazeera', name: 'Al Jazeera', region: 'Qatar', language: 'en', intakeMethod: 'rss', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { id: 'bbc', name: 'BBC News', region: 'UK', language: 'en', intakeMethod: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { id: 'reuters', name: 'Reuters', region: 'Global', language: 'en', intakeMethod: 'rss', url: 'https://feeds.reuters.com/reuters/topNews' },
    { id: 'ap', name: 'AP News', region: 'US', language: 'en', intakeMethod: 'rss', url: 'https://feeds.apnews.com/rss/apf-topnews' },
    { id: 'guardian', name: 'The Guardian', region: 'UK', language: 'en', intakeMethod: 'rss', url: 'https://www.theguardian.com/world/rss' }
];

const DATA_DIR = path.join(__dirname, '../../public/data/latest');
const HEADLINES_FILE = path.join(DATA_DIR, 'headlines.json');

export async function runIntake() {
    console.log("Starting Layer A: Intake");
    let allHeadlines: HeadlineRecord[] = [];
    
    if (fs.existsSync(HEADLINES_FILE)) {
        try {
            allHeadlines = JSON.parse(fs.readFileSync(HEADLINES_FILE, 'utf-8'));
        } catch(e) { /* ignore */ }
    }

    const newHeadlines: HeadlineRecord[] = [];
    const now = new Date().toISOString();

    for (const source of SOURCES) {
        console.log(`Fetching RSS for ${source.name}...`);
        try {
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items) {
                if (!item.title || !item.link) continue;
                
                const id = generateId(item.link);
                if (!allHeadlines.find(h => h.id === id)) {
                    newHeadlines.push({
                        id,
                        sourceId: source.id,
                        title: item.title,
                        url: item.link,
                        publishTime: item.isoDate || item.pubDate || now,
                        ingestTime: now
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to fetch ${source.name}:`, error);
        }
    }

    // Keep the most recent 1000 headlines to prevent massive local growth in JSON
    const merged = [...newHeadlines, ...allHeadlines].slice(0, 1000);
    
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HEADLINES_FILE, JSON.stringify(merged, null, 2));
    
    console.log(`Intake complete. Added ${newHeadlines.length} new headlines. Total tracked: ${merged.length}.`);
    return merged;
}

if (require.main === module) {
    runIntake().catch(console.error);
}
