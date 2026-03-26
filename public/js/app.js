document.addEventListener('DOMContentLoaded', () => {
    // Navigation & Tab Switching
    const btns = document.querySelectorAll('.view-btn[data-target]');
    const panels = document.querySelectorAll('.view-panel');
    const regionSelector = document.getElementById('region-focus');

    // Persistence: Load saved region
    const savedRegion = localStorage.getItem('sentinel_region') || 'global';
    if (regionSelector) {
        regionSelector.value = savedRegion;
        regionSelector.addEventListener('change', (e) => {
            localStorage.setItem('sentinel_region', e.target.value);
            refreshActiveView();
        });
    }

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            const targetPanel = document.getElementById(`view-${target}`);
            if (targetPanel) targetPanel.classList.add('active');
            
            if(target === 'sentinel') loadClusters();
            if(target === 'live') loadHeadlines();
            if(target === 'impact') loadImpact();
            if(target === 'archive') loadArchive();
        });
    });

    function refreshActiveView() {
        const activeBtn = document.querySelector('.view-btn.active');
        if (!activeBtn) return;
        const target = activeBtn.dataset.target;
        if (target === 'sentinel') loadClusters();
        if (target === 'live') loadHeadlines();
        if (target === 'impact') loadImpact();
    }

    // Initial Load
    loadAlerts();
    loadClusters();
});

// ─── GLOBAL ALERTS (GDACS) ──────────────────────────────────────────────────

