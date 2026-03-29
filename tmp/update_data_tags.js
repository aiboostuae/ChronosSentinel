const fs = require('fs');
const path = require('path');

const HEADLINES_PATH = 'public/data/latest/headlines.json';
const CLUSTERS_PATH = 'public/data/latest/clusters.json';

const middleEastSources = ['aljazeera', 'arabianbusiness', 'jerusalempost', 'timesofisrael'];

function updateHeadlines() {
    if (!fs.existsSync(HEADLINES_PATH)) return;
    const data = JSON.parse(fs.readFileSync(HEADLINES_PATH, 'utf8'));
    const updated = data.map(h => ({
        ...h,
        region_tag: middleEastSources.includes(h.sourceId) ? 'middle-east' : 'global'
    }));
    fs.writeFileSync(HEADLINES_PATH, JSON.stringify(updated, null, 2));
    console.log(`Updated ${updated.length} headlines.`);
}

function updateClusters() {
    if (!fs.existsSync(CLUSTERS_PATH)) return;
    const data = JSON.parse(fs.readFileSync(CLUSTERS_PATH, 'utf8'));
    const updated = data.map(c => {
        const sources = c.sources || c.memberArticles || [];
        const isME = sources.some(s => middleEastSources.includes(s.id || s.sourceId));
        return {
            ...c,
            region_tag: isME ? 'middle-east' : 'global'
        };
    });
    fs.writeFileSync(CLUSTERS_PATH, JSON.stringify(updated, null, 2));
    console.log(`Updated ${updated.length} clusters.`);
}

function updateArchive() {
    const archiveDir = 'public/data/archive';
    if (!fs.existsSync(archiveDir)) return;
    
    const dates = fs.readdirSync(archiveDir);
    dates.forEach(date => {
        const datePath = path.join(archiveDir, date);
        if (fs.statSync(datePath).isDirectory()) {
            const runs = fs.readdirSync(datePath);
            runs.forEach(run => {
                if (run.endsWith('.json') && run !== 'index.json') {
                    const runPath = path.join(datePath, run);
                    const data = JSON.parse(fs.readFileSync(runPath, 'utf8'));
                    
                    // Update clusters in archive
                    if (data.clusters) {
                        data.clusters = data.clusters.map(c => {
                            const isME = (c.sources || []).some(s => middleEastSources.includes(s.id || s.sourceId));
                            return { ...c, region_tag: isME ? 'middle-east' : 'global' };
                        });
                    }
                    
                    // Update headlines in archive
                    if (data.headlines) {
                        data.headlines = data.headlines.map(h => ({
                            ...h,
                            region_tag: middleEastSources.includes(h.sourceId) ? 'middle-east' : 'global'
                        }));
                    }
                    
                    fs.writeFileSync(runPath, JSON.stringify(data, null, 2));
                }
            });
        }
    });
    console.log('Updated archive records.');
}

updateHeadlines();
updateClusters();
updateArchive();
