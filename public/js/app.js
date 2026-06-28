// CHRONOS SENTINEL | V1.2 Production Dashboard
// Spec 02, 09, 10 Compliant

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Initial State
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
            loadWatchlist();

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

    // 2. Navigation
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            if (target) switchTab(target);
        });
    });

    // Mobile "More" Dropdown Setup
    const moreBtn = document.getElementById('more-btn');
    const moreMenu = document.getElementById('more-menu');
    if (moreBtn && moreMenu) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = moreMenu.classList.toggle('hidden');
            moreBtn.setAttribute('aria-expanded', String(!isHidden));
        });
        document.addEventListener('click', () => {
            moreMenu.classList.add('hidden');
            moreBtn.setAttribute('aria-expanded', 'false');
        });
    }

    document.querySelectorAll('.more-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            const action = e.target.getAttribute('data-action');
            if (target) {
                switchTab(target);
            }
            if (action === 'status') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (moreMenu) moreMenu.classList.add('hidden');
            const moreBtn = document.getElementById('more-btn');
            if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
        });
    });

    // 3. Kickoff
    switchTab('sentinel');
    updateSystemStatusBanner();
}

async function updateSystemStatusBanner() {
    const banner = document.getElementById('ai-model-banner');
    if (!banner) return;
    try {
        const res = await fetch('api/v1/status.json?cb=' + Date.now());
        if (res.ok) {
            const status = await res.json();
            const systemStatus = (status.system_status || 'unknown').toString();
            const engine = status.fallback_used ? 'Deterministic fallback' : (status.engine || 'AI-assisted').toString();
            banner.textContent = `${formatPublicStatus(engine)} - ${formatPublicStatus(systemStatus)}`;
            if (status.fallback_used || systemStatus.toLowerCase() !== 'healthy') {
                banner.style.color = 'var(--threat-yellow)';
                banner.style.background = 'rgba(245, 158, 11, 0.1)';
                banner.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            } else {
                banner.style.color = 'var(--accent-indigo)';
                banner.style.background = 'rgba(99, 102, 241, 0.1)';
                banner.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            }
        }
    } catch(e) {
        banner.textContent = 'AI-assisted - Status Pending';
    }
}

function formatPublicStatus(value) {
    return String(value || 'unknown')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function switchTab(target) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.more-menu-item').forEach(b => b.classList.remove('active'));
    
    const panel = document.getElementById('view-' + target);
    let btn = document.querySelector(`.view-btn[data-target="${target}"]`);
    let moreItem = document.querySelector(`.more-menu-item[data-target="${target}"]`);
    
    if (panel) panel.classList.add('active');
    
    if (moreItem) {
        moreItem.classList.add('active');
        const moreBtn = document.getElementById('more-btn');
        if (moreBtn) moreBtn.classList.add('active');
    } else if (btn) {
        btn.classList.add('active');
        const moreBtn = document.getElementById('more-btn');
        if (moreBtn) moreBtn.classList.remove('active');
    }

    // Always reload current tab data to ensure sync with activeRegion
    if (target === 'sentinel') loadSentinel();
    if (target === 'live') loadHeadlines();
    if (target === 'impact') loadImpact();
    if (target === 'archive') loadArchive();
    if (target === 'watchlist') loadWatchlist();
}

// ─── TAB 1: Sentinel Synthesis ──────────────────────────────────────────────

async function loadSentinel() {
    const container = document.getElementById('clusters-grid');
    if (!container) return;
    container.innerHTML = '<div class="loading-pulse">Establishing Uplink...</div>';
    
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
            container.innerHTML = '<div class="syn-text" style="padding:2rem; text-align:center;">No synthesized signals detected in this sector.</div>';
            return;
        }
        renderClusters(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">Telemetry Error: ${e.message}</div>`;
    }
}

