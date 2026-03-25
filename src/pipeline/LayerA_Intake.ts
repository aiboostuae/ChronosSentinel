import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import { SourceRecord, HeadlineRecord, generateId } from '../types';

const parser = new Parser({ 
    timeout: 5000,
    customFields: {
        item: [
            ['gdacs:alertlevel', 'alertlevel'],
            ['gdacs:level', 'level'],
            ['gdacs:eventtype', 'eventtype']
        ]
    }
});

const SOURCES: SourceRecord[] = [
    { id: 'fox', name: 'Fox News', region: 'US', language: 'en', intakeMethod: 'rss', url: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
    { id: 'aljazeera', name: 'Al Jazeera', region: 'Qatar', language: 'en', intakeMethod: 'rss', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { id: 'bbc', name: 'BBC News', region: 'UK', language: 'en', intakeMethod: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { id: 'reuters', name: 'Reuters', region: 'Global', language: 'en', intakeMethod: 'rss', url: 'https://feeds.reuters.com/reuters/topNews' },
    { id: 'ap', name: 'AP News', region: 'US', language: 'en', intakeMethod: 'rss', url: 'https://feeds.apnews.com/rss/apf-topnews' },
    { id: 'guardian', name: 'The Guardian', region: 'UK', language: 'en', intakeMethod: 'rss', url: 'https://www.theguardian.com/world/rss' },
    { id: 'arabianbusiness', name: 'Arabian Business', region: 'UAE', language: 'en', intakeMethod: 'rss', url: 'https://www.arabianbusiness.com/rss' },
    { id: 'gdacs', name: 'Global Disaster Alerts', region: 'Global', language: 'en', intakeMethod: 'rss', url: 'https://www.gdacs.org/xml/rss.xml' }
];

const DATA_DIR = path.join(__dirname, '../../public/data/latest');
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
        console.log(`Fetching RSS for ${source.name}...`);
        try {
            const feed = await parser.parseURL(source.url);
            
            if (source.id === 'gdacs') {
                // Special handling for GDACS alerts
                console.log(`GDACS: Found ${feed.items.length} raw items.`);
                for (const item of feed.items) {
                    activeAlerts.push({
                        id: item.guid || generateId(item.link || item.title || ''),
                        title: item.title,
                        description: item.contentSnippet,
                        severity: (item as any).alertlevel || (item as any).level || 'Green',
                        link: item.link,
                        pubDate: item.isoDate || now
                    });
                }
                continue;
            }

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

    // Keep the most recent 1000 headlines
    const merged = [...newHeadlines, ...allHeadlines].slice(0, 1000);
    
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HEADLINES_FILE, JSON.stringify(merged, null, 2));
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(activeAlerts, null, 2));
    
    console.log(`Intake complete. Added ${newHeadlines.length} headlines, ${activeAlerts.length} alerts.`);
    return merged;
}

if (require.main === module) {
    runIntake().catch(console.error);
}
