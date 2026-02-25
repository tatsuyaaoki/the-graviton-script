/**
 * Module: Heads-Up Display (HUD) UI
 * Description: Generates fixed SVG corner brackets, a dynamic scroll thumb,
 * and a viewport ruler. Synchronizes with Barba.js page height changes.
 */

const paths = {
    tl: { border: "M8.293 0h26.222v1H8.707L1 8.707V30.5H0V8.293z", tab: "M33.515 0.016h3v3h-3z", fill: "M14.142 0.3H8.515L.515 8.3v5.627z" },
    tr: { border: "M28.222 0H2v1h25.308l7.707 7.707V30.5h1V8.293z", tab: "M0 0.016h3v3H0z", fill: "M22.373 0.3h5.627l8 8v5.627z" },
    bl: { border: "M8.293 36h26.222v-1H8.707L1 27.293V5.5H0v22.207z", tab: "M33.515 33h3v3h-3z", fill: "M14.142 35.7H8.515l-8-8v-5.627z" },
    br: { border: "M28.222 36H2v-1h25.308l7.707-7.707V5.5h1v22.207z", tab: "M0 33h3v3H0z", fill: "M22.373 35.7h5.627l8-8v-5.627z" }
};

let track, thumb, rulerViewport;
let lastDocH = 0;
let _transitionTimer = null;

export function initHUD() {
    // Prevent duplicate HUDs if accidentally called twice
    if (document.querySelector('.wf-hud')) return;

    const hud = document.createElement('div');
    hud.className = 'wf-hud';

    // Build Corners
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const div = document.createElement('div');
        div.className = 'corner';
        div.dataset.pos = pos;
        div.innerHTML = `<svg viewBox="0 0 37 36">
            <path d="${paths[pos].border}" fill="white"/>
            <path d="${paths[pos].fill}" fill="white"/>
            <path d="${paths[pos].tab}" fill="white"/>
        </svg>`;
        hud.appendChild(div);
    });

    // Build Structural Elements
    const left = document.createElement('div');
    left.className = 'side-left';
    hud.appendChild(left);

    const right = document.createElement('div');
    right.className = 'side-right';
    
    track = document.createElement('div');
    track.className = 'scroll-track';
    
    thumb = document.createElement('div');
    thumb.className = 'scroll-thumb';
    
    rulerViewport = document.createElement('div');
    rulerViewport.className = 'ruler-viewport';

    track.appendChild(thumb);
    right.appendChild(track);
    right.appendChild(rulerViewport);
    hud.appendChild(right);
    document.body.appendChild(hud);

    buildRuler();

    window.addEventListener('scroll', updateHUD);
    window.addEventListener('resize', updateHUD);

    // Defer initial call one tick so the body's full scroll height is settled
    setTimeout(updateHUD, 0);
}

function buildRuler() {
    rulerViewport.innerHTML = '';
    for (let i = 0; i <= 100; i++) {
        const row = document.createElement('div');
        row.className = 'tick-row';
        const isMajor = i % 10 === 0;
        
        const tick = document.createElement('div');
        tick.className = 'tick ' + (isMajor ? 'major' : 'minor');
        
        if (isMajor) {
            const lbl = document.createElement('span');
            lbl.className = 'tick-label';
            lbl.textContent = i === 0 ? '00' : i;
            row.appendChild(lbl);
        }
        
        row.appendChild(tick);
        rulerViewport.appendChild(row);
    }
}

export function updateHUD() {
    if (!track || !thumb) return;

    const docH = document.documentElement.scrollHeight;
    const winH = window.innerHeight;
    const scrollPos = window.scrollY;
    const trackH = track.clientHeight;

    const thumbH = Math.max(40, (winH / docH) * trackH);
    const scrollable = Math.max(0, docH - winH);
    const pct = scrollable > 0 ? scrollPos / scrollable : 0;
    const yPos = pct * (trackH - thumbH);

    const pageHeightChanged = lastDocH !== 0 && Math.abs(lastDocH - docH) > 10;

    // Animation Strategy: Pure CSS over GSAP for performance.
    // Transition applied only during page-height changes (Barba injects).
    if (pageHeightChanged) {
        clearTimeout(_transitionTimer);
        thumb.style.transition = 'height 0.6s cubic-bezier(0.45, 0, 0.55, 1), transform 0.6s cubic-bezier(0.45, 0, 0.55, 1)';
        
        // Remove after animation completes so standard scrolling remains instant
        _transitionTimer = setTimeout(() => {
            thumb.style.transition = '';
        }, 650);
    } else {
        thumb.style.transition = '';
    }

    thumb.style.height = `${thumbH}px`;
    thumb.style.transform = `translateY(${yPos}px)`;

    lastDocH = docH;
}