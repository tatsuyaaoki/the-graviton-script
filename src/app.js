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
   1. CANVAS BOOTSTRAP (Now a Pure Background Layer)
   ========================================================================== */
function bootstrapCanvas() {
    if (document.getElementById('hexCanvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'hexCanvas';
    canvas.setAttribute('data-html2canvas-ignore', 'true');
    // Canvas is now pushed further back (-2) so it sits safely behind the UI 
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-2; pointer-events:none; opacity:0;';
    document.body.appendChild(canvas);
    devLog('[GRV:BOOT] hexCanvas background created');
}
bootstrapCanvas();

/* ==========================================================================
   2. DESKTOP BACKGROUND HOVER TRIGGERS (Replaces Barba trigger)
   ========================================================================== */
document.addEventListener('mouseenter', (e) => {
    // Only trigger the background hex effect on Desktop when hovering over a card
    if (window.innerWidth > 991 && e.target.closest('.catalog-card_component')) {
        // Here you will call your updated background shader trigger in the future
        // e.g., triggerHexBackgroundRipples();
        devLog('[GRV:HEX] Card hovered - Hex background engaged');
    }
}, true); // Use capture phase to ensure it catches dynamic elements

/* ==========================================================================
   3. BARBA.JS PAGE TRANSITIONS (Right-to-Left Cascade & Slide)
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

                // Compile the elements in strict RIGHT-TO-LEFT order
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
                ].filter(Boolean); // Clean out nulls if elements are missing

                const tl = gsap.timeline({
                    onComplete: () => {
                        window.scrollTo(0, 0);
                        gsap.set(c, { display: 'none' });
                        done();
                    }
                });

                // 1. Stagger exit animation (Right-to-Left)
                if(cascadeTargets.length) {
                    tl.to(cascadeTargets, {
                        x: -20,
                        opacity: 0,
                        duration: 0.25,
                        stagger: 0.05,
                        ease: "power2.in"
                    });
                }

                // 2. Slide the entire container out to the Left
                tl.to(c, {
                    x: '-100vw',
                    opacity: 0,
                    duration: 0.5,
                    ease: "power3.inOut"
                }, "-=0.1"); // Start sliding slightly before the cascade finishes
            },

            // --- ENTER: Next Page ---
            enter(data) {
                devLog('BARBA: enter()');
                const c = data.next.container;
                const headerEl = document.querySelector('.header');
                const headerH = headerEl ? headerEl.offsetHeight : 50;

                // Reset new container position: Start completely off-screen to the Right
                gsap.set(c, {
                    position: 'fixed', top: headerH, left: 0, width: '100vw',
                    zIndex: 2, x: '100vw', opacity: 0 
                });

                // Bridge Pattern: Re-initialize Webflow's native JS
                try {
                    if (window.Webflow) {
                        window.Webflow.require('dropdown')?.ready();
                        if (c.querySelector('[data-wf-ix]')) window.Webflow.require('ix2')?.init();
                        window.dispatchEvent(new Event('resize'));
                        if (window.ScrollTrigger) ScrollTrigger.refresh();
                    }
                    if (c.querySelector('.catalog-list_item')) PortfolioGallery.init(c, true);
                } catch (e) {
                    devLog('BARBA: enter init error:', e);
                }

                // Slide the new page in from the Right to Center
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