function renderClusters(clusters, container) {
    container.innerHTML = '';
    clusters.forEach(c => {
        const topic = c.topic_label || c.canonicalLabel || 'Intelligence Update';
        const syn = c.synthesis || c.summary || 'Detailed synthesis pending...';
        const facts = c.shared_facts || (c.facts ? (Array.isArray(c.facts) ? c.facts : [c.facts]) : []);
        const diffs = c.source_differences || (c.differences ? (Array.isArray(c.differences) ? c.differences : [c.differences]) : []);
        const severity = (c.qualification_score && c.qualification_score >= 8) ? 'High' : 
                         (c.qualification_score && c.qualification_score >= 5) ? 'Medium' : 'Low';
        const displayTime = formatDateTime(c.event_window_end || c.created_at || c.timestamp);
        const sources = c.sources || [];
        const sevClass = severity.toLowerCase();
        
        const markup = `
        <div class="cluster-card">
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <span class="topic-tag ${sevClass}">${severity.toUpperCase()}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${displayTime}</span>
                </div>
                <h3>${topic}</h3>
            </div>
            
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
                <div class="syn-text" style="line-height:1.6;">${syn}</div>
            </div>
            <div class="syn-section">
                <div class="syn-title">Confidence</div>
                <div class="syn-text" style="font-style: italic; color: var(--text-secondary); font-size:0.85rem;">${c.confidence || 'Unconfirmed'}</div>
            </div>

            <div class="syn-section">
                <div class="syn-title">Sources</div>
                <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
                   ${sources.map(s => `<a class="source-tag" href="${s.url}" target="_blank">${(s.source || s.id || 'src').toUpperCase()}</a>`).join('')}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

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
            const tag = (h.region_tag || 'global').toLowerCase();
            return tag === activeRegion.toLowerCase();
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="syn-text" style="padding:2rem; text-align:center;">No tactical headlines detected for ${activeRegion.toUpperCase()} region.</td></tr>`;
            return;
        }

        filtered.slice(0, 50).forEach(h => {
            const time = formatDateTime(h.published_at || h.publishTime || h.timestamp);
            const sourceLabel = (h.source_id || h.sourceId || 'src').toString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-secondary); font-size:0.8rem;">${time}</td>
                <td><span class="source-tag">${sourceLabel.toUpperCase()}</span></td>
                <td><a href="${h.url || '#'}" target="_blank">${h.title || 'Untitled Report'}</a></td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="3">Uplink Error: ${e.message}</td></tr>`;
    }
}

// ─── TAB 3: High-Impact Intelligence ─────────────────────────────────────────

async function loadImpact() {
    const container = document.getElementById('impact-grid');
    if (!container) return;
    container.innerHTML = '<div class="loading-pulse">Scanning for High-Severity signals...</div>';
    
    try {
        const res = await fetch('data/latest/impact.json?cb=' + Date.now());
        if (!res.ok) {
            container.innerHTML = '<div class="syn-text" style="padding:2rem; text-align:center; color:var(--threat-red);">Impact data unavailable. Check generated data.</div>';
            return;
        }
        const data = await res.json();
        const items = data.items || [];
        
        const activeRegion = localStorage.getItem('sentinel_region') || 'global';
        const filtered = items.filter(i => {
            if (activeRegion === 'global') return true;
            return (i.region || '').toLowerCase() === activeRegion.toLowerCase() || (i.region || '').toLowerCase() === activeRegion.replace('-', ' ').toLowerCase();
        });

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = '<div class="syn-text" style="padding:2rem; text-align:center;">No impact events generated from the latest data.</div>';
            return;
        }

        renderImpactEvents(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text" style="color:var(--threat-red);">Impact data unavailable. Check generated data. Error: ${e.message}</div>`;
    }
}

function renderImpactEvents(items, container) {
    container.innerHTML = '';
    items.forEach(i => {
        const severityClass = i.severity ? i.severity.toLowerCase() : 'low';
        const domainsList = (i.domains || []).map(d => `<span class="source-tag" style="margin-right:0.25rem;">${d.toUpperCase()}</span>`).join('');
        
        const markup = `
        <div class="cluster-card">
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <span class="topic-tag ${severityClass}">${i.severity.toUpperCase()}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${i.region.toUpperCase()}</span>
                </div>
                <h3>${i.title}</h3>
                <div style="margin-top:0.5rem; display:flex; flex-wrap:wrap; gap:0.25rem;">
                    ${domainsList}
                </div>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Why It Matters</div>
                <div class="syn-text" style="line-height:1.6;">${i.why_it_matters}</div>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Evidence Summary</div>
                <div class="syn-text" style="font-size:0.9rem;">${i.evidence_summary}</div>
            </div>

            <div class="syn-section">
                <div class="syn-title">Confidence & Corroboration</div>
                <div class="syn-text" style="font-size:0.85rem; font-style:italic;">
                    Confidence: ${i.confidence_label.toUpperCase()} | Corroboration: ${i.corroboration_level.toUpperCase()}
                </div>
            </div>

            <div class="syn-section">
                <div class="syn-title">Operator Hint</div>
                <div class="syn-text" style="font-size:0.85rem; color:var(--accent-cyan); font-weight:600;">
                    ${i.operator_hint}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

// ─── TAB 5: Watchlist Focus Zones ──────────────────────────────────────────

async function loadWatchlist() {
    const container = document.getElementById('watchlist-grid');
    if (!container) return;
    container.innerHTML = '<div class="loading-pulse">Retrieving Focus Zones...</div>';
    
    try {
        const res = await fetch('data/latest/watchlist.json?cb=' + Date.now());
        if (!res.ok) {
            container.innerHTML = '<div class="syn-text" style="padding:2rem; text-align:center;">Watchlist data unavailable. Check generated data.</div>';
            return;
        }
        const watchlist = await res.json();
        
        const activeRegion = localStorage.getItem('sentinel_region') || 'global';
        const filtered = watchlist.filter(w => {
            if (activeRegion === 'global') return true;
            return (w.region_tag || 'global').toLowerCase() === activeRegion.toLowerCase();
        });

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = '<div class="syn-text" style="padding:2rem; text-align:center;">No watchlist targets set for this region.</div>';
            return;
        }

        renderWatchlist(filtered, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text" style="color:var(--threat-red);">Watchlist Scan Failed: ${e.message}</div>`;
    }
}

function renderWatchlist(items, container) {
    container.innerHTML = '';
    items.forEach(w => {
        const severityClass = w.severity ? w.severity.toLowerCase() : 'low';
        const keywordTags = (w.keywords || []).map(k => `<span class="source-tag" style="margin-right:0.25rem; font-size:0.7rem;">${k.toUpperCase()}</span>`).join('');
        
        const markup = `
        <div class="cluster-card" style="border-left: 4px solid var(--accent-indigo);">
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <span class="topic-tag ${severityClass}">${w.severity.toUpperCase()}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${(w.region_tag || 'global').toUpperCase()}</span>
                </div>
                <h3>${w.topic}</h3>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Active Watchlist Keywords</div>
                <div style="margin-top:0.5rem; display:flex; flex-wrap:wrap; gap:0.25rem;">
                    ${keywordTags}
                </div>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Target Status</div>
                <div class="syn-text" style="font-size:0.85rem; font-weight:600; color:var(--threat-green);">
                    MONITORING: ACTIVE
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

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
    
    // Day Names
    ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach(d => {
        const h = document.createElement('div');
        h.style = 'text-align:center; font-size:0.7rem; color:var(--text-secondary); font-weight:bold; margin-bottom:0.5rem;';
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
            const indicators = document.createElement('div');
            indicators.className = 'activity-indicators';
            const runCount = entry.runs.length;
            let bars = runCount >= 6 ? 3 : (runCount >= 3 ? 2 : 1);
            let color = runCount >= 6 ? 'bar-high' : (runCount >= 3 ? 'bar-mid' : 'bar-low');
            for (let i = 0; i < bars; i++) {
                const b = document.createElement('div'); b.className = `activity-bar ${color}`;
                indicators.appendChild(b);
            }
            cell.appendChild(indicators);
            cell.onclick = () => {
                document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                renderDayDetail(entry);
            };
        } else {
            cell.style.opacity = '0.3';
            cell.style.cursor = 'default';
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
        item.innerHTML = `<span class="run-time">${formattedTime}</span><span class="run-stats">Run ID: ${runFile.split('.')[0]}</span>`;
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

function renderSnapshot(snapshot, date, container) {
    container.innerHTML = '';
    const activeRegion = localStorage.getItem('sentinel_region') || 'global';
    
    // Header for the snapshot
    const meta = document.createElement('div');
    meta.className = 'cluster-card';
    meta.style = 'margin-bottom:2rem; border-left: 4px solid var(--accent-blue); width:100%;';
    meta.innerHTML = `<div class="card-header"><span class="topic-tag">${date}</span><h3>Intelligence Log Snapshot</h3></div>`;
    container.appendChild(meta);

    const filtered = (snapshot.clusters || []).filter(c => {
        if (activeRegion === 'global') return true;
        return c.region_tag === activeRegion;
    });

    if (filtered.length > 0) {
        renderClusters(filtered, container);
    } else {
        container.innerHTML += `<div class="syn-text" style="padding:2rem;">No entries for ${activeRegion.toUpperCase()} in this snapshot.</div>`;
    }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatDateTime(isoString) {
    if (!isoString) return 'LIVE';
    try {
        const dt = new Date(isoString);
        if (isNaN(dt.getTime())) return 'LIVE';
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    } catch(e) { return 'LIVE'; }
}
