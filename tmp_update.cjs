const fs = require('fs');

let content = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Replace loadSentinel
const newLoadSentinel = `async function loadSentinel() {
    const gridContainer = document.getElementById('clusters-grid');
    const heroContainer = document.getElementById('hero-dispatch-container');
    const statusBanner = document.getElementById('global-alert-banner');
    
    if (!gridContainer || !heroContainer) return;
    gridContainer.innerHTML = '<div class="loading-pulse">Establishing Uplink...</div>';
    heroContainer.innerHTML = '';
    heroContainer.classList.add('hidden');
    
    try {
        const res = await fetch('data/latest/clusters.json?cb=' + Date.now());
        const clusters = await res.json();
        
        const activeRegion = localStorage.getItem('sentinel_region') || 'global';
        const filtered = clusters.filter(c => {
            if (activeRegion === 'global') return true;
            return c.region_tag === activeRegion;
        });

        gridContainer.innerHTML = '';
        if (filtered.length === 0) {
            gridContainer.innerHTML = '<div class="syn-text" style="padding:2rem; text-align:center;">No synthesized signals detected in this sector.</div>';
            statusBanner.textContent = 'STATUS: STABLE';
            statusBanner.style.color = '#00e5ff';
            return;
        }

        const threads = groupIntoThreads(filtered);
        
        // Find CRITICAL or HIGH for Hero Slot
        const heroThreadIndex = threads.findIndex(t => {
            const sev = (t[0].severity || '').toUpperCase();
            return sev === 'CRITICAL' || sev === 'HIGH';
        });

        let hasCritical = threads.some(t => (t[0].severity || '').toUpperCase() === 'CRITICAL');
        if(hasCritical) {
            statusBanner.innerHTML = '<span class="pulse-dot"></span>CRITICAL INCIDENT ACTIVE';
            statusBanner.style.color = '#ef4444';
        } else {
            statusBanner.textContent = 'REGIONAL SURVEILLANCE STABLE';
            statusBanner.style.color = '#00e5ff';
        }

        if (heroThreadIndex !== -1) {
            const heroThread = threads.splice(heroThreadIndex, 1)[0];
            renderHero(heroThread, heroContainer);
            heroContainer.classList.remove('hidden');
        }

        renderThreads(threads, gridContainer);
    } catch(e) {
        gridContainer.innerHTML = \`<div class="syn-text">Telemetry Error: \${e.message}</div>\`;
    }
}

function renderHero(thread, container) {
    const c = thread[0];
    const sev = (c.severity || 'HIGH').toUpperCase();
    const topic = c.topic_label || 'Active Kinetic Dispatch';
    const syn = c.synthesis || 'Synthesis in progress...';
    const incidentType = c.incident_type || 'Kinetic Event';
    const displayTime = formatDateTime(c.event_window_end || c.created_at || c.timestamp);
    
    container.innerHTML = \`
        <div class="hero-card severity-\${sev}">
            <div class="hero-header">
                <span class="badge-\${sev}">\${sev}</span>
                <span>\${displayTime}</span>
                <span>|\u00A0\u00A0\${incidentType}</span>
            </div>
            <h3 class="hero-title">\${topic}</h3>
            <p class="hero-synthesis">\${syn}</p>
            <button class="hero-btn">Read Full Truth Briefing</button>
        </div>
    \`;
    
    container.querySelector('.hero-btn').onclick = () => showClusterDetailModal(c, null, thread);
}

function renderThreads`;

content = content.replace(/async function loadSentinel\(\) \{[\s\S]*?function renderThreads/m, newLoadSentinel);

// 2. Fix the severity logic in renderThreads & renderClusters
content = content.replace(/const severity = \(\w+\.qualification_score && \w+\.qualification_score >= 8\) \? 'High' :[\s\S]*?'Low';/g, "const severity = c.severity || 'LOW';");
content = content.replace(/const sevClass = severity\.toLowerCase\(\);/g, "const sevClass = 'badge-' + severity.toUpperCase();");
content = content.replace(/<span class=\"topic-tag \$\{sevClass\}\">\$\{severity\.toUpperCase\(\)\}<\/span>/g, `<span class="\${sevClass}">\${severity.toUpperCase()}</span>`);

// 3. Update Modal HTML logic to replace old tags (safe_conclusions, etc) with new MIMO schema (consensus, divergence)
const oldModalRender = /<div class=\"modal-section\">\s*<h4><svg.*?<\/svg>Corroborated Facts<\/h4>[\s\S]*?<\/div>\s*<\/div>/m;
const newModalRender = `<div class="modal-section">
                <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Kinetic Consensus</h4>
                <ul>\${(c.consensus || c.shared_facts || []).map(f => \`<li>\${f}</li>\`).join('') || '<li>No physical consensus available.</li>'}</ul>
            </div>
            <div class="modal-section">
                <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Narrative Divergence & Spin</h4>
                <ul>\${(c.divergence || c.framing_differences || []).map(f => \`<li>\${f}</li>\`).join('') || '<li>No narrative divergence detected.</li>'}</ul>
            </div>
        </div>`;

content = content.replace(oldModalRender, newModalRender);

// Replace "Truth Briefing" title
content = content.replace(/<div class=\"modal-header\">\s*<div class=\"modal-title\">Truth Briefing<\/div>/g, `<div class="modal-header">\n            <div class="modal-title">Kinetic Truth Briefing</div>`);


fs.writeFileSync('public/js/app.js', content);
console.log("App updated successfully.");
