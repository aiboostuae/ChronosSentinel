<<<<<<< HEAD
// CHRONOS SENTINEL | V1.0 Dashboard
// Strictly compliant with 09-design-system.md (Stage 1)
=======
document.addEventListener('DOMContentLoaded', () => {
    // Navigation & Tab Switching
    const btns = document.querySelectorAll('.view-btn[data-target]');
    const panels = document.querySelectorAll('.view-panel');
    const regionSelector = document.getElementById('region-focus');

    // Persistence: Load saved region
    const savedRegion = localStorage.getItem('sentinel_region') || 'global';
    regionSelector.value = savedRegion;
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Initial Load
    switchTab('sentinel');
    loadSentinel();
    
    // 2. Navigation
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            switchTab(target);
            
            if (target === 'sentinel') loadSentinel();
            if (target === 'live') loadHeadlines();
            if (target === 'impact') loadImpact();
            if (target === 'archive') loadArchive();
        });
    });

<<<<<<< HEAD
    // 3. Region Selector
    const regionSelect = document.getElementById('region-focus');
    if (regionSelect) {
        regionSelect.value = localStorage.getItem('sentinel_region') || 'global';
        regionSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            localStorage.setItem('sentinel_region', val);
            
            // Holistic reload on region change
            loadSentinel();
            loadHeadlines();
            loadImpact();
            loadArchive();

            // Update Header labels (Spec 08 Label Binding)
            const sentinelTitle = document.getElementById('sentinel-title');
            const liveTitle = document.getElementById('live-title');
            const impactTitle = document.getElementById('impact-title');
            
            const regionLabel = val === 'global' ? 'Global' : val.charAt(0).toUpperCase() + val.slice(1).replace('-', ' ');
            if (sentinelTitle) sentinelTitle.textContent = `${regionLabel} Sentinel Synthesis`;
            if (liveTitle) liveTitle.textContent = `Raw ${regionLabel} Headlines`;
            if (impactTitle) impactTitle.textContent = `${regionLabel} High-Impact Intelligence`;
        });
    }
}
=======
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
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)

function switchTab(target) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    
    const panel = document.getElementById('view-' + target);
    const btn = document.querySelector(`[data-target="${target}"]`);
    
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');

    // Always reload current tab data to ensure sync with activeRegion
    if (target === 'sentinel') loadSentinel();
    if (target === 'live') loadHeadlines();
    if (target === 'impact') loadImpact();
    if (target === 'archive') loadArchive();
}

// ─── TAB 1: Sentinel Synthesis ──────────────────────────────────────────────

async function loadSentinel() {
    const container = document.getElementById('clusters-grid');
<<<<<<< HEAD
    if (!container) return;
    container.innerHTML = '<div class="loading-pulse">Establishing Uplink...</div>';
    
=======
    const region = localStorage.getItem('sentinel_region') || 'global';
    
    container.innerHTML = '<div class="loading-pulse">Establishing Intelligence Uplink...</div>';
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
    try {
        const res = await fetch('data/latest/clusters.json?cb=' + Date.now());
        const clusters = await res.json();
        
        const activeRegion = localStorage.getItem('sentinel_region') || 'global';
        const filtered = clusters.filter(c => {
            if (activeRegion === 'global') return true;
            return c.region_tag === activeRegion;
        });

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = '<div class="syn-text">No synthesized signals detected in this sector.</div>';
            return;
        }

<<<<<<< HEAD
=======
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
        
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
        renderClusters(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">Telemetry Error: ${e.message}</div>`;
    }
}

