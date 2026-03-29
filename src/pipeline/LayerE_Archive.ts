import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HeadlineRecord, ArticleRecord, ClusterObject } from '../types.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.resolve(__dirname, '../../public/data');
const LATEST_DIR = path.join(DATA_DIR, 'latest');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

export async function runArchive() {
    console.log("Starting Layer E: Archive");
    
    // 1. Load latest data
    const headlines: HeadlineRecord[] = JSON.parse(fs.readFileSync(path.join(LATEST_DIR, 'headlines.json'), 'utf-8'));
    const articles: ArticleRecord[] = JSON.parse(fs.readFileSync(path.join(LATEST_DIR, 'articles.json'), 'utf-8'));
    const clusters: ClusterObject[] = JSON.parse(fs.readFileSync(path.join(LATEST_DIR, 'clusters.json'), 'utf-8'));

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `run-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

    const targetDir = path.join(ARCHIVE_DIR, dateStr);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const snapshot = {
        snapshot_id: `snap_${Date.now()}`,
        run_timestamp: now.toISOString(),
        intake_window_hours: 24,
        synthesis_window_hours: 24,
        sources_checked: new Set(headlines.map(h => h.source_id)).size,
        new_headlines_count: headlines.length,
        extracted_articles_count: articles.length,
        qualified_clusters_count: clusters.length,
        synthesis_count: clusters.length,
        headline_ids: headlines.map(h => h.headline_id),
        article_ids: articles.map(a => a.article_id),
        cluster_ids: clusters.map(c => c.cluster_id),
        synthesis_ids: clusters.map(c => c.cluster_id), // clusters contain synthesis in simple V1
        status: 'success'
    };

    const runData = {
        snapshot,
        headlines,
        articles,
        clusters
    };

    const runFile = path.join(targetDir, `${timeStr}.json`);
    fs.writeFileSync(runFile, JSON.stringify(runData, null, 2));

    // 2. Update Manifest
    const manifestFile = path.join(ARCHIVE_DIR, 'manifest.json');
    let manifest: any[] = [];
    if (fs.existsSync(manifestFile)) {
        manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    }

    let dateEntry = manifest.find((m: any) => m.date === dateStr);
    if (!dateEntry) {
        dateEntry = { date: dateStr, runs: [] };
        manifest.unshift(dateEntry);
    }
    if (!dateEntry.runs.includes(`${timeStr}.json`)) {
        dateEntry.runs.unshift(`${timeStr}.json`);
    }

    // Sort manifest by date desc
    manifest.sort((a, b) => b.date.localeCompare(a.date));
    fs.writeFileSync(manifestFile, JSON.stringify(manifest.slice(0, 30), null, 2));

    console.log(`Archive complete. Snapshot: ${dateStr}/${timeStr}.json`);
}

if (process.argv[1] && (process.argv[1].endsWith('LayerE_Archive.ts') || process.argv[1].endsWith('LayerE_Archive.js'))) {
    runArchive().catch(console.error);
}
