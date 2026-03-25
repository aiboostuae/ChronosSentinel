document.addEventListener('DOMContentLoaded', () => {
    const btns = document.querySelectorAll('.view-btn');
    const panels = document.querySelectorAll('.view-panel');

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

    loadClusters();
});

// ─── TAB 1: Sentinel Synthesis ───────────────────────────────────────────────

async function loadClusters() {
    const container = document.getElementById('clusters-grid');
    try {
        const res = await fetch('data/latest/clusters.json');
        const text = await res.text();
        let clusters;
        try { clusters = JSON.parse(text); } catch(e) {
            throw new Error('Data sync pending or unavailable.');
        }
        renderClusters(clusters, container);
    } catch(e) {
        container.innerHTML = `<div class="syn-text">${e.message}</div>`;
    }
}

function renderClusters(clusters, container) {
    if(!clusters || clusters.length === 0) {
        container.innerHTML = '<div class="syn-text">No synthesized multi-source clusters available yet.</div>';
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
                <div class="syn-title">Verified Overlap (Fact Consensus)</div>
                <ul class="syn-list">
                    ${c.comparison.sharedFacts.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>

            <div class="syn-section">
                <div class="syn-title">Distinctions &amp; Framing</div>
                <ul class="syn-list">
                    ${c.comparison.sourceDistinctions.map(d => `<li><span class="source-tag">${d.source}</span> ${d.point}</li>`).join('')}
                </ul>
            </div>
            
            <div class="syn-section">
                <div class="syn-title">Sources Analyzed</div>
                <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
                   ${c.memberArticles.map(a => `<a class="source-tag" href="${a.url}" target="_blank">${a.sourceId}</a>`).join('')}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += markup;
    });
}

// ─── TAB 2: Raw Live Feed ─────────────────────────────────────────────────────

async function loadHeadlines() {
    const tbody = document.querySelector('#headlines-table tbody');
    if(tbody.children.length > 0 && !tbody.innerHTML.includes('loading-pulse')) return;

    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-pulse">Fetching raw feed...</div></td></tr>';
    try {
        const res = await fetch('data/latest/headlines.json');
        const text = await res.text();
        let headlines;
        try { headlines = JSON.parse(text); } catch(e) {
            throw new Error('Feed data corrupted.');
        }
        
        tbody.innerHTML = '';
        if (!headlines || headlines.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No headlines ingested yet.</td></tr>';
            return;
        }
        headlines.slice(0, 100).forEach(h => {
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
        tbody.innerHTML = `<tr><td colspan="3">Failed to load feed: ${e.message}</td></tr>`;
    }
}

// ─── TAB 3: Archive Logs ─────────────────────────────────────────────────────

async function loadArchive() {
    const grid = document.getElementById('archive-grid');
    if(grid.dataset.loaded) return; // Only load once per session
    grid.innerHTML = '<div class="loading-pulse">Loading archive index...</div>';
    try {
        const res = await fetch('data/archive/manifest.json');
        const text = await res.text();
        let manifest;
        try { manifest = JSON.parse(text); } catch(e) {
            throw new Error('Manifest not yet generated.');
        }
        if (!manifest || manifest.length === 0) {
            grid.innerHTML = '<div class="syn-text">No archive snapshots yet.</div>';
            return;
        }

        grid.innerHTML = '';
        grid.dataset.loaded = 'true';

        // Date selector row
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

        // Load the most recent snapshot automatically
        const latest = manifest[0];
        const latestRun = latest.runs[0];
        const snapRes = await fetch(`data/archive/${latest.date}/${latestRun}`);
        const snapText = await snapRes.text();
        let snapshot;
        try { snapshot = JSON.parse(snapText); } catch(e) {
            throw new Error('Snapshot unreadable.');
        }
        renderSnapshot(snapshot, latest.date, latest.runs, grid);

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
        <div class="cluster-card" style="margin-bottom:1rem;">
            <div class="card-header">
                <span class="topic-tag">${date}</span>
                <h3>Snapshot: ${ts}</h3>
            </div>
            <div class="syn-section">
                <div class="syn-title">Snapshot Summary</div>
                <ul class="syn-list">
                    <li>${headlineCount} headlines ingested</li>
                    <li>${clusterCount} AI-synthesized clusters</li>
                    <li>Run file: ${runs[0]}</li>
                </ul>
            </div>
            ${clusterCount > 0 ? `
            <div class="syn-section">
                <div class="syn-title">Clusters in Snapshot</div>
                <ul class="syn-list">
                    ${snapshot.clusters.map(c => `<li><span class="source-tag">${c.topic}</span> ${c.comparison ? c.comparison.synthesisSummary : ''}</li>`).join('')}
                </ul>
            </div>` : ''}
        </div>
    `;
    grid.appendChild(wrap);
}
