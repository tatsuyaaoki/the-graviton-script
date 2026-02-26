/**
 * Module: Main Application Entry Point (app.js)
 * Description: Orchestrates Barba.js transitions, initializes the background 
 * Hex Engine, and manages the Webflow DOM lifecycle.
 */

import { initHexEngine, handleHexResize } from './hex-engine.js';
import { PortfolioGallery } from './portfolio.js';
import { initHUD, updateHUD } from './hud.js';

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io');
export const devLog = (...args) => { if (IS_DEV) console.log(...args); };

/* ==========================================================================
   1. CANVAS BOOTSTRAP (Background Layer)
   ========================================================================== */
function bootstrapCanvas() {
    if (document.getElementById('hexCanvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'hexCanvas';
    canvas.setAttribute('data-html2canvas-ignore', 'true');
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-2; pointer-events:none; opacity:0;';
    document.body.appendChild(canvas);
    devLog('[GRV:BOOT] hexCanvas background created');
}
bootstrapCanvas();

/* ==========================================================================
   2. DESKTOP BACKGROUND HOVER TRIGGERS
   ========================================================================== */
document.addEventListener('mouseenter', (e) => {
    if (window.innerWidth > 991 && e.target.closest('.catalog-card_component')) {
        devLog('[GRV:HEX] Card hovered - Hex background engaged');
    }
}, true);

/* ==========================================================================
   3. BARBA.JS PAGE TRANSITIONS 
   ========================================================================== */
function initBarba() {
    if (typeof barba === 'undefined' || window._pgBarbaHooked) return;
    window._pgBarbaHooked = true;

    barba.init({
        debug: IS_DEV,
        transitions: [{
            name: 'slide-transition',

            // --- LEAVE: Current Page ---
            leave(data) {
                devLog('BARBA: leave()');
                const done = this.async();
                const c = data.current.container;

                if (c.getAttribute('data-barba-namespace') === 'catalog') {
                    PortfolioGallery.teardown();
                }

                const cascadeTargets = [
                    c.querySelector('#vertical_line_view_3'),
                    c.querySelector('.grid-btn'),
                    c.querySelector('.list-btn'),
                    c.querySelector('#vertical_line_view_2'),
                    c.querySelector('#vertical_line_filter_3'),
                    c.querySelector('#filter_item_2'),
                    c.querySelector('#vertical_line_filter_2'),
                    c.querySelector('#filter_item_1'),
                    c.querySelector('#vertical_line_filter_1')
                ].filter(Boolean); 

                const tl = gsap.timeline({
                    onComplete: () => {
                        window.scrollTo(0, 0);
                        gsap.set(c, { display: 'none' });
                        done();
                    }
                });

                if(cascadeTargets.length) {
                    tl.to(cascadeTargets, { x: -20, opacity: 0, duration: 0.25, stagger: 0.05, ease: "power2.in" });
                }

                tl.to(c, { x: '-100vw', opacity: 0, duration: 0.5, ease: "power3.inOut" }, "-=0.1"); 
            },

            // --- ENTER: Next Page ---
            enter(data) {
                devLog('BARBA: enter()');
                const c = data.next.container;
                const headerEl = document.querySelector('.header');
                const headerH = headerEl ? headerEl.offsetHeight : 50;

                // 1. Gather the fresh header elements for entry animation
                const headerTargets = [
                    c.querySelector('#vertical_line_filter_1'),
                    c.querySelector('#filter_item_1'),
                    c.querySelector('#vertical_line_filter_2'),
                    c.querySelector('#filter_item_2'),
                    c.querySelector('#vertical_line_filter_3'),
                    c.querySelector('#vertical_line_view_2'),
                    c.querySelector('.list-btn'),
                    c.querySelector('.grid-btn'),
                    c.querySelector('#vertical_line_view_3')
                ].filter(Boolean);

                // 2. Reset positions: Slide container right, hide header items
                gsap.set(c, { position: 'fixed', top: headerH, left: 0, width: '100vw', zIndex: 2, x: '100vw', opacity: 0 });
                if (headerTargets.length) gsap.set(headerTargets, { opacity: 0, x: 20 });

                // 3. HARD RESTART WEBFLOW: Vital for Dropdowns to function post-transition
                try {
                    if (window.Webflow) {
                        window.Webflow.destroy(); // Kill old listeners
                        window.Webflow.ready();   // Bind to new HTML
                        window.Webflow.require('ix2')?.init();
                        document.dispatchEvent(new Event('readystatechange'));
                        window.dispatchEvent(new Event('resize'));
                        if (window.ScrollTrigger) ScrollTrigger.refresh();
                    }
                    if (c.querySelector('.catalog-list_item')) PortfolioGallery.init(c, true);
                } catch (e) {
                    devLog('BARBA: enter init error:', e);
                }

                // 4. Master Entry Timeline
                const tl = gsap.timeline({
                    delay: 0.1,
                    onComplete: () => {
                        devLog('BARBA: transition complete');
                        gsap.set(c, { clearProps: 'position,top,left,width,zIndex,x,opacity' });
                        updateHUD(); 
                        if (c.querySelector('.catalog-list_item')) PortfolioGallery.playIntro();
                    }
                });

                // Slide page in
                tl.to(c, { x: '0vw', opacity: 1, duration: 0.7, ease: "power3.out" });

                // Cascade header items in from Left-to-Right
                if(headerTargets.length) {
                    tl.to(headerTargets, { 
                        opacity: 1, 
                        x: 0, 
                        stagger: 0.05, 
                        duration: 0.4, 
                        ease: "power2.out", 
                        clearProps: "opacity,x" // Clean up inline styles so they don't break flexbox
                    }, "-=0.3");
                }
            }
        }]
    });

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
    initHUD();

    const canvas = document.getElementById('hexCanvas');
    if (canvas) {
        initHexEngine(canvas);
        window.addEventListener('resize', handleHexResize);
    }

    const container = document.querySelector('[data-barba-namespace="catalog"]');
    if (container) PortfolioGallery.init(container, false);

    initBarba();
});