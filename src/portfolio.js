/**
 * Module: Portfolio Gallery
 * Description: Manages Concurrent Spatial Sequences with Deep Telemetry.
 */

export const PortfolioGallery = (() => {
    const state = { activeYear: 'All', activeCat: 'All', activeCardIndex: null, lastPos: null, isListView: false, listeners: [], _initialised: false, _hoverFadeTimer: null, resizeTimer: null, isTransitioning: false, _lastBreakpoint: null };
    const CONFIG = { 
        timing: { cardIntroStagger: 0.1 }, 
        styling: { lineDuration: 0.4, textDuration: 0.5, imageFadeDuration: 0.6, easeMain: 'power3.out', easeLines: 'power2.inOut' }, 
        colors: { primary: 'var(--grv-primary, #0d9488)', contrast: 'var(--grv-contrast, #e2572b)', activeWhite: 'rgba(255, 255, 255, 1)', disabledGrey: 'rgba(255, 255, 255, 0.25)' } 
    };
    
    // Always log in this diagnostic version
    const devLog = (...args) => console.log(...args);
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
                    gsap.set(allEls, { clearProps: 'opacity,x,y,transform,scaleX,scaleY,left,right,top,bottom' }); 
                } 
                card.style.pointerEvents = ''; 
            }); 
        }
        state.listeners.forEach(l => { if (l.el) l.el.removeEventListener(l.type, l.fn, l.options); });
        state.listeners = []; state._initialised = false; state.isTransitioning = false; els = {};
    };

    const handleHover = (index, isEnter, card, visibleItems) => { /* Omitted for brevity, kept identical to previous version internally */ 
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

        devLog(`[ANIM: CARDS] Found ${visibleMain.length} visible cards to animate.`);

        visibleMain.forEach((item, i) => {
            const card = item.querySelector('.catalog-card_component');
            if (!card) return;

            card.style.pointerEvents = 'none';
            card.onmouseenter = () => handleHover(i, true, card, visibleMain);
            card.onmouseleave = () => handleHover(i, false, card, visibleMain);
            if (i >= (visibleMain.length - cols)) card.classList.add('is-last-in-col');

            const topWrapper = card.querySelector('.horizontal_line_top');
            const bottomWrapper = card.querySelector('.horizontal_line_bottom');
            
            const topC = topWrapper ? gsap.utils.toArray(topWrapper.querySelectorAll('.line_h-c')) : [];
            const topL = topWrapper ? gsap.utils.toArray(topWrapper.querySelectorAll('.line_h-cap_l')) : [];
            const topR = topWrapper ? gsap.utils.toArray(topWrapper.querySelectorAll('.line_h-cap_r')) : [];
            
            const botC = (card.classList.contains('is-last-in-col') && bottomWrapper) ? gsap.utils.toArray(bottomWrapper.querySelectorAll('.line_h-c')) : [];
            const botL = (card.classList.contains('is-last-in-col') && bottomWrapper) ? gsap.utils.toArray(bottomWrapper.querySelectorAll('.line_h-cap_l')) : [];
            const botR = (card.classList.contains('is-last-in-col') && bottomWrapper) ? gsap.utils.toArray(bottomWrapper.querySelectorAll('.line_h-cap_r')) : [];

            const allC = [...topC, ...botC];
            const allL = [...topL, ...botL];
            const allR = [...topR, ...botR];

            const img = gsap.utils.toArray(card.querySelectorAll('.catalog-card_image'));
            const content = gsap.utils.toArray(card.querySelectorAll('.catalog-card_content'));
            const details = gsap.utils.toArray(card.querySelectorAll('.card_details_container'));

            const startX = dir * 30; 
            const startTime = i * CONFIG.timing.cardIntroStagger; 

            if(allC.length) gsap.set(allC, { scaleX: 0, transformOrigin: 'center center' });
            if(allL.length) gsap.set(allL, { left: '50%', opacity: 0, xPercent: -50 });
            if(allR.length) gsap.set(allR, { right: '50%', opacity: 0, xPercent: 50 });

            if(allL.length) masterTl.fromTo(allL, { left: '50%', opacity: 0, xPercent: -50 }, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if(allR.length) masterTl.fromTo(allR, { right: '50%', opacity: 0, xPercent: 50 }, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if(allC.length) masterTl.fromTo(allC, { scaleX: 0, transformOrigin: 'center center' }, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime + 0.1);

            if(img.length) masterTl.fromTo(img, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.imageFadeDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.2);
            if(content.length) masterTl.fromTo(content, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.3);
            if(details.length) masterTl.fromTo(details, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform', onComplete: () => { card.style.pointerEvents = 'auto'; } }, startTime + 0.4);
        });
    };

    const updateDropdownStates = () => { /* ... */ };
    const applyFilters = () => { /* ... */ };
    const setViewMode = (isList) => { /* ... */ };
    const setupCustomDropdowns = (context) => { /* Omitted for brevity */ };

    // --- DIAGNOSTIC TEXT SPLITTER ---
    const splitTextNodes = (element) => {
        if (!element || element.dataset.split === 'true') return;
        element.dataset.split = 'true';
        devLog(`[GRV:SPLITTER] Target element text:`, element.innerText);
        
        let newHTML = '';
        element.childNodes.forEach(node => {
            if (node.nodeType === 3) {
                const chars = node.nodeValue.split('');
                const fragment = document.createDocumentFragment();
                chars.forEach(c => {
                    if (c === ' ' || c === '\n') {
                        fragment.appendChild(document.createTextNode(c));
                    } else {
                        const span = document.createElement('span');
                        span.style.opacity = '0';
                        span.style.display = 'inline-block';
                        span.textContent = c;
                        fragment.appendChild(span);
                    }
                });
                node.parentNode.replaceChild(fragment, node);
            } else if (node.nodeType === 1 && node.nodeName.toLowerCase() !== 'br') {
                Array.from(node.childNodes).forEach(processNode);
            }
        });
        devLog(`[GRV:SPLITTER] Split completed. Found ${element.querySelectorAll('span').length} spans.`);
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

        const p = context.querySelector('.header_paragraph');
        if(p) splitTextNodes(p);

        if (skipIntro) {
            gsap.set(context.querySelectorAll('header .line_v-c'), { scaleY: 0, transformOrigin: 'center center' });
            gsap.set(context.querySelectorAll('header .line_v-cap_t'), { opacity: 0, top: '50%', yPercent: -50 });
            gsap.set(context.querySelectorAll('header .line_v-cap_b'), { opacity: 0, bottom: '50%', yPercent: 50 });

            gsap.set(context.querySelectorAll('header .line_h-c, .catalog-card_component .line_h-c'), { scaleX: 0, transformOrigin: 'center center' });
            gsap.set(context.querySelectorAll('header .line_h-cap_l, .catalog-card_component .line_h-cap_l'), { opacity: 0, left: '50%', xPercent: -50 });
            gsap.set(context.querySelectorAll('header .line_h-cap_r, .catalog-card_component .line_h-cap_r'), { opacity: 0, right: '50%', xPercent: 50 });

            gsap.set(context.querySelectorAll('.catalog-card_image, .catalog-card_content, .card_details_container'), { opacity: 0 });

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

        if (!skipIntro) {
            requestAnimationFrame(() => {
                playIntro(context, overrideDir); 
                setTimeout(() => window.ScrollTrigger?.refresh(), 450);
            });
        }
    };

    const playIntro = (context, dir = 1) => {
        state.isTransitioning = false;
        devLog(`[ANIM: START] === PLAY INTRO INITIATED (Dir: ${dir}) ===`);
        
        const masterTl = gsap.timeline({
            onComplete: () => devLog('[ANIM: END] === MASTER TIMELINE COMPLETED ===')
        });

        // 1. VERTICAL LINES
        const vCenters = gsap.utils.toArray(context.querySelectorAll('.line_v-c')).filter(el => !el.closest('.w-dropdown-list'));
        const vCapsT = gsap.utils.toArray(context.querySelectorAll('.line_v-cap_t')).filter(el => !el.closest('.w-dropdown-list'));
        const vCapsB = gsap.utils.toArray(context.querySelectorAll('.line_v-cap_b')).filter(el => !el.closest('.w-dropdown-list'));
        devLog(`[ANIM: VLINES] Targets found -> Centers: ${vCenters.length} | Top Caps: ${vCapsT.length} | Bot Caps: ${vCapsB.length}`);

        if (vCapsT.length) masterTl.fromTo(vCapsT, { top: '50%', opacity: 0, yPercent: -50 }, { top: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (vCapsB.length) masterTl.fromTo(vCapsB, { bottom: '50%', opacity: 0, yPercent: 50 }, { bottom: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (vCenters.length) {
            masterTl.fromTo(vCenters, { scaleY: 0, transformOrigin: 'center center' }, { 
                scaleY: 1, duration: 0.4, ease: "power2.out",
                onStart: () => devLog('[ANIM: VLINES] Vertical line scaling started'),
                onComplete: () => devLog('[ANIM: VLINES] Vertical line scaling complete')
            }, 0.1);
        }

        // 2. TYPEWRITER
        const p = context.querySelector('.header_paragraph');
        if (p) {
            const chars = gsap.utils.toArray(p.querySelectorAll('span'));
            devLog(`[ANIM: TYPEWRITER] Targets found -> Spans: ${chars.length}`);
            if (chars.length > 0) {
                masterTl.fromTo(chars, { opacity: 0 }, { 
                    opacity: 1, duration: 0.05, stagger: 0.02, ease: "none",
                    onStart: () => devLog('[ANIM: TYPEWRITER] Typing started'),
                    onComplete: () => devLog('[ANIM: TYPEWRITER] Typing complete')
                }, 0);
            } else {
                devLog('[ANIM: TYPEWRITER] ERROR: No spans found to animate.');
            }
        } else {
            devLog('[ANIM: TYPEWRITER] ERROR: .header_paragraph element not found in DOM.');
        }

        // 3. HORIZONTAL LINES (HEADER ONLY)
        const headerHCenters = gsap.utils.toArray(context.querySelectorAll('.line_h-c')).filter(el => !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        const headerHL = gsap.utils.toArray(context.querySelectorAll('.line_h-cap_l')).filter(el => !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        const headerHR = gsap.utils.toArray(context.querySelectorAll('.line_h-cap_r')).filter(el => !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        
        devLog(`[ANIM: HLINES] Targets found -> Centers: ${headerHCenters.length} | Left Caps: ${headerHL.length} | Right Caps: ${headerHR.length}`);

        if (headerHL.length) masterTl.fromTo(headerHL, { left: '50%', opacity: 0, xPercent: -50 }, { left: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (headerHR.length) masterTl.fromTo(headerHR, { right: '50%', opacity: 0, xPercent: 50 }, { right: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (headerHCenters.length) {
            masterTl.fromTo(headerHCenters, { scaleX: 0, transformOrigin: 'center center' }, { 
                scaleX: 1, duration: 0.4, ease: "power2.out",
                onStart: () => devLog('[ANIM: HLINES] Header horizontal line scaling started'),
                onComplete: () => devLog('[ANIM: HLINES] Header horizontal line scaling complete')
            }, 0.1);
        }

        // 4. HEADER ITEMS CASCADE
        const headerTargets = [
            context.querySelector('#vertical_line_filter_1'), context.querySelector('#filter_item_1'),
            context.querySelector('#vertical_line_filter_2'), context.querySelector('#filter_item_2'),
            context.querySelector('#vertical_line_filter_3'), context.querySelector('#vertical_line_view_2'),
            context.querySelector('.list-btn'), context.querySelector('.grid-btn'), context.querySelector('#vertical_line_view_3')
        ].filter(Boolean);

        devLog(`[ANIM: HEADER ITEMS] Valid targets found: ${headerTargets.length}/9`);

        if (headerTargets.length) {
            const targets = dir === -1 ? [...headerTargets].reverse() : headerTargets;
            targets.forEach((target, i) => {
                const startX = i === 0 ? 0 : (dir === 1 ? -15 : 15);
                masterTl.fromTo(target, 
                    { opacity: 0, x: startX }, 
                    { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", clearProps: "x,transform",
                      onStart: i === 0 ? () => devLog('[ANIM: HEADER ITEMS] Cascade started') : null
                    }, 
                    i * 0.05
                );
            });
        }

        // 5. CARDS
        playCardAnimations(masterTl, dir);
    };

    return { init, teardown, playIntro };
})();