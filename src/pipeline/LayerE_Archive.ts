import * as fs from 'fs';
import * as path from 'path';

export function runArchive() {
    console.log("Starting Layer E: Archive");
    const LATEST_DIR = path.join(__dirname, '../../public/data/latest');
    const HEADLINES_FILE = path.join(LATEST_DIR, 'headlines.json');
    const CLUSTERS_FILE = path.join(LATEST_DIR, 'clusters.json');
    const ARCHIVE_BASE = path.join(__dirname, '../../public/data/archive');
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].replace(/:/g, '').substring(0,4); // HHMM format
    
    const ARCHIVE_DIR = path.join(ARCHIVE_BASE, dateStr);
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    
    const runFile = `run-${timeStr}.json`;
    const archivePath = path.join(ARCHIVE_DIR, runFile);
    
    const snapshot = {
        timestamp: now.toISOString(),
        headlines: fs.existsSync(HEADLINES_FILE) ? JSON.parse(fs.readFileSync(HEADLINES_FILE, 'utf-8')) : [],
        clusters: fs.existsSync(CLUSTERS_FILE) ? JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf-8')) : []
    };
    
    fs.writeFileSync(archivePath, JSON.stringify(snapshot, null, 2));
    console.log(`Archived snapshot to ${archivePath}`);

    // Build a manifest so the browser can discover archive files
    const manifest: { date: string; runs: string[] }[] = [];
    const dateDirs = fs.readdirSync(ARCHIVE_BASE).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
    for (const date of dateDirs) {
        const runs = fs.readdirSync(path.join(ARCHIVE_BASE, date))
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse();
        manifest.push({ date, runs });
    }
    fs.writeFileSync(path.join(ARCHIVE_BASE, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Manifest updated with ${manifest.length} date(s).`);
}

if (require.main === module) {
    runArchive();
}
