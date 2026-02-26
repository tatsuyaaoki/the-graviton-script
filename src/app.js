/**
 * Module: Main Application Entry Point (app.js)
 * Description: Orchestrates Spatial Barba.js transitions with debug telemetry.
 */

import { initHexEngine, handleHexResize } from './hex-engine.js';
import { PortfolioGallery } from './portfolio.js';
import { initHUD, updateHUD } from './hud.js';

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io');
export const devLog = (...args) => { if (IS_DEV) console.log(...args); };

/* ==========================================================================
   1. SPATIAL ROUTE MAP
   ========================================================================== */
const routeMap = ['/', '/catalog', '/glitch']; 

function getRouteDirection(fromPath, toPath) {
    const normalize = (p) => p === '/' ? '/' : p.replace(/\/$/, '').split('?')[0];
    let fromIdx = routeMap.findIndex(r => normalize(fromPath).startsWith(r) && (r !== '/' || normalize(fromPath) === '/'));
    let toIdx = routeMap.findIndex(r => normalize(toPath).startsWith(r) && (r !== '/' || normalize(toPath) === '/'));

    if (fromIdx === -1) fromIdx = 0;
    if (toIdx === -1) toIdx = 1;

    return toIdx >= fromIdx ? 1 : -1;
}

/* ==========================================================================
   2. CANVAS BOOTSTRAP & HOVER
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
        // devLog('[GRV:HEX] Card hovered'); // Disabled temporarily to reduce log noise
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
                devLog('BARBA: leave() triggered');
                const done = this.async();
                const c = data.current.container;
                const dir = getRouteDirection(data.current.url.path, data.next.url.path);
                
                data.next.direction = dir; 

                if (c.getAttribute('data-barba-namespace') === 'catalog') {
                    PortfolioGallery.teardown();
                }

                gsap.to(c, { 
                    x: `${-100 * dir}vw`, 
                    opacity: 0, 
                    duration: 0.6, 
                    ease: "power3.inOut",
                    onComplete: () => {
                        window.scrollTo(0, 0);
                        gsap.set(c, { display: 'none' });
                        devLog('[GRV:DEBUG] Old container slid out and hidden.');
                        done();
                    }
                });
            },

            enter(data) {
                devLog('BARBA: enter() triggered');
                const c = data.next.container;
                const headerEl = document.querySelector('.header');
                const headerH = headerEl ? headerEl.offsetHeight : 50;
                const dir = data.next.direction || 1; 

                gsap.set(c, { position: 'fixed', top: headerH, left: 0, width: '100vw', zIndex: 2, x: `${100 * dir}vw`, opacity: 1 });

                // Check if we are actually loading a catalog page
                const isCatalog = c.querySelector('.catalog-list_item') !== null;
                devLog(`[GRV:DEBUG] Is this a Catalog page? ${isCatalog ? 'YES' : 'NO'}`);

                if (isCatalog) {
                    devLog('[GRV:DEBUG] Initializing PortfolioGallery state (skipIntro=true)');
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
                } catch (e) {}

                gsap.to(c, { 
                    x: '0vw', 
                    duration: 0.8, 
                    ease: "power3.out",
                    onComplete: () => {
                        devLog('BARBA: transition complete');
                        gsap.set(c, { clearProps: 'position,top,left,width,zIndex,x,opacity' });
                        updateHUD(); 

                        if (isCatalog) {
                            devLog('[GRV:DEBUG] Triggering playIntro() sequence...');
                            PortfolioGallery.playIntro(c, dir); // Passing container 'c' to safely scope queries
                        } else {
                            devLog('[GRV:DEBUG] Not a catalog page. Intro skipped.');
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
    if (container) {
        devLog('[GRV:DEBUG] Hard load detected. Firing direct init().');
        PortfolioGallery.init(container, false, 1);
    }

    initBarba();
});