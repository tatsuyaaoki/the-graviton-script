/**
 * Module: Portfolio Gallery
 * Description: Manages Spatial Entrance Sequences, Filtering, and Dropdowns.
 */

export const PortfolioGallery = (() => {
    const state = { activeYear: 'All', activeCat: 'All', activeCardIndex: null, lastPos: null, isListView: false, listeners: [], _initialised: false, _hoverFadeTimer: null, resizeTimer: null, isTransitioning: false, _lastBreakpoint: null };
    const CONFIG = { timing: { cardIntroDelay: 0, cardIntroStagger: 0.1, maxDelay: 0.5 }, styling: { lineDuration: 0.5, textDuration: 0.4, textStagger: 0.08, imageFadeDuration: 0.6, easeMain: 'power2.out', easeLines: 'expo.inOut' }, colors: { primary: 'var(--grv-primary, #0d9488)', contrast: 'var(--grv-contrast, #e2572b)', activeWhite: 'rgba(255, 255, 255, 1)', disabledGrey: 'rgba(255, 255, 255, 0.25)' } };
    let els = {};

    const getBreakpoint = (w) => w > 991 ? 'lg' : w > 767 ? 'md' : 'sm';
    const addListener = (el, type, fn, options = false) => { if (!el) return; el.addEventListener(type, fn, options); state.listeners.push({ el, type, fn, options }); };

    const teardown = () => { /* ... (Remains identical to previous version) ... */ 
        clearTimeout(state.resizeTimer); clearTimeout(state._hoverFadeTimer);
        if (els && els.cards) { els.cards.forEach(card => { const allEls = gsap.utils.toArray(card.querySelectorAll('*')); if(allEls.length) { gsap.killTweensOf(allEls); gsap.set(allEls, { clearProps: 'all' }); } card.querySelectorAll('.catalog-card_image').forEach(img => { img.style.transform = ''; img.style.opacity = ''; img.style.scale = ''; }); card.style.pointerEvents = ''; }); }
        state.listeners.forEach(l => { if (l.el) l.el.removeEventListener(l.type, l.fn, l.options); });
        state.listeners = []; state._initialised = false; state.isTransitioning = false; els = {};
    };

    const handleHover = (index, isEnter, card, visibleItems) => { /* ... (Remains identical) ... */ 
        const hoverEl = card.querySelector('.catalog-card_hover-overlay') || card.querySelector('.card_hover');
        if (!hoverEl || card.style.pointerEvents === 'none') return;
        if (isEnter) { clearTimeout(state._hoverFadeTimer); const rect = card.getBoundingClientRect(); const currentPos = { left: rect.left + window.scrollX, top: rect.top + window.scrollY }; let dirX = 0, dirY = 0; if (state.lastPos) { const dx = currentPos.left - state.lastPos.left; const dy = currentPos.top - state.lastPos.top; dirX = dx > 10 ? 1 : dx < -10 ? -1 : 0; dirY = dy > 10 ? 1 : dy < -10 ? -1 : 0; } if (state.activeCardIndex !== null && state.activeCardIndex !== index) { const prevHover = visibleItems[state.activeCardIndex]?.querySelector('.catalog-card_hover-overlay') || visibleItems[state.activeCardIndex]?.querySelector('.card_hover'); if (prevHover) { gsap.to(prevHover, { x: `${dirX * 100}%`, y: `${dirY * 100}%`, duration: 0.3, ease: 'power2.inOut', onComplete: () => gsap.set(prevHover, { display: 'none' }) }); } } gsap.killTweensOf(hoverEl); gsap.set(hoverEl, { display: 'block', opacity: 1, x: `${dirX * -100}%`, y: `${dirY * -100}%` }); gsap.to(hoverEl, { x: '0%', y: '0%', duration: 0.35, ease: 'power2.out' }); state.lastPos = currentPos; state.activeCardIndex = index; } else { state._hoverFadeTimer = setTimeout(() => { if (state.activeCardIndex === index) { gsap.to(hoverEl, { opacity: 0, duration: 0.3, onComplete: () => gsap.set(hoverEl, { display: 'none', opacity: 1 }) }); state.activeCardIndex = null; } }, 50); }
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
            const hoverEl = card.querySelector('.catalog-card_hover-overlay');

            const getLineParts = (wrapper) => wrapper ? { c: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-c')), l: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-cap_l')), r: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-cap_r')) } : { c: [], l: [], r: [] };

            const top = getLineParts(topWrapper);
            const bottom = getLineParts(bottomWrapper);
            const img = gsap.utils.toArray(card.querySelectorAll('.catalog-card_image'));
            const text = gsap.utils.toArray(card.querySelectorAll('.card_title, .card_category, .info_value, .card_detail'));

            const allTargets = [...top.c, ...top.l, ...top.r, ...bottom.c, ...bottom.l, ...bottom.r, ...img, ...text];
            if (hoverEl) allTargets.push(hoverEl);

            if(allTargets.length) { gsap.killTweensOf(allTargets); gsap.set(allTargets, { clearProps: 'all' }); }

            // Apply SPATIAL direction logic to the text entrance
            const startX = dir * 30; // Slide from direction of entry

            if(top.c.length) gsap.set([top.c, bottom.c], { scaleX: 0 });
            if(top.l.length) gsap.set([top.l, bottom.l], { left: '50%', opacity: 0 });
            if(top.r.length) gsap.set([top.r, bottom.r], { right: '50%', opacity: 0 });
            if(img.length) gsap.set(img, { opacity: 0 });
            if(text.length) gsap.set(text, { opacity: 0, x: startX }); // Start X position
            if(hoverEl) gsap.set(hoverEl, { display: 'none', opacity: 0 });

            const delay = Math.min(CONFIG.timing.cardIntroDelay + i * CONFIG.timing.cardIntroStagger, CONFIG.timing.maxDelay);
            const tl = gsap.timeline({ delay, onComplete: () => { card.style.pointerEvents = 'auto'; } });

            if(top.l.length) tl.to(top.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.r.length) tl.to(top.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.c.length) tl.to(top.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);

            if (card.classList.contains('is-last-in-col') && bottomWrapper) {
                if(bottom.l.length) tl.to(bottom.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.r.length) tl.to(bottom.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.c.length) tl.to(bottom.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);
            }

            if(img.length) tl.to(img, { opacity: 1, duration: CONFIG.styling.imageFadeDuration, ease: 'none' }, 0.3);
            if(text.length) tl.to(text, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, stagger: CONFIG.styling.textStagger, ease: CONFIG.styling.easeMain }, 0.4);
        });
    };

    const updateDropdownStates = () => { /* ... (Remains identical) ... */ };
    const applyFilters = () => { /* ... (Remains identical) ... */ };
    const setViewMode = (isList) => { /* ... (Remains identical) ... */ };
    const setupCustomDropdowns = (context) => { /* ... (Remains identical) ... */ };

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

        // 1. PRE-SET: Hide Everything Except Title
        if (skipIntro) {
            // Hide Header elements
            gsap.set('.header_paragraph', { opacity: 0 });
            gsap.set('.catalog-header_heading .line_v-c', { scaleY: 0 });
            gsap.set('.card_header > .line-horizontal > .line_h-c', { scaleX: 0 });
            gsap.set('.card_header > .line-horizontal > .line_h-cap_l', { opacity: 0, left: '50%' });
            gsap.set('.card_header > .line-horizontal > .line_h-cap_r', { opacity: 0, right: '50%' });

            // Hide Cards
            const images = gsap.utils.toArray(context.querySelectorAll('.catalog-card_image'));
            if(images.length) gsap.set(images, { opacity: 0 });

            const textEls = gsap.utils.toArray(context.querySelectorAll('.card_title, .card_category, .info_value, .card_detail'));
            if(textEls.length) gsap.set(textEls, { opacity: 0 }); // Y offset removed, will be driven by X later

            const lineCenters = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-c'));
            const lineCapsL = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-cap_l'));
            const lineCapsR = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-cap_r'));
            
            if (lineCenters.length) gsap.set(lineCenters, { scaleX: 0 });
            if (lineCapsL.length) gsap.set(lineCapsL, { opacity: 0, left: '50%' });
            if (lineCapsR.length) gsap.set(lineCapsR, { opacity: 0, right: '50%' });
        }

        // ... (Data stamping logic omitted for brevity, keeping it identical to previous code) ...

        if (!skipIntro) {
            requestAnimationFrame(() => {
                playIntro(overrideDir); // Play the full intro immediately if direct load
                setTimeout(() => window.ScrollTrigger?.refresh(), 450);
            });
        }
    };

    // --- THE SPATIAL INTRO SEQUENCE ---
    const playIntro = (dir = 1) => {
        state.isTransitioning = false;
        const tl = gsap.timeline();

        // 1. Title Vertical Line 
        tl.to('.catalog-header_heading .line_v-c', { scaleY: 1, duration: 0.5, ease: "power2.out" }, 0);

        // 2. Paragraph CSS Clip-Path Typewriter
        const p = document.querySelector('.header_paragraph');
        if (p) {
            // Reset opacity from init
            gsap.set(p, { opacity: 1 }); 
            // Types Left-to-Right if dir=1, Right-to-Left if dir=-1
            const clipStart = dir === 1 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
            gsap.fromTo(p, 
                { clipPath: clipStart }, 
                { clipPath: 'inset(0 0% 0 0)', duration: 1.0, ease: "steps(30)" }, 0.2
            );
        }

        // 3. Card Header Main Horizontal Lines
        const headerHCenters = gsap.utils.toArray('.card_header > .line-horizontal > .line_h-c');
        const headerHL = gsap.utils.toArray('.card_header > .line-horizontal > .line_h-cap_l');
        const headerHR = gsap.utils.toArray('.card_header > .line-horizontal > .line_h-cap_r');
        
        if (headerHL.length) tl.to(headerHL, { left: '0%', opacity: 1, duration: 0.5, ease: "power2.out" }, 0.4);
        if (headerHR.length) tl.to(headerHR, { right: '0%', opacity: 1, duration: 0.5, ease: "power2.out" }, 0.4);
        if (headerHCenters.length) tl.to(headerHCenters, { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.6);

        // 4. Staggered Toolbar Items (Spatial Logic)
        const headerTargets = [
            document.querySelector('#vertical_line_filter_1'),
            document.querySelector('#filter_item_1'),
            document.querySelector('#vertical_line_filter_2'),
            document.querySelector('#filter_item_2'),
            document.querySelector('#vertical_line_filter_3'),
            document.querySelector('#vertical_line_view_2'),
            document.querySelector('.list-btn'),
            document.querySelector('.grid-btn'),
            document.querySelector('#vertical_line_view_3')
        ].filter(Boolean);

        // If entered from Left (dir = -1), stagger from Right-to-Left
        const targets = dir === -1 ? [...headerTargets].reverse() : headerTargets;
        const startX = dir * 30; 

        gsap.set(targets, { x: startX, opacity: 0 });
        tl.to(targets, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, 0.8);

        // 5. Fire the Card Sequence
        tl.add(() => playCardAnimations(dir), 1.0);
    };

    return { init, teardown, playIntro };
})();