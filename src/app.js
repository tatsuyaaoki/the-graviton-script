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
   2. DESKTOP BACKGROUND HOVER TRIGGERS (Patched for Text Nodes)
   ========================================================================== */
document.addEventListener('mouseover', (e) => {
    // FIX: Verify e.target is an actual Element before running .closest()
    if (window.innerWidth > 991 && e.target instanceof Element && e.target.closest('.catalog-card_component')) {
        // Future Hex Shader Trigger goes here
        devLog('[GRV:HEX] Card hovered - Hex background engaged');
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

                // Reset container position
                gsap.set(c, { position: 'fixed', top: headerH, left: 0, width: '100vw', zIndex: 2, x: '100vw', opacity: 0 });
                if (headerTargets.length) gsap.set(headerTargets, { opacity: 0, x: 20 });

                // 1. INIT PORTFOLIO LOGIC FIRST (Builds new dropdown HTML based on CMS)
                if (c.querySelector('.catalog-list_item')) {
                    PortfolioGallery.init(c, true);
                }

                // 2. HARD RESTART WEBFLOW AFTER HTML IS BUILT
                try {
                    if (window.Webflow) {
                        window.Webflow.destroy(); 
                        window.Webflow.ready();   
                        
                        // Explicitly command Webflow to wake up dropdowns and interactions
                        if (window.Webflow.require('dropdown')) window.Webflow.require('dropdown').ready();
                        if (window.Webflow.require('ix2')) window.Webflow.require('ix2').init();
                        
                        document.dispatchEvent(new Event('readystatechange'));
                    }
                } catch (e) {
                    devLog('BARBA: enter init error:', e);
                }

                // 3. MASTER ENTRY TIMELINE
                const tl = gsap.timeline({
                    delay: 0.1,
                    onComplete: () => {
                        devLog('BARBA: transition complete');
                        gsap.set(c, { clearProps: 'position,top,left,width,zIndex,x,opacity' });
                        updateHUD(); 
                        if (c.querySelector('.catalog-list_item')) PortfolioGallery.playIntro();
                    }
                });

                tl.to(c, { x: '0vw', opacity: 1, duration: 0.7, ease: "power3.out" });

                if(headerTargets.length) {
                    tl.to(headerTargets, { 
                        opacity: 1, x: 0, stagger: 0.05, duration: 0.4, ease: "power2.out", 
                        clearProps: "opacity,x" 
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