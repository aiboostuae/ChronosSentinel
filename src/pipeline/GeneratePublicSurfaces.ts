import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ClusterObject } from '../types.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA_DIR = path.resolve(__dirname, '../../public/data/latest');
const API_DIR = path.resolve(__dirname, '../../public/api/v1');
const FEEDS_DIR = path.resolve(__dirname, '../../public/feeds');
const EMBED_DIR = path.resolve(__dirname, '../../public/embed');

// Ensure output directories exist
[API_DIR, FEEDS_DIR, EMBED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// XML Escape helper
function esc(str: string | undefined | null): string {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Domain Classification Rules
const DOMAIN_KEYWORDS: Record<string, string[]> = {
    conflict: ["war", "conflict", "clash", "strike", "attack", "military", "houthi", "missile", "drone", "shelling", "combat", "forces", "terror", "hostage"],
    disaster: ["earthquake", "flood", "cyclone", "volcano", "tsunami", "landslide", "disaster", "emergency", "evacuation", "quake", "storm", "hurricane"],
    cybersecurity: ["cybersecurity", "ransomware", "hacker", "breach", "hack", "cyberattack", "ddos", "malware", "scada", "firewall"],
    energy: ["oil", "gas", "pipeline", "refinery", "opec", "crude", "energy", "petroleum", "diesel", "lng"],
    grid: ["grid", "blackout", "power outage", "electricity", "infrastructure", "substation"],
    shipping: ["shipping", "tanker", "cargo", "vessel", "port", "canal", "corridor", "maritime", "freight", "suez", "panama"],
    instability: ["protest", "riot", "unrest", "strike", "clash", "demonstration", "police", "curfew", "rebellion", "uprising", "inflation", "recession", "currency", "debt", "crisis", "financial"]
};

// Operator Hint recommendations
const OPERATOR_HINTS: Record<string, string> = {
    conflict: "Verify kinetic assets and deployment paths; cross-reference military feeds.",
    disaster: "Check GDACS logs and local weather radar; ensure communication loops are active.",
    cybersecurity: "Alert security operations center (SOC); monitor threat intelligence vectors.",
    energy: "Track crude commodity prices and pipeline telemetry alerts.",
    grid: "Monitor power grid frequencies and grid status maps.",
    shipping: "Check maritime transit logs (Suez/Strait of Hormuz) and shipping carrier bulletins.",
    instability: "Monitor social media feeds and local transit advisories for escalation signals."
};

export async function generatePublicSurfaces() {
    console.log("Starting static public surface generation...");

    const now = new Date().toISOString();

    // 1. Load latest files
    let clusters: ClusterObject[] = [];
    let headlines: any[] = [];
    let watchlist: any[] = [];

    try {
        const clustersPath = path.join(DATA_DIR, 'clusters.json');
        if (fs.existsSync(clustersPath)) {
            clusters = JSON.parse(fs.readFileSync(clustersPath, 'utf-8'));
        }
    } catch (e) {
        console.error("Error reading clusters.json:", e);
    }

    try {
        const headlinesPath = path.join(DATA_DIR, 'headlines.json');
        if (fs.existsSync(headlinesPath)) {
            headlines = JSON.parse(fs.readFileSync(headlinesPath, 'utf-8'));
        }
    } catch (e) {
        console.error("Error reading headlines.json:", e);
    }

    try {
        const watchlistPath = path.join(DATA_DIR, 'watchlist.json');
        if (fs.existsSync(watchlistPath)) {
            watchlist = JSON.parse(fs.readFileSync(watchlistPath, 'utf-8'));
        }
    } catch (e) {
        console.error("Error reading watchlist.json:", e);
    }

    // 2. Generate Impact Events
    const impactItems: any[] = [];

    for (const c of clusters) {
        const topicLower = (c.topic_label || '').toLowerCase();
        const synLower = (c.synthesis || '').toLowerCase();
        const mergedText = `${topicLower} ${synLower}`;

        // Find domains
        const matchedDomains: string[] = [];
        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
            if (keywords.some(kw => mergedText.includes(kw))) {
                matchedDomains.push(domain);
            }
        }

        if (matchedDomains.length === 0) continue; // Skip non-impactful clusters

        // Check watchlist match
        let matchedWatchId: string | null = null;
        let severityBump = false;

        for (const w of watchlist) {
            if ((w.keywords || []).some((kw: string) => mergedText.includes(kw.toLowerCase()))) {
                matchedWatchId = w.id;
                if (w.severity === 'high' || w.severity === 'critical') {
                    severityBump = true;
                }
            }
        }

        // Determine Severity
        let severity = 'low';
        const isCriticalText = ["mass casualty", "evacuation", "national emergency", "disaster alert", "nuclear", "grid failure", "infrastructure failure"].some(w => mergedText.includes(w));
        const hasGdacs = c.source_ids && c.source_ids.includes('gdacs');

        if (isCriticalText || (hasGdacs && severityBump)) {
            severity = 'critical';
        } else if (severityBump || c.source_count >= 3 || (c.qualification_score && c.qualification_score >= 8)) {
            severity = 'high';
        } else if (c.source_count >= 2 || (c.qualification_score && c.qualification_score >= 5)) {
            severity = 'medium';
        }

        // Determine confidence
        let confidenceLabel = 'low';
        const confLower = (c.confidence || '').toLowerCase();
        if (confLower.includes('high')) {
            confidenceLabel = 'high';
        } else if (confLower.includes('medium')) {
            confidenceLabel = 'medium';
        }

        // Evidence summary
        const evidenceSummary = `${c.source_count} source(s), ${confidenceLabel} confidence.`;

        // Operator hint
        let operatorHint = "Monitor signal channels for further confirmation.";
        const primaryDomain = matchedDomains[0];
        if (primaryDomain && OPERATOR_HINTS[primaryDomain]) {
            operatorHint = OPERATOR_HINTS[primaryDomain];
        }

        impactItems.push({
            id: `impact-${c.cluster_id.substring(0, 8)}`,
            title: c.topic_label,
            severity,
            status: "active",
            region: c.region_tag === 'middle-east' ? "Middle East" : "Global",
            domains: matchedDomains,
            why_it_matters: c.synthesis || "Details pending.",
            evidence_summary: evidenceSummary,
            confidence_label: confidenceLabel,
            corroboration_level: c.source_count >= 4 ? "high" : c.source_count >= 2 ? "moderate" : "low",
            source_count: c.source_count,
            related_cluster_id: c.cluster_id,
            related_watchlist_id: matchedWatchId,
            operator_hint: operatorHint,
            updated_at: c.updated_at || now
        });
    }

    const impactData = {
        generated_at: now,
        status: impactItems.length > 0 ? "ready" : "empty",
        items: impactItems
    };

    // Save impact.json locally
    fs.writeFileSync(path.join(DATA_DIR, 'impact.json'), JSON.stringify(impactData, null, 2));
    console.log(`Saved impact.json with ${impactItems.length} items.`);

    // 3. Write API v1 Static Surfaces
    fs.writeFileSync(path.join(API_DIR, 'impact.json'), JSON.stringify(impactData, null, 2));
    fs.writeFileSync(path.join(API_DIR, 'watchlist.json'), JSON.stringify(watchlist, null, 2));

    const publicClusters = clusters.map(c => ({
        cluster_id: c.cluster_id,
        topic_label: c.topic_label,
        event_window_start: c.event_window_start,
        event_window_end: c.event_window_end,
        article_count: c.article_count,
        source_count: c.source_count,
        region_tag: c.region_tag,
        shared_facts: c.shared_facts || [],
        source_differences: c.source_differences || [],
        synthesis: c.synthesis || '',
        confidence: c.confidence || '',
        sources: (c.sources || []).map(s => ({ source: s.source, url: s.url, title: s.title })),
        updated_at: c.updated_at
    }));
    fs.writeFileSync(path.join(API_DIR, 'clusters.json'), JSON.stringify(publicClusters, null, 2));

    const latestSummary = {
        generated_at: now,
        status: "healthy",
        clusters_count: publicClusters.length,
        impact_count: impactItems.length,
        watchlist_count: watchlist.length,
        latest_clusters: publicClusters.slice(0, 10),
        latest_impact: impactItems.slice(0, 10)
    };
    fs.writeFileSync(path.join(API_DIR, 'latest.json'), JSON.stringify(latestSummary, null, 2));

    // Determine status
    const firstCluster = clusters[0];
    const fallbackUsed = firstCluster ? (firstCluster.synthesis?.includes('fallback') || firstCluster.model_used === 'deterministic-fallback') : false;
    const systemStatus = fallbackUsed ? "degraded" : "healthy";
    const statusData = {
        generated_at: now,
        system_status: systemStatus,
        synthesis_status: "success",
        engine: fallbackUsed ? "deterministic-fallback" : "ai-assisted",
        fallback_used: fallbackUsed,
        freshness: {
            overall: "fresh"
        },
        counts: {
            clusters: publicClusters.length,
            watchlist: watchlist.length,
            impact: impactItems.length
        }
    };
    fs.writeFileSync(path.join(API_DIR, 'status.json'), JSON.stringify(statusData, null, 2));

    // 4. Generate RSS Feeds
    const pubDateRss = new Date().toUTCString();

    const latestRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Chronos Sentinel - Latest Intelligence Synthesis</title>
    <link>https://sentinel.codexarchai.com/</link>
    <description>Latest AI-synthesized intelligence topics and event comparison briefings.</description>
    <pubDate>${pubDateRss}</pubDate>
    <lastBuildDate>${pubDateRss}</lastBuildDate>
    ${publicClusters.map(c => `
    <item>
        <title>${esc(c.topic_label)}</title>
        <link>https://sentinel.codexarchai.com/?tab=sentinel&amp;cluster=${c.cluster_id}</link>
        <guid>https://sentinel.codexarchai.com/?tab=sentinel&amp;cluster=${c.cluster_id}</guid>
        <pubDate>${new Date(c.event_window_end || c.updated_at || now).toUTCString()}</pubDate>
        <description>${esc(c.synthesis || 'No synthesis details available.')}</description>
        <category>${esc(c.region_tag)}</category>
    </item>`).join('')}
</channel>
</rss>`;
    fs.writeFileSync(path.join(FEEDS_DIR, 'latest.xml'), latestRss);

    const impactRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Chronos Sentinel - Operational Impact Signals</title>
    <link>https://sentinel.codexarchai.com/</link>
    <description>Critical and high-severity operational intelligence warnings.</description>
    <pubDate>${pubDateRss}</pubDate>
    <lastBuildDate>${pubDateRss}</lastBuildDate>
    ${impactItems.map(i => `
    <item>
        <title>[${i.severity.toUpperCase()}] ${esc(i.title)}</title>
        <link>https://sentinel.codexarchai.com/?tab=impact&amp;event=${i.id}</link>
        <guid>https://sentinel.codexarchai.com/?tab=impact&amp;event=${i.id}</guid>
        <pubDate>${new Date(i.updated_at || now).toUTCString()}</pubDate>
        <description>${esc(i.why_it_matters)} - Operator Hint: ${esc(i.operator_hint)}</description>
        <category>${esc(i.region)}</category>
    </item>`).join('')}
</channel>
</rss>`;
    fs.writeFileSync(path.join(FEEDS_DIR, 'impact.xml'), impactRss);

    const watchlistRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Chronos Sentinel - Watchlist Focus Zones</title>
    <link>https://sentinel.codexarchai.com/</link>
    <description>Topics currently under active surveillance.</description>
    <pubDate>${pubDateRss}</pubDate>
    <lastBuildDate>${pubDateRss}</lastBuildDate>
    ${watchlist.map(w => `
    <item>
        <title>${esc(w.topic)}</title>
        <link>https://sentinel.codexarchai.com/?tab=watchlist</link>
        <guid>watchlist-${esc(w.id)}</guid>
        <pubDate>${new Date(w.updated_at || now).toUTCString()}</pubDate>
        <description>Active monitoring tags: ${esc(w.keywords ? w.keywords.join(', ') : '')}</description>
        <category>${esc(w.region_tag)}</category>
    </item>`).join('')}
</channel>
</rss>`;
    fs.writeFileSync(path.join(FEEDS_DIR, 'watchlist.xml'), watchlistRss);

    // 5. Generate Embed Pages
    const embedBaseHtml = (title: string, apiEndpoint: string, renderFunc: string) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Embed: ${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0B0F14;
            color: #E6EDF3;
            margin: 0;
            padding: 1rem;
            font-size: 14px;
            line-height: 1.5;
        }
        .card {
            background: #161B22;
            border: 1px solid #2A313C;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .title {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 0.5rem 0;
            color: #3B82F6;
        }
        .meta {
            font-size: 11px;
            color: #9DA7B3;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .summary {
            color: #9DA7B3;
            margin-bottom: 0.5rem;
        }
        .badge {
            display: inline-block;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            margin-right: 0.5rem;
        }
        .badge.critical { background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge.high { background: rgba(249, 115, 22, 0.15); color: #F97316; border: 1px solid rgba(249, 115, 22, 0.3); }
        .badge.medium { background: rgba(234, 179, 8, 0.15); color: #EAB308; border: 1px solid rgba(234, 179, 8, 0.3); }
        .badge.low { background: rgba(34, 197, 94, 0.15); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.3); }
        a { color: #3B82F6; text-decoration: none; font-size: 12px; }
        a:hover { text-decoration: underline; }
        .footer {
            text-align: center;
            margin-top: 2rem;
            font-size: 11px;
            color: #6B7785;
        }
    </style>
</head>
<body>
    <div id="embed-container">Loading...</div>
    <div class="footer">
        Powered by <a href="https://sentinel.codexarchai.com/" target="_blank">Chronos Sentinel</a> OSINT Engine.
    </div>
    <script>
        async function loadEmbedData() {
            const container = document.getElementById('embed-container');
            try {
                const res = await fetch('${apiEndpoint}?cb=' + Date.now());
                if (!res.ok) throw new Error("HTTP failure");
                const data = await res.json();
                container.innerHTML = '';
                ${renderFunc}
            } catch(e) {
                container.innerHTML = '<div style="color:#EF4444; padding:1rem; border:1px solid rgba(239,68,68,0.2); border-radius:8px;">Failed to load embed data. Check telemetry or connections.</div>';
            }
        }
        loadEmbedData();
    </script>
</body>
</html>`;

    // embed/latest.html
    const renderLatest = `
        const items = data.latest_clusters || [];
        if (items.length === 0) {
            container.innerHTML = '<div>No active synthesis signals.</div>';
            return;
        }
        items.forEach(c => {
            const date = c.event_window_end ? c.event_window_end.split('T')[0] : 'LIVE';
            container.innerHTML += \`
                <div class="card">
                    <div class="meta">\${date} - \${c.region_tag.toUpperCase()}</div>
                    <div class="title">\${c.topic_label}</div>
                    <div class="summary">\${c.synthesis}</div>
                    <a href="https://sentinel.codexarchai.com/?tab=sentinel" target="_blank">View Analysis &rarr;</a>
                </div>
            \`;
        });
    `;
    fs.writeFileSync(path.join(EMBED_DIR, 'latest.html'), embedBaseHtml("Latest Synthesis", "../api/v1/latest.json", renderLatest));

    // embed/impact.html
    const renderImpact = `
        const items = data.items || [];
        if (items.length === 0) {
            container.innerHTML = '<div>No operational impact alerts.</div>';
            return;
        }
        items.forEach(i => {
            container.innerHTML += \`
                <div class="card">
                    <div class="meta">\${i.region.toUpperCase()} - \${i.domains.join(', ').toUpperCase()}</div>
                    <div class="title">
                        <span class="badge \${i.severity}">\${i.severity}</span>
                        \${i.title}
                    </div>
                    <div class="summary" style="margin-top:0.5rem;">\${i.why_it_matters}</div>
                    <div style="font-size:12px; color:#9DA7B3; margin-bottom:0.5rem;"><strong>Action Hint:</strong> \${i.operator_hint}</div>
                    <a href="https://sentinel.codexarchai.com/?tab=impact" target="_blank">Track Event &rarr;</a>
                </div>
            \`;
        });
    `;
    fs.writeFileSync(path.join(EMBED_DIR, 'impact.html'), embedBaseHtml("Impact Signals", "../api/v1/impact.json", renderImpact));

    // embed/watchlist.html
    const renderWatchlist = `
        const items = data || [];
        if (items.length === 0) {
            container.innerHTML = '<div>No watchlist zones set.</div>';
            return;
        }
        items.forEach(w => {
            container.innerHTML += \`
                <div class="card">
                    <div class="meta">\${w.region_tag.toUpperCase()}</div>
                    <div class="title">
                        <span class="badge \${w.severity}">\${w.severity}</span>
                        \${w.topic}
                    </div>
                    <div class="summary" style="margin-top:0.5rem; font-size:12px;">Active surveillance tags: <em>\${w.keywords.join(', ')}</em></div>
                    <a href="https://sentinel.codexarchai.com/" target="_blank">Sentinel Dashboard &rarr;</a>
                </div>
            \`;
        });
    `;
    fs.writeFileSync(path.join(EMBED_DIR, 'watchlist.html'), embedBaseHtml("Watchlist Focus", "../api/v1/watchlist.json", renderWatchlist));

    console.log("Static public surfaces successfully generated.");
}

// Support running directly
if (process.argv[1] && (process.argv[1].endsWith('GeneratePublicSurfaces.ts') || process.argv[1].endsWith('GeneratePublicSurfaces.js'))) {
    generatePublicSurfaces()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
