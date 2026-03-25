document.addEventListener('DOMContentLoaded', () => {
    // Navigation & Tab Switching
    const btns = document.querySelectorAll('.view-btn[data-target]');
    const panels = document.querySelectorAll('.view-panel');
    const regionSelector = document.getElementById('region-focus');

    // Persistence: Load saved region
    const savedRegion = localStorage.getItem('sentinel_region') || 'global';
    regionSelector.value = savedRegion;

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.getElementById(`view-${target}`).classList.add('active');
            
            if(target === 'live') loadHeadlines();
            if(target === 'archive') loadArchive();
        });
    });

    regionSelector.addEventListener('change', (e) => {
        localStorage.setItem('sentinel_region', e.target.value);
        // Refresh views to apply filter
        loadClusters();
        if (document.getElementById('view-live').classList.contains('active')) loadHeadlines();
    });

    // Initial Load
    loadAlerts();
    loadClusters();
});

// ─── GLOBAL ALERTS (GDACS) ──────────────────────────────────────────────────

async function loadAlerts() {
    const banner = document.getElementById('global-alert-banner');
    try {
        const res = await fetch('data/latest/alerts.json');
        const alerts = await res.json();
        
        if (alerts && alerts.length > 0) {
            // Find highest severity: Red > Orange > Yellow > Green
            const highLevel = alerts.some(a => a.severity === 'Red') ? 'Red' :
                             alerts.some(a => a.severity === 'Orange') ? 'Orange' :
                             alerts.some(a => a.severity === 'Yellow') ? 'Yellow' : 'Green';
            
            banner.textContent = `Threat Level: ${highLevel}`;
            banner.style.background = getThreatColor(highLevel);
            banner.title = alerts[0].title; // Show latest alert title on hover
        }
    } catch(e) {}
}

function getThreatColor(level) {
    const colors = { 'Red': '#ef4444', 'Orange': '#f59e0b', 'Yellow': '#eab308', 'Green': '#10b981' };
    return colors[level] || colors['Green'];
}

// ─── TAB 1: Sentinel Synthesis ───────────────────────────────────────────────