async function loadAlerts() {
    const banner = document.getElementById('global-alert-banner');
    if (!banner) return;
    try {
        const res = await fetch('data/latest/alerts.json');
        const alerts = await res.json();
        
        if (alerts && alerts.length > 0) {
            const highLevel = alerts.some(a => a.severity === 'Red') ? 'Red' :
                             alerts.some(a => a.severity === 'Orange') ? 'Orange' :
                             alerts.some(a => a.severity === 'Yellow') ? 'Yellow' : 'Green';
            
            banner.textContent = `Threat Level: ${highLevel}`;
            banner.style.color = '#fff';
            banner.style.background = getThreatColor(highLevel);
            banner.title = alerts[0].title;
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
    if (!container) return;
    const region = localStorage.getItem('sentinel_region') || 'global';
    
    container.innerHTML = '<div class="loading-pulse">Establishing Intelligence Uplink...</div>';
    try {
        const res = await fetch('data/latest/clusters.json');
        const text = await res.text();
        let clusters;
        try { clusters = JSON.parse(text); } catch(e) {
            throw new Error('Intelligence synchronization pending.');
        }

        // Filtering Logic
        let filtered = clusters;
        if (region === 'uae') {
            filtered = clusters.filter(c => {
                const sources = c.sources || c.memberArticles || [];
                const label = (c.canonicalLabel || c.topic || '').toLowerCase();
                return sources.some(s => (s.id || s.sourceId) === 'aljazeera' || (s.id || s.sourceId) === 'arabianbusiness' || (s.id || s.sourceId) === 'fox') ||
                       label.includes('dubai') || label.includes('emirates') || label.includes('middle east') || label.includes('iran');
            });
            
            if (filtered.length === 0) {
                container.innerHTML = '<div class="syn-text" style="color:var(--accent-cyan); background:rgba(0,242,255,0.05); padding:1rem; border-radius:8px; margin-bottom:1.5rem;">No Middle East specific clusters detected. Displaying Global feed.</div>';
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
        const title = c.canonicalLabel || c.topic || 'Intelligence Report';
        const summary = c.summary || (c.comparison ? c.comparison.synthesisSummary : 'Summary unavailable.');
        const severity = c.severity || 'Low';
        const timestamp = c.timestamp || new Date().toISOString();
        const sources = c.sources || c.memberArticles || [];
        
        let displayTime = 'LIVE';
        try {
            const dt = new Date(timestamp);
            if (!isNaN(dt.getTime())) {
                displayTime = dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } catch(e) {}

        const sevClass = (severity === 'High' || severity === 'Red') ? 'impact-card' : '';
        const sevBadge = (severity === 'High' || severity === 'Red') ? '<span class="impact-badge">URGENT</span>' : '';

        // Legacy detail support
        let detailHtml = '';
        if (c.comparison) {
            detailHtml = `
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
            </div>`;
        }

        const markup = `
        <div class="cluster-card ${sevClass}">
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
                    <span class="topic-tag">${sevBadge}${title}</span>
                    <span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700; letter-spacing:0.05em;">${displayTime}</span>
                </div>
                <h3>${summary}</h3>
            </div>
            
            ${detailHtml}

            <div class="syn-section">
                <div class="syn-title">Analysts</div>
                <div style="display:flex; gap: 0.3rem; flex-wrap: wrap;">
                   ${sources.map(s => `<a class="source-tag" href="${s.url}" target="_blank">${s.id || s.sourceId || 'source'}</a>`).join('')}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

// ─── TAB 3: High-Impact Intelligence ─────────────────────────────────────────

async function loadImpact() {
    const container = document.getElementById('impact-grid');
    if (!container) return;
    container.innerHTML = '<div class="loading-pulse">Scanning for High-Severity signals...</div>';
    
    try {
        const res = await fetch('data/latest/clusters.json');
        const clusters = await res.json();
        
        const filtered = clusters.filter(c => c.severity === 'High' || c.severity === 'Medium' || c.severity === 'Red' || c.severity === 'Orange');
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="syn-text">No critical or high-impact reports currently active.</div>';
            return;
        }
        
        renderClusters(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">Impact Scan Failed: ${e.message}</div>`;
    }
}

// ─── TAB 2: Live Feed ─────────────────────────────────────────────────────

async function loadHeadlines() {
    const tbody = document.querySelector('#headlines-table tbody');
    if (!tbody) return;
    const region = localStorage.getItem('sentinel_region') || 'global';
    
    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-pulse">Decrypting global broadcast...</div></td></tr>';
    try {
        const res = await fetch('data/latest/headlines.json');
        const text = await res.text();
        let headlines;
        try { headlines = JSON.parse(text); } catch(e) { throw new Error('Feed corrupted.'); }
        
        let filtered = headlines;
        let notice = '';
        if (region === 'uae') {
            filtered = headlines.filter(h => ['arabianbusiness', 'aljazeera', 'fox', 'jerusalempost', 'timesofisrael'].includes(h.sourceId));
            if (filtered.length === 0) {
                notice = '<tr><td colspan="3" style="text-align:center; color:var(--accent-cyan); font-size:0.8rem; padding:1rem; background:rgba(0,242,255,0.05)">No Middle East headlines in current cycle. Falling back to global signals.</td></tr>';
                filtered = headlines;
            }
        }

        tbody.innerHTML = notice;
        if (!filtered || filtered.length === 0) {
            tbody.innerHTML += `<tr><td colspan="3">No records found.</td></tr>`;
            return;
        }
        
        filtered.slice(0, 50).forEach(h => {
            const time = h.publishTime ? new Date(h.publishTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'LIVE';
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

// ─── TAB 4: Archive Logs ─────────────────────────────────────────────────────

async function loadArchive() {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-pulse">Scanning archive sectors...</div>';
    try {
        const res = await fetch('data/archive/manifest.json');
        const text = await res.text();
        let manifest;
        try { manifest = JSON.parse(text); } catch(e) { throw new Error('Manifest missing.'); }
        
        grid.innerHTML = '';

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
                const latestRun = entry.runs[0];
                const sr = await fetch(`data/archive/${entry.date}/${latestRun}`);
                const snapshot = await sr.json();
                renderSnapshot(snapshot, entry.date, grid);
            };
            selector.appendChild(btn);
        });
        grid.appendChild(selector);

        const latest = manifest[0];
        if (latest && latest.runs.length > 0) {
            const latestRun = latest.runs[0];
            const snapRes = await fetch(`data/archive/${latest.date}/${latestRun}`);
            const snapshot = await snapRes.json();
            renderSnapshot(snapshot, latest.date, grid);
        } else {
            grid.innerHTML += '<div class="syn-text">No archive snapshots found.</div>';
        }
    } catch(e) {
        grid.innerHTML = `<div class="syn-text">Archive unavailable: ${e.message}</div>`;
    }
}

function renderSnapshot(snapshot, date, grid) {
    const existing = grid.querySelector('.snap-section');
    if(existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'snap-section';
    
    const meta = document.createElement('div');
    meta.className = 'cluster-card';
    meta.style = 'margin-bottom:2rem; border-left: 4px solid var(--accent-cyan);';
    meta.innerHTML = `
        <div class="card-header">
            <span class="topic-tag">${date}</span>
            <h3>Deep Intelligence Archive</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">
                Historical snapshot containing ${snapshot.headlines ? snapshot.headlines.length : 0} articles.
            </p>
        </div>
    `;
    wrap.appendChild(meta);

    // Render Clusters if present
    if (snapshot.clusters && snapshot.clusters.length > 0) {
        const h3 = document.createElement('h4');
        h3.className = 'syn-title';
        h3.textContent = 'Synthesized Intelligence';
        h3.style = 'margin-bottom:1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;';
        wrap.appendChild(h3);

        const clusterGrid = document.createElement('div');
        clusterGrid.className = 'cards-grid';
        clusterGrid.style = 'margin-bottom: 3rem;';
        renderClusters(snapshot.clusters, clusterGrid);
        wrap.appendChild(clusterGrid);
    }

    // Render Headlines always
    if (snapshot.headlines && snapshot.headlines.length > 0) {
        const h3 = document.createElement('h4');
        h3.className = 'syn-title';
        h3.textContent = 'Historical Global Headlines';
        h3.style = 'margin: 2rem 0 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;';
        wrap.appendChild(h3);

        const tableWrap = document.createElement('div');
        tableWrap.className = 'table-container';
        tableWrap.innerHTML = `
            <table style="width:100%">
                <thead>
                    <tr><th>Time</th><th>Source</th><th>Headline</th></tr>
                </thead>
                <tbody>
                    ${snapshot.headlines.slice(0, 100).map(h => {
                        const time = h.publishTime ? new Date(h.publishTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'LIVE';
                        return `<tr><td>${time}</td><td><span class="source-tag">${h.sourceId}</span></td><td><a href="${h.url}" target="_blank">${h.title}</a></td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
        wrap.appendChild(tableWrap);
    }
    
    grid.appendChild(wrap);
}
