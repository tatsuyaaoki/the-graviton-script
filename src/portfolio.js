/**
 * Module: Portfolio Gallery
 * Description: Manages Concurrent Spatial Sequences, Filtering, and Dropdowns.
 */

export const PortfolioGallery = (() => {
    const state = { activeYear: 'All', activeCat: 'All', activeCardIndex: null, lastPos: null, isListView: false, listeners: [], _initialised: false, _hoverFadeTimer: null, resizeTimer: null, isTransitioning: false, _lastBreakpoint: null };
    const CONFIG = { 
        timing: { cardIntroStagger: 0.1 }, 
        styling: { lineDuration: 0.4, textDuration: 0.5, imageFadeDuration: 0.6, easeMain: 'power3.out', easeLines: 'power2.inOut' }, 
        colors: { primary: 'var(--grv-primary, #0d9488)', contrast: 'var(--grv-contrast, #e2572b)', activeWhite: 'rgba(255, 255, 255, 1)', disabledGrey: 'rgba(255, 255, 255, 0.25)' } 
    };
    
    const devLog = (...args) => { if (window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io')) console.log(...args); };
    let els = {};

    const getBreakpoint = (w) => w > 991 ? 'lg' : w > 767 ? 'md' : 'sm';
    const addListener = (el, type, fn, options = false) => { if (!el) return; el.addEventListener(type, fn, options); state.listeners.push({ el, type, fn, options }); };

    const teardown = () => {  
        clearTimeout(state.resizeTimer); clearTimeout(state._hoverFadeTimer);
        if (els && els.cards) { 
            els.cards.forEach(card => { 
                const allEls = gsap.utils.toArray(card.querySelectorAll('*')); 
                if(allEls.length) { 
                    gsap.killTweensOf(allEls); 
                    // Safely clear ONLY transforms so Webflow Flexbox doesn't break
                    gsap.set(allEls, { clearProps: 'x,y,transform' }); 
                } 
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

    const playCardAnimations = (masterTl, dir) => {
        const visibleMain = els.mainItems.filter(el => el.style.display !== 'none');
        if (visibleMain.length === 0) return;

        let cols = state.isListView ? (window.innerWidth > 991 ? 2 : 1) : (window.innerWidth > 991 ? 3 : (window.innerWidth > 767 ? 2 : 1));
        cols = Math.min(cols, visibleMain.length);

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

            const startX = dir * 30; 
            const startTime = i * CONFIG.timing.cardIntroStagger; 

            // Hard reset to guarantee starting position
            if(top.c.length) gsap.set([top.c, bottom.c], { scaleX: 0 });
            if(top.l.length) gsap.set([top.l, bottom.l], { left: '50%', opacity: 0 });
            if(top.r.length) gsap.set([top.r, bottom.r], { right: '50%', opacity: 0 });

            // Animate Lines
            if(top.l.length) masterTl.fromTo(top.l, { left: '50%', opacity: 0 }, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if(top.r.length) masterTl.fromTo(top.r, { right: '50%', opacity: 0 }, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if(top.c.length) masterTl.fromTo(top.c, { scaleX: 0 }, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime + 0.1);

            if (card.classList.contains('is-last-in-col') && bottomWrapper) {
                if(bottom.l.length) masterTl.fromTo(bottom.l, { left: '50%', opacity: 0 }, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
                if(bottom.r.length) masterTl.fromTo(bottom.r, { right: '50%', opacity: 0 }, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
                if(bottom.c.length) masterTl.fromTo(bottom.c, { scaleX: 0 }, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime + 0.1);
            }

            // Animate Content (Cascading)
            if(img.length) masterTl.fromTo(img, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.imageFadeDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.2);
            if(content.length) masterTl.fromTo(content, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.3);
            if(details.length) masterTl.fromTo(details, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform', onComplete: () => { card.style.pointerEvents = 'auto'; } }, startTime + 0.4);
        });
    };

    const splitTextNodes = (element) => {
        if (!element || element.dataset.split === 'true') return;
        element.dataset.split = 'true';
        let newHTML = '';
        element.childNodes.forEach(node => {
            if (node.nodeType === 3) {
                const chars = node.textContent.split('');
                chars.forEach(c => {
                    if (c.trim() === '') newHTML += `<span>&nbsp;</span>`;
                    else newHTML += `<span style="opacity:0; display:inline-block;">${c}</span>`;
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
            // HARD PRE-SETS: Replaces the buggy CSS hide block
            const p = context.querySelector('.header_paragraph');
            if(p) splitTextNodes(p);

            gsap.set(context.querySelectorAll('header .line_v-c'), { scaleY: 0 });
            gsap.set(context.querySelectorAll('header .line_v-cap_t'), { opacity: 0, top: '50%' });
            gsap.set(context.querySelectorAll('header .line_v-cap_b'), { opacity: 0, bottom: '50%' });

            // Broadened Selector: Targets ALL horizontal lines inside the header
            gsap.set(context.querySelectorAll('header .line_h-c, .catalog-card_component .line_h-c'), { scaleX: 0 });
            gsap.set(context.querySelectorAll('header .line_h-cap_l, .catalog-card_component .line_h-cap_l'), { opacity: 0, left: '50%' });
            gsap.set(context.querySelectorAll('header .line_h-cap_r, .catalog-card_component .line_h-cap_r'), { opacity: 0, right: '50%' });

            gsap.set(context.querySelectorAll('.catalog-card_image, .catalog-card_content, .card_details_container'), { opacity: 0 });

            // Hide header cascade targets
            const headerTargets = [
                context.querySelector('#vertical_line_filter_1'), context.querySelector('#filter_item_1'),
                context.querySelector('#vertical_line_filter_2'), context.querySelector('#filter_item_2'),
                context.querySelector('#vertical_line_filter_3'), context.querySelector('#vertical_line_view_2'),
                context.querySelector('.list-btn'), context.querySelector('.grid-btn'), context.querySelector('#vertical_line_view_3')
            ].filter(Boolean);
            if (headerTargets.length) {
                const startX = overrideDir * 30;
                gsap.set(headerTargets, { opacity: 0, x: startX });
            }
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
        const masterTl = gsap.timeline();

        // 1. Title Vertical Line 
        const vCenters = gsap.utils.toArray(context.querySelectorAll('header .line_v-c'));
        const vCapsT = gsap.utils.toArray(context.querySelectorAll('header .line_v-cap_t'));
        const vCapsB = gsap.utils.toArray(context.querySelectorAll('header .line_v-cap_b'));

        if (vCapsT.length) masterTl.fromTo(vCapsT, { top: '50%', opacity: 0 }, { top: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (vCapsB.length) masterTl.fromTo(vCapsB, { bottom: '50%', opacity: 0 }, { bottom: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (vCenters.length) masterTl.fromTo(vCenters, { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: "power2.out" }, 0.1);

        // 2. Typewriter Effect
        const p = context.querySelector('.header_paragraph');
        if (p) {
            const chars = p.querySelectorAll('span');
            masterTl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.02, ease: "none" }, 0);
        }

        // 3. Header Horizontal Lines (Broadened query)
        const headerHCenters = gsap.utils.toArray(context.querySelectorAll('header .line_h-c'));
        const headerHL = gsap.utils.toArray(context.querySelectorAll('header .line_h-cap_l'));
        const headerHR = gsap.utils.toArray(context.querySelectorAll('header .line_h-cap_r'));
        
        if (headerHL.length) masterTl.fromTo(headerHL, { left: '50%', opacity: 0 }, { left: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (headerHR.length) masterTl.fromTo(headerHR, { right: '50%', opacity: 0 }, { right: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (headerHCenters.length) masterTl.fromTo(headerHCenters, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, 0.1);

        // 4. Header Items Cascade
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
            
            targets.forEach((target, i) => {
                const startX = i === 0 ? 0 : (dir === 1 ? -15 : 15);
                masterTl.fromTo(target, 
                    { opacity: 0, x: startX }, 
                    { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", clearProps: "x,transform" }, 
                    i * 0.05
                );
            });
        }

        // 5. Cards Sequence
        playCardAnimations(masterTl, dir);
    };

    // Need empty dummy funcs to prevent undefined errors if external scripts call them
    const setupCustomDropdowns = () => {};
    const applyFilters = () => {};
    const updateDropdownStates = () => {};

    return { init, teardown, playIntro };
})();