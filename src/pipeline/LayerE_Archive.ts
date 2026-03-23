import * as fs from 'fs';
import * as path from 'path';

export function runArchive() {
    console.log("Starting Layer E: Archive");
    const LATEST_DIR = path.join(__dirname, '../../public/data/latest');
    const HEADLINES_FILE = path.join(LATEST_DIR, 'headlines.json');
    const CLUSTERS_FILE = path.join(LATEST_DIR, 'clusters.json');
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].replace(/:/g, '').substring(0,4); // HHMM format
    
    const ARCHIVE_DIR = path.join(__dirname, '../../public/data/archive', dateStr);
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    
    const archivePath = path.join(ARCHIVE_DIR, `run-${timeStr}.json`);
    
    const snapshot = {
        timestamp: now.toISOString(),
        headlines: fs.existsSync(HEADLINES_FILE) ? JSON.parse(fs.readFileSync(HEADLINES_FILE, 'utf-8')) : [],
        clusters: fs.existsSync(CLUSTERS_FILE) ? JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf-8')) : []
    };
    
    fs.writeFileSync(archivePath, JSON.stringify(snapshot, null, 2));
    console.log(`Archived snapshot to ${archivePath}`);
}

if (require.main === module) {
    runArchive();
}
