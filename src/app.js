/**
 * Module: Main Application Entry Point (app.js)
 * Description: Orchestrates Spatial Barba.js transitions.
 */

import { initHexEngine, handleHexResize } from './hex-engine.js';
import { PortfolioGallery } from './portfolio.js';
import { initHUD, updateHUD } from './hud.js';

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io');
export const devLog = (...args) => { if (IS_DEV) console.log(...args); };

/* ==========================================================================
   1. SPATIAL ROUTE MAP
   Defines the physical Left-to-Right layout of the website.
   ========================================================================== */
const routeMap = ['/', '/catalog', '/glitch']; 

function getRouteDirection(fromPath, toPath) {
    const normalize = (p) => p === '/' ? '/' : p.replace(/\/$/, '').split('?')[0];
    let fromIdx = routeMap.findIndex(r => normalize(fromPath).startsWith(r) && (r !== '/' || normalize(fromPath) === '/'));
    let toIdx = routeMap.findIndex(r => normalize(toPath).startsWith(r) && (r !== '/' || normalize(toPath) === '/'));

    if (fromIdx === -1) fromIdx = 0;
    if (toIdx === -1) toIdx = 1;

    // Returns 1 if moving Right, -1 if moving Left
    return toIdx >= fromIdx ? 1 : -1;
}

/* ==========================================================================
   2. CANVAS BOOTSTRAP & HOVER TRIGGERS (Background Layer)
   ========================================================================== */
function bootstrapCanvas() {
    if (document.getElementById('hexCanvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'hexCanvas';
    canvas.setAttribute('data-html2canvas-ignore', 'true');
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-2; pointer-events:none; opacity:0;';
    document.body.appendChild(canvas);
}
bootstrapCanvas();

document.addEventListener('mouseover', (e) => {
    if (window.innerWidth > 991 && e.target instanceof Element && e.target.closest('.catalog-card_component')) {
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
            name: 'spatial-slide',

            leave(data) {
                const done = this.async();
                const c = data.current.container;
                const dir = getRouteDirection(data.current.url.path, data.next.url.path);
                
                // Save direction for the enter hook
                data.next.direction = dir; 

                if (c.getAttribute('data-barba-namespace') === 'catalog') {
                    PortfolioGallery.teardown();
                }

                // Slide the old page OUT to the opposite direction of travel
                gsap.to(c, { 
                    x: `${-100 * dir}vw`, 
                    opacity: 0, 
                    duration: 0.6, 
                    ease: "power3.inOut",
                    onComplete: () => {
                        window.scrollTo(0, 0);
                        gsap.set(c, { display: 'none' });
                        done();
                    }
                });
            },

            enter(data) {
                const c = data.next.container;
                const headerEl = document.querySelector('.header');
                const headerH = headerEl ? headerEl.offsetHeight : 50;
                
                // Retrieve direction calculated in leave() hook, default to 1 (Right)
                const dir = data.next.direction || 1; 

                // Start the new page OFFSCREEN in the direction it came from
                gsap.set(c, { position: 'fixed', top: headerH, left: 0, width: '100vw', zIndex: 2, x: `${100 * dir}vw`, opacity: 1 });

                // Initialize HTML & Webflow
                if (c.querySelector('.catalog-list_item')) {
                    // Pass true to skip instant intro, let Barba finish sliding first
                    PortfolioGallery.init(c, true);
                }

                try {
                    if (window.Webflow) {
                        window.Webflow.destroy(); 
                        window.Webflow.ready();   
                        if (window.Webflow.require('dropdown')) window.Webflow.require('dropdown').ready();
                        if (window.Webflow.require('ix2')) window.Webflow.require('ix2').init();
                        document.dispatchEvent(new Event('readystatechange'));
                    }
                } catch (e) {
                    devLog('BARBA: enter init error:', e);
                }

                // Slide the new page into the center
                gsap.to(c, { 
                    x: '0vw', 
                    duration: 0.8, 
                    ease: "power3.out",
                    onComplete: () => {
                        gsap.set(c, { clearProps: 'position,top,left,width,zIndex,x,opacity' });
                        updateHUD(); 
                        // Once the page is locked in, trigger the internal spatial intro
                        if (c.querySelector('.catalog-list_item')) {
                            PortfolioGallery.playIntro(dir);
                        }
                    }
                });
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
   4. SYSTEM BOOT
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initHUD();
    const canvas = document.getElementById('hexCanvas');
    if (canvas) { initHexEngine(canvas); window.addEventListener('resize', handleHexResize); }

    const container = document.querySelector('[data-barba-namespace="catalog"]');
    // If user lands directly on Catalog (no Barba), default to dir=1
    if (container) PortfolioGallery.init(container, false, 1);

    initBarba();
});