function renderClusters(clusters, container) {
<<<<<<< HEAD
=======
    if(!clusters || clusters.length === 0) {
        container.innerHTML = '<div class="syn-text">No synthesized intel available yet.</div>';
        return;
    }

    container.innerHTML = '';
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
    clusters.forEach(c => {
        // Compatibility Layer for legacy archive data
        const topic = c.topic_label || c.canonicalLabel || 'Intelligence Update';
        const syn = c.synthesis || c.summary || 'Detailed synthesis pending...';
        const facts = c.shared_facts || (c.facts ? (Array.isArray(c.facts) ? c.facts : [c.facts]) : []);
        const diffs = c.source_differences || (c.differences ? (Array.isArray(c.differences) ? c.differences : [c.differences]) : []);
        
        const severity = (c.qualification_score && c.qualification_score >= 8) ? 'High' : 
                         (c.qualification_score && c.qualification_score >= 5) ? 'Medium' : 
                         (c.severity || 'Low');
        
        const displayTime = formatDateTime(c.event_window_end || c.created_at || c.timestamp);
        const sources = c.sources || [];
        
        const sevClass = severity.toLowerCase();
        
        let detailHtml = `
            <div class="syn-section">
                <div class="syn-title">Shared Facts</div>
                <ul class="syn-list">
                    ${facts.length > 0 ? facts.map(f => `<li>${f}</li>`).join('') : '<li>Telemetry pending...</li>'}
                </ul>
            </div>
            <div class="syn-section">
                <div class="syn-title">Source Differences</div>
                <ul class="syn-list">
                    ${diffs.length > 0 ? diffs.map(d => `<li>${d}</li>`).join('') : '<li>Comparative analysis pending...</li>'}
                </ul>
            </div>
            <div class="syn-section">
                <div class="syn-title">Synthesis</div>
                <div class="syn-text">${syn}</div>
            </div>
            <div class="syn-section">
                <div class="syn-title">Confidence</div>
                <div class="syn-text" style="font-style: italic; color: var(--text-muted); font-size:0.85rem;">${c.confidence || 'Unconfirmed'}</div>
            </div>`;

        const markup = `
        <div class="cluster-card">
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <span class="topic-tag ${sevClass}">${severity.toUpperCase()}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${displayTime}</span>
                </div>
                <h3>${topic}</h3>
            </div>
            
<<<<<<< HEAD
            ${detailHtml}

            <div class="syn-section">
                <div class="syn-title">Sources</div>
=======
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
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
                <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
                   ${sources.map(s => `<a class="source-tag" href="${s.url}" target="_blank">${(s.source || s.id || 'src').toUpperCase()}</a>`).join('')}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

<<<<<<< HEAD
// ─── TAB 2: Live Feed ────────────────────────────────────────────────────────

async function loadHeadlines() {
    const tbody = document.querySelector('#headlines-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="loading-pulse">Ingesting raw telemetry...</td></tr>';
    
    try {
        const res = await fetch('data/latest/headlines.json?cb=' + Date.now());
        const headlines = await res.json();
        
        const activeRegion = localStorage.getItem('sentinel_region') || 'global';
        const filtered = headlines.filter(h => {
            if (!h) return false;
            if (activeRegion === 'global') return true;
            // Match exactly or check if region_tag includes the string
            const tag = (h.region_tag || 'global').toLowerCase();
            return tag === activeRegion.toLowerCase();
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="syn-text" style="padding:2rem;">No tactical headlines detected for ${activeRegion.toUpperCase()} region.</td></tr>`;
            return;
        }

        filtered.slice(0, 50).forEach(h => {
            if (!h) return;
            const time = formatDateTime(h.published_at || h.publishTime || h.timestamp);
            const sourceLabel = (h.source_id || h.sourceId || 'src').toString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-muted); font-size:0.8rem;">${time}</td>
                <td><span class="source-tag">${sourceLabel.toUpperCase()}</span></td>
                <td><a href="${h.url || '#'}" target="_blank">${h.title || 'Untitled Report'}</a></td>
=======
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
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
            `;
            tbody.appendChild(tr);
        });
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="3">Uplink Error: ${e.message}</td></tr>`;
    }
}

// ─── TAB 3: High-Impact Intelligence ─────────────────────────────────────────

<<<<<<< HEAD
async function loadImpact() {
    const container = document.getElementById('impact-grid');
    if (!container) return;
    container.innerHTML = '<div class="loading-pulse">Scanning for High-Severity signals...</div>';
    
    try {
        const res = await fetch('data/latest/clusters.json?cb=' + Date.now());
        const clusters = await res.json();
        
        const filtered = clusters.filter(c => {
            return (c.qualification_score && c.qualification_score >= 8); 
        });

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = '<div class="syn-text">No high-severity escalations detected.</div>';
            return;
        }

        renderClusters(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">Impact Scan Failed: ${e.message}</div>`;
    }
}

// ─── TAB 4: Archive Logs ─────────────────────────────────────────────────────

// ─── TAB 4: Archive Logs (Spec 10 Calendar) ──────────────────────────────────

let currentCalDate = new Date(); 

async function loadArchive() {
    const grid = document.getElementById('archive-calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-pulse">Establishing Archive Link...</div>';
    
    try {
        const res = await fetch('data/archive/manifest.json?cb=' + Date.now());
        const manifest = await res.json();
        
        renderCalendar(manifest);
        
        document.getElementById('cal-prev').onclick = () => {
            currentCalDate.setMonth(currentCalDate.getMonth() - 1);
            renderCalendar(manifest);
        };
        document.getElementById('cal-next').onclick = () => {
            currentCalDate.setMonth(currentCalDate.getMonth() + 1);
            renderCalendar(manifest);
        };

=======
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
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
    } catch(e) {
        grid.innerHTML = `<div class="syn-text">Archive unavailable: ${e.message}</div>`;
    }
}

function renderCalendar(manifest) {
    const grid = document.getElementById('archive-calendar-grid');
    const label = document.getElementById('cal-current-label');
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    label.textContent = `${months[month]} ${year}`;
    
    grid.innerHTML = '';
    
    // Header for week days
    ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach(d => {
        const h = document.createElement('div');
        h.style = 'text-align:center; font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:0.5rem;';
        h.textContent = d;
        grid.appendChild(h);
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = firstDay.getDay() - 1; 
    if (startOffset < 0) startOffset = 6; 
    
    for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const entry = manifest.find(m => m.date === dateKey);
        
        cell.innerHTML = `<span class="day-num">${d}</span>`;
        
        if (entry) {
            const runCount = entry.runs.length;
            const indicators = document.createElement('div');
            indicators.className = 'activity-indicators';
            
            let bars = 0;
            let colorClass = 'bar-low';
            if (runCount >= 6) { bars = 3; colorClass = 'bar-high'; }
            else if (runCount >= 3) { bars = 2; colorClass = 'bar-mid'; }
            else if (runCount >= 1) { bars = 1; colorClass = 'bar-low'; }
            
            for (let i = 0; i < bars; i++) {
                const bar = document.createElement('div');
                bar.className = `activity-bar ${colorClass}`;
                indicators.appendChild(bar);
            }
            cell.appendChild(indicators);
            
            cell.onclick = () => {
                document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                renderDayDetail(entry);
            };
        } else {
            cell.style.opacity = '0.3';
        }
        grid.appendChild(cell);
    }
}

function renderDayDetail(entry) {
    const list = document.getElementById('runs-list');
    const label = document.getElementById('selected-date-label');
    const container = document.getElementById('archive-grid');
    
    label.textContent = `Sectors Log: ${entry.date}`;
    list.innerHTML = '';
    container.innerHTML = '';
    
    entry.runs.forEach(runFile => {
        const runTime = runFile.replace('run-', '').replace('.json', '');
        const formattedTime = runTime.substring(0,2) + ":" + runTime.substring(2,4) + " UTC";
        
        const item = document.createElement('div');
        item.className = 'run-item';
        item.innerHTML = `
            <span class="run-time">${formattedTime}</span>
            <span class="run-stats">Run ID: ${runFile.split('.')[0]}</span>
        `;
        
        item.onclick = async () => {
            container.innerHTML = '<div class="loading-pulse">Retrieving Run Telemetry...</div>';
            try {
                const res = await fetch(`data/archive/${entry.date}/${runFile}?cb=${Date.now()}`);
                const data = await res.json();
                renderSnapshot(data, entry.date, container);
            } catch(e) {
                container.innerHTML = `<div class="syn-text">Fetch Fail: ${e.message}</div>`;
            }
        };
        list.appendChild(item);
    });
}

function renderSnapshot(snapshot, date, grid) {
    const existing = grid.querySelector('.snap-section');
    if(existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'snap-section';
<<<<<<< HEAD
    
    const activeRegion = localStorage.getItem('sentinel_region') || 'global';
    
    const meta = document.createElement('div');
    meta.className = 'cluster-card';
    meta.style = 'margin-bottom:2rem; border-left: 4px solid var(--accent-blue);';
    meta.innerHTML = `
        <div class="card-header">
            <span class="topic-tag">${date}</span>
            <h3>Intelligence Archive</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">
                Historical snapshot containing ${snapshot.headlines ? snapshot.headlines.length : 0} records.
            </p>
=======
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
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
        </div>
    `;
    wrap.appendChild(meta);

    const filteredClusters = (snapshot.clusters || []).filter(c => {
        if (activeRegion === 'global') return true;
        return c.region_tag === activeRegion;
    });

    if (filteredClusters.length > 0) {
        const clusterGrid = document.createElement('div');
        clusterGrid.className = 'cards-grid';
        clusterGrid.style = 'margin-bottom: 3rem;';
        renderClusters(filteredClusters, clusterGrid);
        wrap.appendChild(clusterGrid);
    }
    
    grid.appendChild(wrap);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatDateTime(isoString) {
    if (!isoString) return 'LIVE';
    try {
        const dt = new Date(isoString);
        if (isNaN(dt.getTime())) return 'LIVE';
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${hh}:${mm}`;
    } catch(e) {
        return 'LIVE';
    }
}
