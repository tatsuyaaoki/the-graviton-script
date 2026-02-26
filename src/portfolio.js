/**
 * Module: Portfolio Gallery
 * Description: Manages Concurrent Spatial Sequences, Filtering, and Dropdowns.
 */

export const PortfolioGallery = (() => {
    const state = { activeYear: 'All', activeCat: 'All', activeCardIndex: null, lastPos: null, isListView: false, listeners: [], _initialised: false, _hoverFadeTimer: null, resizeTimer: null, isTransitioning: false, _lastBreakpoint: null };
    const CONFIG = { timing: { cardIntroDelay: 0, cardIntroStagger: 0.1, maxDelay: 0.8 }, styling: { lineDuration: 0.4, textDuration: 0.5, textStagger: 0.1, imageFadeDuration: 0.6, easeMain: 'power3.out', easeLines: 'power2.inOut' }, colors: { primary: 'var(--grv-primary, #0d9488)', contrast: 'var(--grv-contrast, #e2572b)', activeWhite: 'rgba(255, 255, 255, 1)', disabledGrey: 'rgba(255, 255, 255, 0.25)' } };
    
    const devLog = (...args) => { if (window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io')) console.log(...args); };
    let els = {};

    const getBreakpoint = (w) => w > 991 ? 'lg' : w > 767 ? 'md' : 'sm';
    const addListener = (el, type, fn, options = false) => { if (!el) return; el.addEventListener(type, fn, options); state.listeners.push({ el, type, fn, options }); };

    const teardown = () => {  
        clearTimeout(state.resizeTimer); clearTimeout(state._hoverFadeTimer);
        if (els && els.cards) { 
            els.cards.forEach(card => { 
                const allEls = gsap.utils.toArray(card.querySelectorAll('*')); 
                if(allEls.length) { gsap.killTweensOf(allEls); gsap.set(allEls, { clearProps: 'opacity,x,transform,clipPath' }); } 
                card.querySelectorAll('.catalog-card_image').forEach(img => { img.style.transform = ''; img.style.opacity = ''; img.style.scale = ''; }); 
                card.style.pointerEvents = ''; 
            }); 
        }
        state.listeners.forEach(l => { if (l.el) l.el.removeEventListener(l.type, l.fn, l.options); });
        state.listeners = []; state._initialised = false; state.isTransitioning = false; els = {};
    };

    const handleHover = (index, isEnter, card, visibleItems) => { 
        const hoverEl = card.querySelector('.catalog-card_hover-overlay');
        if (!hoverEl || card.style.pointerEvents === 'none') return;
        if (isEnter) { 
            clearTimeout(state._hoverFadeTimer); 
            const rect = card.getBoundingClientRect(); 
            const currentPos = { left: rect.left + window.scrollX, top: rect.top + window.scrollY }; 
            let dirX = 0, dirY = 0; 
            if (state.lastPos) { 
                const dx = currentPos.left - state.lastPos.left; const dy = currentPos.top - state.lastPos.top; 
                dirX = dx > 10 ? 1 : dx < -10 ? -1 : 0; dirY = dy > 10 ? 1 : dy < -10 ? -1 : 0; 
            } 
            if (state.activeCardIndex !== null && state.activeCardIndex !== index) { 
                const prevHover = visibleItems[state.activeCardIndex]?.querySelector('.catalog-card_hover-overlay'); 
                if (prevHover) { gsap.to(prevHover, { x: `${dirX * 100}%`, y: `${dirY * 100}%`, duration: 0.3, ease: 'power2.inOut', onComplete: () => gsap.set(prevHover, { display: 'none' }) }); } 
            } 
            gsap.killTweensOf(hoverEl); gsap.set(hoverEl, { display: 'block', opacity: 1, x: `${dirX * -100}%`, y: `${dirY * -100}%` }); gsap.to(hoverEl, { x: '0%', y: '0%', duration: 0.35, ease: 'power2.out' }); 
            state.lastPos = currentPos; state.activeCardIndex = index; 
        } else { 
            state._hoverFadeTimer = setTimeout(() => { 
                if (state.activeCardIndex === index) { gsap.to(hoverEl, { opacity: 0, duration: 0.3, onComplete: () => gsap.set(hoverEl, { display: 'none', opacity: 1 }) }); state.activeCardIndex = null; } 
            }, 50); 
        }
    };

    const playCardAnimations = (dir = 1) => {
        if (!els.mainItems) return;
        const visibleMain = els.mainItems.filter(el => el.style.display !== 'none');
        if (visibleMain.length === 0) return;

        let cols = state.isListView ? (window.innerWidth > 991 ? 2 : 1) : (window.innerWidth > 991 ? 3 : (window.innerWidth > 767 ? 2 : 1));
        cols = Math.min(cols, visibleMain.length);
        state.activeCardIndex = null;

        els.mainItems.forEach(item => { const card = item.querySelector('.catalog-card_component'); if (card) card.classList.remove('is-last-in-col'); });

        visibleMain.forEach((item, i) => {
            const card = item.querySelector('.catalog-card_component');
            if (!card) return;

            card.style.pointerEvents = 'none';
            card.onmouseenter = () => handleHover(i, true, card, visibleMain);
            card.onmouseleave = () => handleHover(i, false, card, visibleMain);
            if (i >= (visibleMain.length - cols)) card.classList.add('is-last-in-col');

            const topWrapper = card.querySelector('.horizontal_line_top');
            const bottomWrapper = card.querySelector('.horizontal_line_bottom');
            
            const getLineParts = (wrapper) => wrapper ? { c: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-c')), l: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-cap_l')), r: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-cap_r')) } : { c: [], l: [], r: [] };
            const top = getLineParts(topWrapper);
            const bottom = getLineParts(bottomWrapper);
            
            const img = gsap.utils.toArray(card.querySelectorAll('.catalog-card_image'));
            const content = gsap.utils.toArray(card.querySelectorAll('.catalog-card_content'));
            const details = gsap.utils.toArray(card.querySelectorAll('.card_details_container'));
            const hoverEl = card.querySelector('.catalog-card_hover-overlay');

            const startX = dir * 40; 

            if(top.c.length) gsap.set([top.c, bottom.c], { scaleX: 0 });
            if(top.l.length) gsap.set([top.l, bottom.l], { left: '50%', opacity: 0 });
            if(top.r.length) gsap.set([top.r, bottom.r], { right: '50%', opacity: 0 });
            if(img.length) gsap.set(img, { opacity: 0, x: startX });
            if(content.length) gsap.set(content, { opacity: 0, x: startX });
            if(details.length) gsap.set(details, { opacity: 0, x: startX });
            if(hoverEl) gsap.set(hoverEl, { display: 'none', opacity: 0 });

            // Ensure cards start animating ALONGSIDE the global sequence
            const delay = Math.min(CONFIG.timing.cardIntroDelay + i * CONFIG.timing.cardIntroStagger, CONFIG.timing.maxDelay);
            const tl = gsap.timeline({ delay, onComplete: () => { card.style.pointerEvents = 'auto'; } });

            // Horizontal Lines First
            if(top.l.length) tl.to(top.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.r.length) tl.to(top.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.c.length) tl.to(top.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);

            if (card.classList.contains('is-last-in-col') && bottomWrapper) {
                if(bottom.l.length) tl.to(bottom.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.r.length) tl.to(bottom.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.c.length) tl.to(bottom.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);
            }

            tl.to(img, { opacity: 1, x: 0, duration: CONFIG.styling.imageFadeDuration, ease: CONFIG.styling.easeMain, clearProps: 'x' }, 0.3);
            tl.to(content, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x' }, 0.4);
            tl.to(details, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x' }, 0.5);
        });
    };

    const updateDropdownStates = () => { /* ... */ };
    const applyFilters = () => { /* ... */ };
    const setViewMode = (isList) => { /* ... */ };
    const setupCustomDropdowns = (context) => { /* ... */ };

    // --- NEW: HTML Text Splitter for Typewriter Effect ---
    const splitTextNodes = (element) => {
        if (!element || element.dataset.split === 'true') return;
        element.dataset.split = 'true';
        let newHTML = '';
        element.childNodes.forEach(node => {
            if (node.nodeType === 3) { // Text Node
                const chars = node.textContent.split('');
                chars.forEach(c => {
                    if (c.trim() === '') newHTML += `<span>&nbsp;</span>`;
                    else newHTML += `<span style="opacity:0">${c}</span>`;
                });
            } else if (node.nodeName.toLowerCase() === 'br') {
                newHTML += '<br/>';
            }
        });
        element.innerHTML = newHTML;
    };

    const init = (context, skipIntro = false, overrideDir = 1) => {
        if (state._initialised) teardown();
        state._initialised = true;
        state.isTransitioning = skipIntro;
        state._lastBreakpoint = getBreakpoint(window.innerWidth);

        els = {
            mainItems: Array.from(context.querySelectorAll('.catalog-list_item')),
            yearList: context.querySelector('#year-dropdown-list'),
            catList: context.querySelector('#category-dropdown-list'),
            listBtn: context.querySelector('.list-btn'),
            gridBtn: context.querySelector('.grid-btn'),
            dynList: context.querySelector('.catalog-list_grid'),
            cards: Array.from(context.querySelectorAll('.catalog-card_component'))
        };

        if (skipIntro) {
            // Pre-split paragraph for typewriter
            const p = context.querySelector('.header_paragraph');
            if(p) { splitTextNodes(p); gsap.set(p, { opacity: 1 }); }

            // Vertical Line Resets (Now obeying Caps logic)
            gsap.set(context.querySelectorAll('.line_v-c'), { scaleY: 0 });
            gsap.set(context.querySelectorAll('.line_v-cap_t'), { opacity: 0, top: '50%' });
            gsap.set(context.querySelectorAll('.line_v-cap_b'), { opacity: 0, bottom: '50%' });

            // Horizontal Line Resets
            gsap.set(context.querySelectorAll('.card_header > .line-horizontal > .line_h-c, .catalog-card_component .line_h-c'), { scaleX: 0 });
            gsap.set(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_l, .catalog-card_component .line_h-cap_l'), { opacity: 0, left: '50%' });
            gsap.set(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_r, .catalog-card_component .line_h-cap_r'), { opacity: 0, right: '50%' });

            // Cards Content Resets
            gsap.set(context.querySelectorAll('.catalog-card_image, .catalog-card_content, .card_details_container'), { opacity: 0 }); 
        }

        els.mainItems.forEach(item => {
            let colVal = '';
            item.querySelectorAll('.card_detail').forEach(detail => {
                const label = detail.querySelector('.info_type')?.innerText.trim().toLowerCase();
                if (label?.includes('collection')) colVal = detail.querySelector('.info_value')?.innerText.trim();
            });
            const catVal = item.querySelector('.card_category')?.innerText.trim() || '';
            item.setAttribute('data-col', colVal || 'Other');
            item.setAttribute('data-cat', catVal || 'Other');
        });

        if (!skipIntro) {
            requestAnimationFrame(() => {
                playIntro(context, overrideDir); 
                setTimeout(() => window.ScrollTrigger?.refresh(), 450);
            });
        }
    };

    const playIntro = (context, dir = 1) => {
        state.isTransitioning = false;
        const tl = gsap.timeline();

        // 1. All Vertical Lines (Caps slide out -> Center scales)
        const vCenters = gsap.utils.toArray(context.querySelectorAll('.catalog-header_heading .line_v-c'));
        const vCapsT = gsap.utils.toArray(context.querySelectorAll('.catalog-header_heading .line_v-cap_t'));
        const vCapsB = gsap.utils.toArray(context.querySelectorAll('.catalog-header_heading .line_v-cap_b'));

        if (vCapsT.length) tl.to(vCapsT, { top: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0); // Start at 0
        if (vCapsB.length) tl.to(vCapsB, { bottom: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0); // Start at 0
        if (vCenters.length) tl.to(vCenters, { scaleY: 1, duration: 0.4, ease: "power2.out" }, 0.2);

        // 2. True Typewriter Effect
        const p = context.querySelector('.header_paragraph');
        if (p) {
            const chars = p.querySelectorAll('span');
            // Starts simultaneously at 0
            gsap.to(chars, { opacity: 1, duration: 0.05, stagger: 0.02, ease: "none" }, 0);
        }

        // 3. Card Header Horizontal Lines
        const headerHCenters = gsap.utils.toArray(context.querySelectorAll('.card_header > .line-horizontal > .line_h-c'));
        const headerHL = gsap.utils.toArray(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_l'));
        const headerHR = gsap.utils.toArray(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_r'));
        
        if (headerHL.length) tl.to(headerHL, { left: '0%', opacity: 1, duration: 0.5, ease: "power2.out" }, 0); // Start at 0
        if (headerHR.length) tl.to(headerHR, { right: '0%', opacity: 1, duration: 0.5, ease: "power2.out" }, 0); // Start at 0
        if (headerHCenters.length) tl.to(headerHCenters, { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.2);

        // 4. Spatial Stagger of Toolbar
        const headerTargets = [
            context.querySelector('#vertical_line_filter_1'),
            context.querySelector('#filter_item_1'),
            context.querySelector('#vertical_line_filter_2'),
            context.querySelector('#filter_item_2'),
            context.querySelector('#vertical_line_filter_3'),
            context.querySelector('#vertical_line_view_2'),
            context.querySelector('.list-btn'),
            context.querySelector('.grid-btn'),
            context.querySelector('#vertical_line_view_3')
        ].filter(Boolean);

        if (headerTargets.length) {
            const targets = dir === -1 ? [...headerTargets].reverse() : headerTargets;
            const startX = dir * 30; 
            
            gsap.set(targets, { x: startX, opacity: 0 });
            // Slide in simultaneously starting at 0
            tl.to(targets, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "x" }, 0);
        }

        // 5. Fire Cards (Cards have their own internal timeline that starts at 0 + stagger)
        tl.add(() => playCardAnimations(dir), 0);
    };

    return { init, teardown, playIntro };
})();