async function loadClusters() {
    const container = document.getElementById('clusters-grid');
    const region = localStorage.getItem('sentinel_region') || 'global';
    
    container.innerHTML = '<div class="loading-pulse">Establishing Intelligence Uplink...</div>';
    try {
        const res = await fetch('data/latest/clusters.json');
        const text = await res.text();
        let clusters;
        try { clusters = JSON.parse(text); } catch(e) {
            throw new Error('Data sync pending or unavailable.');
        }

        // Filtering Logic
        let filtered = clusters;
        if (region === 'uae') {
            // Prioritize clusters containing UAE sources or mentions
            filtered = clusters.filter(c => 
                c.memberArticles.some(a => a.sourceId === 'arabianbusiness' || a.sourceId === 'aljazeera') ||
                c.topic.toLowerCase().includes('dubai') || c.topic.toLowerCase().includes('emirates')
            );
            if (filtered.length === 0) {
                container.innerHTML = '<div class="syn-text">No Middle East specific clusters detected in this cycle. Displaying Global feed.</div>';
                filtered = clusters;
            }
        }
        
        renderClusters(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">${e.message}</div>`;
    }
}

function renderClusters(clusters, container) {
    if(!clusters || clusters.length === 0) {
        container.innerHTML = '<div class="syn-text">No synthesized intel available yet.</div>';
        return;
    }

    container.innerHTML = '';
    clusters.forEach(c => {
        if(!c.comparison) return;
        
        const markup = `
        <div class="cluster-card">
            <div class="card-header">
                <span class="topic-tag">${c.topic}</span>
                <h3>${c.comparison.synthesisSummary}</h3>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Consensus Facts</div>
                <ul class="syn-list">
                    ${c.comparison.sharedFacts.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>

            <div class="syn-section">
                <div class="syn-title">Source Distinctions</div>
                <ul class="syn-list">
                    ${c.comparison.sourceDistinctions.map(d => `<li><span class="source-tag">${d.source}</span> ${d.point}</li>`).join('')}
                </ul>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Analysts</div>
                <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
                   ${c.memberArticles.map(a => `<a class="source-tag" href="${a.url}" target="_blank">${a.sourceId}</a>`).join('')}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

// ─── TAB 2: Live Feed ─────────────────────────────────────────────────────

async function loadHeadlines() {
    const tbody = document.querySelector('#headlines-table tbody');
    const region = localStorage.getItem('sentinel_region') || 'global';
    
    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-pulse">Decrypting global broadcast...</div></td></tr>';
    try {
        const res = await fetch('data/latest/headlines.json');
        const text = await res.text();
        let headlines;
        try { headlines = JSON.parse(text); } catch(e) { throw new Error('Feed corrupted.'); }
        
        // Filtering
        let filtered = headlines;
        if (region === 'uae') {
            filtered = headlines.filter(h => ['arabianbusiness', 'aljazeera'].includes(h.sourceId));
        }

        tbody.innerHTML = '';
        if (!filtered || filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">No records found for ${region} focus.</td></tr>`;
            return;
        }
        
        filtered.slice(0, 100).forEach(h => {
            const time = new Date(h.publishTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted)">${time}</td>
                <td><span class="source-tag">${h.sourceId}</span></td>
                <td><a href="${h.url}" target="_blank">${h.title}</a></td>
            </tr>
            `;
        });
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="3">Uplink Error: ${e.message}</td></tr>`;
    }
}

// ─── TAB 3: Archive Logs ─────────────────────────────────────────────────────

async function loadArchive() {
    const grid = document.getElementById('archive-grid');
    if(grid.dataset.loaded) return;
    grid.innerHTML = '<div class="loading-pulse">Scanning archive sectors...</div>';
    try {
        const res = await fetch('data/archive/manifest.json');
        const text = await res.text();
        let manifest;
        try { manifest = JSON.parse(text); } catch(e) { throw new Error('Manifest missing.'); }
        
        grid.innerHTML = '';
        grid.dataset.loaded = 'true';

        const selector = document.createElement('div');
        selector.id = 'archive-selector';
        selector.style = 'margin-bottom:1.5rem; display:flex; gap:0.5rem; flex-wrap:wrap;';
        manifest.forEach((entry, idx) => {
            const btn = document.createElement('button');
            btn.className = 'view-btn' + (idx === 0 ? ' active' : '');
            btn.textContent = entry.date;
            btn.style = 'font-size:0.75rem; padding:0.3rem 0.75rem;';
            btn.onclick = async () => {
                document.querySelectorAll('#archive-selector .view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const r = entry.runs[0];
                const sr = await fetch(`data/archive/${entry.date}/${r}`);
                const st = await sr.text();
                try { renderSnapshot(JSON.parse(st), entry.date, entry.runs, grid); } catch(ex) {}
            };
            selector.appendChild(btn);
        });
        grid.appendChild(selector);

        const latest = manifest[0];
        const latestRun = latest.runs[0];
        const snapRes = await fetch(`data/archive/${latest.date}/${latestRun}`);
        const snapText = await snapRes.text();
        renderSnapshot(JSON.parse(snapText), latest.date, latest.runs, grid);
    } catch(e) {
        grid.innerHTML = `<div class="syn-text">Archive unavailable: ${e.message}</div>`;
    }
}

function renderSnapshot(snapshot, date, runs, grid) {
    const existing = grid.querySelector('.snap-section');
    if(existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'snap-section';
    const ts = new Date(snapshot.timestamp).toLocaleString();
    const clusterCount = (snapshot.clusters || []).length;
    const headlineCount = (snapshot.headlines || []).length;

    wrap.innerHTML = `
        <div class="cluster-card" style="margin-bottom:1rem; border-left: 4px solid var(--accent-indigo);">
            <div class="card-header">
                <span class="topic-tag">${date}</span>
                <h3>Intelligence Snapshot: ${ts}</h3>
            </div>
            <div class="syn-section">
                <ul class="syn-list">
                    <li>Ingested: ${headlineCount} sources</li>
                    <li>Synthesized: ${clusterCount} clusters</li>
                </ul>
            </div>
        </div>
    `;
    grid.appendChild(wrap);
}
