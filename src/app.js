/**
 * Module: Main Application Entry Point (app.js)
 * Description: Orchestrates Barba.js transitions, initializes the Three.js 
 * Hex Engine, and manages the Webflow DOM lifecycle.
 * Updated: Wired predictive WebGL texture caching on link hover.
 */

import { initHexEngine, playHexTransition, handleHexResize, prefetchViewportTexture, cachedTexture } from './hex-engine.js';
import { PortfolioGallery } from './portfolio.js';
import { initHUD, updateHUD } from './hud.js';

// Environment Check for Debugging
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io');
export const devLog = (...args) => { if (IS_DEV) console.log(...args); };

/* ==========================================================================
   1. CANVAS BOOTSTRAP
   Runs synchronously to ensure #hexCanvas exists before Three.js binds to it.
   ========================================================================== */
function bootstrapCanvas() {
    if (document.getElementById('hexCanvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'hexCanvas';
    canvas.setAttribute('data-html2canvas-ignore', 'true');
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:10; pointer-events:none; opacity:0;';
    document.body.appendChild(canvas);
    devLog('[GRV:BOOT] hexCanvas created and appended to body');
}
bootstrapCanvas();

/* ==========================================================================
   2. PREDICTIVE CAPTURE (The Magic Trick)
   ========================================================================== */
// Listen for hovers on any link to pre-compute the html2canvas texture
document.addEventListener('mouseover', (e) => {
    // If hovering over a link, and we don't already have a texture cached in memory
    if (e.target.closest('a') && !cachedTexture) {
        prefetchViewportTexture();
    }
});

/* ==========================================================================
   3. BARBA.JS PAGE TRANSITIONS
   ========================================================================== */
function initBarba() {
    if (typeof barba === 'undefined' || window._pgBarbaHooked) return;
    window._pgBarbaHooked = true;

    barba.init({
        debug: IS_DEV,
        transitions: [{
            name: 'hex-transition',

            // --- LEAVE: Current Page ---
            leave(data) {
                devLog('BARBA: leave()');
                const done = this.async();

                // PERCEIVED PERFORMANCE TWEAK: Instant feedback on click
                // Shrink the clicked element instantly so the user knows the app is responding
                if (data.trigger instanceof Element) {
                    gsap.to(data.trigger, { scale: 0.95, opacity: 0.8, duration: 0.2, transformOrigin: "center center" });
                }

                if (data.current.container.getAttribute('data-barba-namespace') === 'catalog') {
                    PortfolioGallery.teardown();
                }

                const c = data.current.container;
                const hexCanvas = document.getElementById('hexCanvas');
                const bgColor = getComputedStyle(document.body).getPropertyValue('background-color') || '#000000';

                // Trigger Three.js transition from hex-engine.js
                if (hexCanvas) {
                    playHexTransition(hexCanvas, bgColor, () => {
                        window.scrollTo(0, 0);
                        gsap.set(c, { opacity: 0, display: 'none' });
                        done();
                    });
                } else {
                    devLog('BARBA: hexCanvas unavailable — hard cut');
                    window.scrollTo(0, 0);
                    gsap.set(c, { opacity: 0, display: 'none' });
                    done();
                }
            },

            // --- ENTER: Next Page ---
            enter(data) {
                devLog('BARBA: enter()');
                const c = data.next.container;
                const headerEl = document.querySelector('.header');
                const headerH = headerEl ? headerEl.offsetHeight : 50;

                // Reset new container position
                gsap.set(c, {
                    position: 'fixed', top: headerH, left: 0, width: '100vw',
                    zIndex: 2, opacity: 0, scale: 0.95, transformOrigin: 'top center'
                });

                // Bridge Pattern: Re-initialize Webflow's native JS
                try {
                    if (window.Webflow) {
                        window.Webflow.require('dropdown')?.ready();
                        if (c.querySelector('[data-wf-ix]')) window.Webflow.require('ix2')?.init();
                        window.dispatchEvent(new Event('resize'));
                        if (window.ScrollTrigger) ScrollTrigger.refresh();
                    }
                    // Init custom portfolio logic if on catalog page
                    if (c.querySelector('.w-dyn-item')) PortfolioGallery.init(c, true);
                } catch (e) {
                    devLog('BARBA: enter init error:', e);
                }

                // Global Entry Animation
                const tl = gsap.timeline({
                    delay: 0.4,
                    onComplete: () => {
                        devLog('BARBA: transition complete');
                        gsap.set(c, { clearProps: 'position,top,left,width,zIndex,transform,opacity,transformOrigin' });
                        updateHUD(); 
                        if (c.querySelector('.w-dyn-item')) PortfolioGallery.playIntro();
                    }
                });

                tl.to(c, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' });
            }
        }]
    });

    // Update active navigation states on route change
    barba.hooks.beforeEnter((data) => {
        const nextUrl = data.next.url.path;
        document.querySelectorAll('.w-nav-menu a, .w-nav-brand').forEach(el => {
            el.classList.remove('w--current', 'pg-active');
            if (el.getAttribute('href') === nextUrl) el.classList.add('w--current', 'pg-active');
        });
    });
}

/* ==========================================================================
   4. SYSTEM BOOT (DOMContentLoaded)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Init UI Overlays
    initHUD();

    // 2. Init WebGL Engine
    const canvas = document.getElementById('hexCanvas');
    if (canvas) {
        initHexEngine(canvas);
        window.addEventListener('resize', handleHexResize);
    }

    // 3. Init Page-Specific Logic (if landing directly on catalog)
    const container = document.querySelector('[data-barba-namespace="catalog"]');
    if (container) PortfolioGallery.init(container, false);

    // 4. Mount Barba Router
    initBarba();
});