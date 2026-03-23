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
        });
    });

    loadClusters();
});

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
        if(!c.comparison) return; // Skip non-analyzed
        
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
                <div class="syn-title">Distinctions & Framing</div>
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
