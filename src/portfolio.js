/**
 * Module: Portfolio Gallery
 * Description: Manages Spatial Entrance Sequences, Filtering, and Dropdowns.
 */

export const PortfolioGallery = (() => {
    const state = { activeYear: 'All', activeCat: 'All', activeCardIndex: null, lastPos: null, isListView: false, listeners: [], _initialised: false, _hoverFadeTimer: null, resizeTimer: null, isTransitioning: false, _lastBreakpoint: null };
    const CONFIG = { timing: { cardIntroDelay: 0, cardIntroStagger: 0.15, maxDelay: 0.8 }, styling: { lineDuration: 0.4, textDuration: 0.5, textStagger: 0.1, imageFadeDuration: 0.6, easeMain: 'power3.out', easeLines: 'power2.inOut' }, colors: { primary: 'var(--grv-primary, #0d9488)', contrast: 'var(--grv-contrast, #e2572b)', activeWhite: 'rgba(255, 255, 255, 1)', disabledGrey: 'rgba(255, 255, 255, 0.25)' } };
    
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
            
            // Your exact requested sequence
            const img = gsap.utils.toArray(card.querySelectorAll('.catalog-card_image'));
            const content = gsap.utils.toArray(card.querySelectorAll('.catalog-card_content'));
            const details = gsap.utils.toArray(card.querySelectorAll('.card_details_container'));
            const hoverEl = card.querySelector('.catalog-card_hover-overlay');

            const startX = dir * 40; 

            // Safely reset states without breaking Flexbox
            if(top.c.length) gsap.set([top.c, bottom.c], { scaleX: 0 });
            if(top.l.length) gsap.set([top.l, bottom.l], { left: '50%', opacity: 0 });
            if(top.r.length) gsap.set([top.r, bottom.r], { right: '50%', opacity: 0 });
            if(img.length) gsap.set(img, { opacity: 0, x: startX });
            if(content.length) gsap.set(content, { opacity: 0, x: startX });
            if(details.length) gsap.set(details, { opacity: 0, x: startX });
            if(hoverEl) gsap.set(hoverEl, { display: 'none', opacity: 0 });

            const delay = Math.min(CONFIG.timing.cardIntroDelay + i * CONFIG.timing.cardIntroStagger, CONFIG.timing.maxDelay);
            const tl = gsap.timeline({ delay, onComplete: () => { card.style.pointerEvents = 'auto'; } });

            // 1. Horizontal Lines First
            if(top.l.length) tl.to(top.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.r.length) tl.to(top.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.c.length) tl.to(top.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);

            if (card.classList.contains('is-last-in-col') && bottomWrapper) {
                if(bottom.l.length) tl.to(bottom.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.r.length) tl.to(bottom.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.c.length) tl.to(bottom.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);
            }

            // 2. Image -> 3. Content -> 4. Details (Staggered respecting direction)
            tl.to(img, { opacity: 1, x: 0, duration: CONFIG.styling.imageFadeDuration, ease: CONFIG.styling.easeMain, clearProps: 'x' }, 0.3);
            tl.to(content, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x' }, 0.4);
            tl.to(details, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x' }, 0.5);
        });
    };

    const updateDropdownStates = () => { /* ... */ };
    const applyFilters = () => { /* ... */ };
    const setViewMode = (isList) => { /* ... */ };
    const setupCustomDropdowns = (context) => { /* ... */ };

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
            gsap.set(context.querySelectorAll('.header_paragraph'), { opacity: 0 });
            gsap.set(context.querySelectorAll('.catalog-header_heading .line_v-c'), { scaleY: 0 });
            gsap.set(context.querySelectorAll('.card_header > .line-horizontal > .line_h-c'), { scaleX: 0 });
            gsap.set(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_l'), { opacity: 0, left: '50%' });
            gsap.set(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_r'), { opacity: 0, right: '50%' });

            const images = gsap.utils.toArray(context.querySelectorAll('.catalog-card_image'));
            const textEls = gsap.utils.toArray(context.querySelectorAll('.catalog-card_content, .card_details_container'));
            if(images.length) gsap.set(images, { opacity: 0 });
            if(textEls.length) gsap.set(textEls, { opacity: 0 }); 

            const lineCenters = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-c'));
            const lineCapsL = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-cap_l'));
            const lineCapsR = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-cap_r'));
            if (lineCenters.length) gsap.set(lineCenters, { scaleX: 0 });
            if (lineCapsL.length) gsap.set(lineCapsL, { opacity: 0, left: '50%' });
            if (lineCapsR.length) gsap.set(lineCapsR, { opacity: 0, right: '50%' });
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

        // 1. Title Vertical Line 
        const vLine = context.querySelector('.catalog-header_heading .line_v-c');
        if (vLine) tl.to(vLine, { scaleY: 1, duration: 0.5, ease: "power2.out" }, 0);

        // 2. Paragraph CSS Clip-Path Typewriter
        const p = context.querySelector('.header_paragraph');
        if (p) {
            gsap.set(p, { opacity: 1 }); 
            const clipStart = dir === 1 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
            gsap.fromTo(p, { clipPath: clipStart }, { clipPath: 'inset(0 0% 0 0)', duration: 1.0, ease: "steps(30)" }, 0.2);
        }

        // 3. Card Header Main Horizontal Lines
        const headerHCenters = gsap.utils.toArray(context.querySelectorAll('.card_header > .line-horizontal > .line_h-c'));
        const headerHL = gsap.utils.toArray(context.querySelectorAll('.card_header > .line-horizontal > .line_h-cap_l'));
        const headerHR = gsap.utils.toArray