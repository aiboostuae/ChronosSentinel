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
            moreMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
            moreMenu.classList.add('hidden');
        });
    }

    document.querySelectorAll('.more-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            const action = e.target.getAttribute('data-action');
            if (target) {
                switchTab(target);
            } else if (action === 'status') {
                showStatusModal();
            }
            if (moreMenu) moreMenu.classList.add('hidden');
            const moreBtn = document.getElementById('more-btn');
            if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
        });
    });

    // Modal Close Event Handlers
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalOverlay = document.getElementById('sentinel-modal');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // 3. Kickoff
    switchTab('sentinel');
    updateSystemStatusBanner();
}

// ─── Modal System Helpers (CS-009B) ───
function openModal(htmlContent) {
    const modal = document.getElementById('sentinel-modal');
    const body = document.getElementById('modal-body');
    if (modal && body) {
        body.innerHTML = htmlContent;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('sentinel-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function showClusterDetailModal(c, backCallback = null, thread = null) {
    const topic = c.topic_label || c.canonicalLabel || 'Intelligence Briefing';
    const syn = c.synthesis || c.summary || 'Detailed synthesis pending...';
    const facts = c.shared_facts || (c.facts ? (Array.isArray(c.facts) ? c.facts : [c.facts]) : []);
    const diffs = c.source_differences || (c.differences ? (Array.isArray(c.differences) ? c.differences : [c.differences]) : []);
    const severity = (c.qualification_score && c.qualification_score >= 8) ? 'High' : 
                     (c.qualification_score && c.qualification_score >= 5) ? 'Medium' : 'Low';
    const displayTime = formatDateTime(c.event_window_end || c.created_at || c.timestamp);
    const sources = c.sources || [];
    const sevClass = severity.toLowerCase();

    let backBtnHtml = '';
    if (backCallback) {
        backBtnHtml = `
        <button class="view-btn" id="modal-back-btn" style="margin-bottom:1.5rem; padding:0.4rem 0.8rem; font-size:0.75rem; border-radius:30px;">
            &larr; Back to Snapshot
        </button>
        `;
    }

    // Build Event Timeline section from older versions in the thread
    let timelineHtml = '';
    if (thread && thread.length > 1) {
        const olderVersions = thread.slice(1); // index 0 is already shown above
        const versionItems = olderVersions.map((v, idx) => {
            const vTime = formatDateTime(v.event_window_end || v.created_at || v.timestamp);
            const vSyn = v.synthesis || v.summary || 'No synthesis available.';
            const vLabel = v.topic_label || topic;
            return `
            <div class="timeline-entry">
                <div class="timeline-dot"></div>
                <div class="timeline-body">
                    <div class="timeline-meta">
                        <span class="timeline-label">Version ${olderVersions.length - idx}</span>
                        <span class="timeline-time">${vTime}</span>
                    </div>
                    <div class="timeline-topic">${vLabel}</div>
                    <div class="timeline-syn">${vSyn}</div>
                </div>
            </div>`;
        }).join('');

        timelineHtml = `
        <div class="syn-section event-timeline-section">
            <div class="syn-title" style="display:flex; align-items:center; gap:0.5rem;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Event Timeline <span style="font-size:0.7rem; font-weight:400; color:var(--text-tertiary); margin-left:0.25rem;">(${olderVersions.length} previous update${olderVersions.length > 1 ? 's' : ''})</span>
            </div>
            <div class="timeline-track">
                ${versionItems}
            </div>
        </div>`;
    }

    const htmlContent = `
    ${backBtnHtml}
    <div class="cluster-card">
        <div class="card-header" style="margin-bottom: 2rem;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; padding-right: 2rem; flex-wrap:wrap; gap:0.5rem;">
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <span class="topic-tag ${sevClass}">${severity.toUpperCase()}</span>
                    ${thread && thread.length > 1 ? `<span class="version-badge">&#8635; ${thread.length} UPDATES</span>` : ''}
                </div>
                <span style="font-size:0.75rem; color:var(--text-secondary);">${displayTime}</span>
            </div>
            <h2 style="font-family:'Outfit', sans-serif; font-size:1.8rem; font-weight:800; margin:0; line-height:1.2;">${topic}</h2>
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
            <div class="syn-text" style="line-height:1.6; font-size:1.05rem;">${syn}</div>
        </div>
        <div class="syn-section">
            <div class="syn-title">Confidence</div>
            <div class="syn-text" style="font-style: italic; color: var(--text-secondary); font-size:0.9rem;">${c.confidence || 'Unconfirmed'}</div>
        </div>
        <div class="syn-section" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
            <div class="syn-title">Sources</div>
            <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
               ${sources.map(s => `<a class="source-tag" href="${s.url}" target="_blank">${(s.source || s.id || 'src').toUpperCase()}</a>`).join('')}
            </div>
        </div>
    </div>
    ${timelineHtml}
    `;
    
    openModal(htmlContent);

    if (backCallback) {
        const backBtn = document.getElementById('modal-back-btn');
        if (backBtn) {
            backBtn.onclick = backCallback;
        }
    }
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

async function showStatusModal() {
    openModal(`<div class="loading-pulse">Retrieving System Telemetry...</div>`);
    try {
        const res = await fetch('api/v1/status.json?cb=' + Date.now());
        const status = res.ok ? await res.json() : { system_status: 'Unavailable' };
        
        const html = `
            <div class="panel-header" style="margin-bottom: 1.5rem;">
                <h2 style="font-family:'Outfit', sans-serif; font-size:1.8rem; margin:0;">System Telemetry</h2>
                <p style="color:var(--text-secondary); margin-top:0.5rem;">Chronos Sentinel Operational Status</p>
            </div>
            <div class="syn-section">
                <div class="syn-title">Status Summary</div>
                <ul class="syn-list">
                    <li><strong>Engine:</strong> ${formatPublicStatus(status.engine || 'Unknown')}</li>
                    <li><strong>System Health:</strong> ${formatPublicStatus(status.system_status || 'Unknown')}</li>
                    <li><strong>Last Uplink:</strong> ${formatDateTime(status.generated_at)}</li>
                </ul>
            </div>
        `;
        openModal(html);
    } catch(e) {
        openModal(`<div class="syn-text" style="color:var(--threat-red);">Telemetry Error: ${e.message}</div>`);
    }
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

// ── Event Thread Engine ──
// Groups clusters that are about the same evolving story into a single thread.
// The latest version leads the card; older versions appear in the modal timeline.
function groupIntoThreads(clusters) {
    const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const isSimilar = (c1, c2) => {
        // Same exact ID
        if (c1.cluster_id === c2.cluster_id) return true;
        // Share >= 30% of articles (relaxed — catches evolving stories with new articles)
        const overlap = c1.article_ids.filter(id => c2.article_ids.includes(id));
        if (overlap.length >= Math.max(1, Math.min(c1.article_ids.length, c2.article_ids.length) * 0.3)) return true;
        // Keyword similarity on topic label (>= 50% shared keywords of length > 3)
        const w1 = clean(c1.topic_label).split(/\s+/).filter(w => w.length > 3);
        const w2 = clean(c2.topic_label).split(/\s+/).filter(w => w.length > 3);
        if (w1.length > 0 && w2.length > 0) {
            let matches = 0;
            for (const w of w1) { if (w2.includes(w)) matches++; }
            if (matches >= Math.ceil(Math.min(w1.length, w2.length) * 0.5)) return true;
        }
        return false;
    };

    const threads = [];
    for (const cluster of clusters) {
        const found = threads.find(t => isSimilar(t[0], cluster));
        if (found) {
            found.push(cluster);
        } else {
            threads.push([cluster]);
        }
    }

    // Sort each thread newest-first, so index 0 is always the latest
    return threads.map(t => t.sort((a, b) => {
        const ta = new Date(a.event_window_end || a.created_at || 0).getTime();
        const tb = new Date(b.event_window_end || b.created_at || 0).getTime();
        return tb - ta;
    }));
}

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

        const threads = groupIntoThreads(filtered);
        renderThreads(threads, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">Telemetry Error: ${e.message}</div>`;
    }
}

function renderThreads(threads, container, backCallback = null) {
    container.innerHTML = '';
    threads.forEach(thread => {
        // Lead with the newest (index 0); older versions trail behind
        const c = thread[0];
        const versions = thread.length;
        const topic = c.topic_label || c.canonicalLabel || 'Intelligence Update';
        const syn = c.synthesis || c.summary || 'Detailed synthesis pending...';
        const severity = (c.qualification_score && c.qualification_score >= 8) ? 'High' :
                         (c.qualification_score && c.qualification_score >= 5) ? 'Medium' : 'Low';
        const displayTime = formatDateTime(c.event_window_end || c.created_at || c.timestamp);
        const sevClass = severity.toLowerCase();
        const excerpt = syn.length > 150 ? syn.substring(0, 150) + '...' : syn;

        // Badge: Developing Story or Updated count
        let versionBadge = '';
        if (versions > 1) {
            versionBadge = `<span class="version-badge">&#8635; ${versions} UPDATES</span>`;
        }

        const card = document.createElement('div');
        card.className = 'cluster-card mini-card';
        card.innerHTML = `
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <span class="topic-tag ${sevClass}">${severity.toUpperCase()}</span>
                        ${versionBadge}
                    </div>
                    <span style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap;">${displayTime}</span>
                </div>
                <h3>${topic}</h3>
            </div>
            <div class="syn-text" style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0;">${excerpt}</div>
            <div class="card-expand-hint">
                <svg style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:3px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                </svg>
                <span>${versions > 1 ? 'Read Briefing + Event Timeline' : 'Read Full Briefing'}</span>
            </div>
        `;
        card.onclick = () => showClusterDetailModal(c, backCallback, thread);
        container.appendChild(card);
    });
}

// Keep renderClusters for archive snapshot use (no grouping needed there)
function renderClusters(clusters, container, backCallback = null) {
    container.innerHTML = '';
    clusters.forEach(c => {
        const topic = c.topic_label || c.canonicalLabel || 'Intelligence Update';
        const syn = c.synthesis || c.summary || 'Detailed synthesis pending...';
        const severity = (c.qualification_score && c.qualification_score >= 8) ? 'High' : 
                         (c.qualification_score && c.qualification_score >= 5) ? 'Medium' : 'Low';
        const displayTime = formatDateTime(c.event_window_end || c.created_at || c.timestamp);
        const sevClass = severity.toLowerCase();
        const excerpt = syn.length > 150 ? syn.substring(0, 150) + "..." : syn;
        const card = document.createElement('div');
        card.className = 'cluster-card mini-card';
        card.innerHTML = `
            <div class="card-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <span class="topic-tag ${sevClass}">${severity.toUpperCase()}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${displayTime}</span>
                </div>
                <h3>${topic}</h3>
            </div>
            <div class="syn-text" style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0;">${excerpt}</div>
            <div class="card-expand-hint">
                <svg style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:3px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                </svg>
                <span>Read Full Briefing</span>
            </div>
        `;
        card.onclick = () => showClusterDetailModal(c, backCallback);
        container.appendChild(card);
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
        const isHigh = severityClass === 'high' || severityClass === 'critical';
        const domainsList = (i.domains || []).map(d => `<span class="source-tag" style="margin-right:0.25rem;">${d.toUpperCase()}</span>`).join('');
        
        const markup = `
        <div class="cluster-card impact-card ${isHigh ? 'severity-high' : ''}">
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
                openArchiveDayModal(entry);
            };
        } else {
            cell.style.opacity = '0.3';
            cell.style.cursor = 'default';
        }
        grid.appendChild(cell);
    }
}

function openArchiveDayModal(entry, autoSelectRunFile = null) {
    const htmlContent = `
    <div class="day-detail-panel" style="margin-bottom:0; border:none; background:transparent; padding:0;">
        <div class="detail-header" style="margin-bottom:1.5rem;">
            <h3 id="selected-date-label" style="font-family:'Outfit', sans-serif; font-size:1.6rem; font-weight:800; margin:0;">Sectors Log: ${entry.date}</h3>
        </div>
        <div id="runs-list" class="runs-list" style="margin-bottom:2rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
            <!-- Runs injected by JS -->
        </div>
        <div id="archive-grid" class="cards-grid">
            <!-- Snapshot clusters will be rendered here -->
        </div>
    </div>
    `;
    openModal(htmlContent);

    const list = document.getElementById('runs-list');
    const container = document.getElementById('archive-grid');
    if (!list || !container) return;

    entry.runs.forEach(runFile => {
        const runTime = runFile.replace('run-', '').replace('.json', '');
        const formattedTime = runTime.substring(0,2) + ":" + runTime.substring(2,4) + " UTC";
        const item = document.createElement('div');
        item.className = 'run-item';
        item.style = 'background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:0.75rem 1.25rem; border-radius:8px; cursor:pointer; display:flex; flex-direction:column; gap:0.25rem; transition:all 0.3s ease;';
        
        item.innerHTML = `<span class="run-time" style="font-family:\'Outfit\', sans-serif; font-weight:700; color:var(--accent-cyan); font-size:0.95rem;">${formattedTime}</span><span class="run-stats" style="font-size:0.75rem; color:var(--text-secondary);">Run ID: ${runFile.split('.')[0]}</span>`;
        
        const loadRunData = async () => {
            document.querySelectorAll('.run-item').forEach(r => {
                r.style.background = 'rgba(255,255,255,0.03)';
                r.style.borderColor = 'var(--border-glass)';
            });
            item.style.background = 'rgba(99, 102, 241, 0.15)';
            item.style.borderColor = 'var(--accent-indigo)';
            
            container.innerHTML = '<div class="loading-pulse">Retrieving Run Telemetry...</div>';
            try {
                const res = await fetch(`data/archive/${entry.date}/${runFile}?cb=${Date.now()}`);
                const data = await res.json();
                
                const activeRegion = localStorage.getItem('sentinel_region') || 'global';
                const filtered = (data.clusters || []).filter(c => {
                    if (activeRegion === 'global') return true;
                    return c.region_tag === activeRegion;
                });
                
                if (filtered.length > 0) {
                    renderClusters(filtered, container, () => openArchiveDayModal(entry, runFile));
                    
                    // Prepend run meta header in grid
                    const header = document.createElement('div');
                    header.className = 'cluster-card';
                    header.style = 'margin-bottom:1.5rem; border-left:4px solid var(--accent-indigo); width:100%; grid-column:1 / -1; background:rgba(255,255,255,0.02); border-radius:8px; padding:1.25rem;';
                    header.innerHTML = `
                        <div class="card-header">
                            <span class="topic-tag" style="background:rgba(99,102,241,0.15); color:var(--accent-cyan); font-size:0.7rem; font-weight:700; padding:0.25rem 0.6rem; border-radius:4px; text-transform:uppercase;">${entry.date} ${formattedTime}</span>
                            <h3 style="margin: 0.75rem 0 0 0; font-family:\'Outfit\', sans-serif; font-size:1.2rem; font-weight:700;">Intelligence Log Snapshot</h3>
                        </div>
                    `;
                    container.insertBefore(header, container.firstChild);
                } else {
                    container.innerHTML = `<div class="syn-text" style="padding:2rem; grid-column:1 / -1; text-align:center;">No entries for ${activeRegion.toUpperCase()} in this snapshot.</div>`;
                }
            } catch(e) {
                container.innerHTML = `<div class="syn-text" style="color:var(--threat-red); grid-column:1 / -1; text-align:center;">Fetch Fail: ${e.message}</div>`;
            }
        };
        
        item.onclick = loadRunData;
        list.appendChild(item);
        
        // Auto trigger if requested
        if (autoSelectRunFile === runFile) {
            loadRunData();
        }
    });
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
