/**
 * Module: Portfolio Gallery (portfolio.js)
 * Description: Manages Concurrent Spatial Sequences with Deep Telemetry.
 *
 * FIXES (v10):
 *   FIX-1: `processNode` — declared as a proper hoisted `function` declaration
 *           and wired correctly inside `splitTextNodes`. Was a phantom call to
 *           an undefined identifier, crashing DOMContentLoaded entirely.
 *   FIX-2: `setupCustomDropdowns`, `applyFilters`, `setViewMode` — fully
 *           implemented with real event listeners. Header options (filters,
 *           view toggles) now work on both first load and Barba re-entry.
 *   FIX-3: `playIntro` — removed from Barba `enter()` in app.js and integrated
 *           into the slide `onComplete` callback so animations only fire after
 *           the container has landed at x:0. Header lines, card lines, and
 *           typewriter now all sequence correctly post-transition.
 */

export const PortfolioGallery = (() => {

    /* -------------------------------------------------------------------------
       STATE & CONFIG
    ------------------------------------------------------------------------- */
    const state = {
        activeYear: 'All',
        activeCat: 'All',
        activeCardIndex: null,
        lastPos: null,
        isListView: false,
        listeners: [],
        _initialised: false,
        _hoverFadeTimer: null,
        resizeTimer: null,
        isTransitioning: false,
        _lastBreakpoint: null
    };

    const CONFIG = {
        timing:   { cardIntroStagger: 0.1 },
        styling:  {
            lineDuration:      0.4,
            textDuration:      0.5,
            imageFadeDuration: 0.6,
            easeMain:          'power3.out',
            easeLines:         'power2.inOut'
        },
        colors: {
            primary:      'var(--grv-primary, #0d9488)',
            contrast:     'var(--grv-contrast, #e2572b)',
            activeWhite:  'rgba(255, 255, 255, 1)',
            disabledGrey: 'rgba(255, 255, 255, 0.25)'
        }
    };

    const devLog = (...args) => console.log(...args);
    let els = {};

    /* -------------------------------------------------------------------------
       UTILITIES
    ------------------------------------------------------------------------- */
    const getBreakpoint = (w) => w > 991 ? 'lg' : w > 767 ? 'md' : 'sm';

    const addListener = (el, type, fn, options = false) => {
        if (!el) return;
        el.addEventListener(type, fn, options);
        state.listeners.push({ el, type, fn, options });
    };

    /* -------------------------------------------------------------------------
       TEARDOWN
    ------------------------------------------------------------------------- */
    const teardown = () => {
        clearTimeout(state.resizeTimer);
        clearTimeout(state._hoverFadeTimer);

        if (els && els.cards) {
            els.cards.forEach(card => {
                const allEls = gsap.utils.toArray(card.querySelectorAll('*'));
                if (allEls.length) {
                    gsap.killTweensOf(allEls);
                    gsap.set(allEls, { clearProps: 'opacity,x,y,transform,scaleX,scaleY,left,right,top,bottom' });
                }
                card.style.pointerEvents = '';
                card.onmouseenter = null;
                card.onmouseleave = null;
            });
        }

        state.listeners.forEach(l => {
            if (l.el) l.el.removeEventListener(l.type, l.fn, l.options);
        });

        state.listeners      = [];
        state._initialised   = false;
        state.isTransitioning = false;
        state.activeYear     = 'All';
        state.activeCat      = 'All';
        els = {};
    };

    /* -------------------------------------------------------------------------
       FIX-1: TEXT SPLITTER
       `processNode` is now a proper function declaration — hoisted to the top
       of the IIFE scope. `splitTextNodes` can reference it safely regardless
       of execution order.
    ------------------------------------------------------------------------- */

    /**
     * Recursively processes a DOM node, wrapping individual characters in
     * animatable <span> elements. Handles mixed content (text nodes + elements).
     *
     * @param {Node} node - A child node to process
     */
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Snapshot the text before we mutate anything
            const text = node.nodeValue;
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === ' ' || char === '\n') {
                    // Preserve whitespace as raw text nodes (no span wrapping)
                    fragment.appendChild(document.createTextNode(char));
                } else {
                    const span = document.createElement('span');
                    span.style.opacity = '0';
                    span.style.display = 'inline-block';
                    span.textContent   = char;
                    fragment.appendChild(span);
                }
            }

            // Safe replacement — node.parentNode is always valid here because
            // we snapshot childNodes before iterating in splitTextNodes
            node.parentNode.replaceChild(fragment, node);

        } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() !== 'br') {
            // Recurse into child elements to handle inline tags like <em>, <strong>
            // Snapshot first — live NodeList mutation during iteration causes skips
            Array.from(node.childNodes).forEach(child => processNode(child));
        }
    }

    /**
     * Splits all text content within an element into individually animatable spans.
     * Guards against double-splitting via data attribute.
     *
     * @param {HTMLElement} element
     */
    const splitTextNodes = (element) => {
        if (!element || element.dataset.split === 'true') return;
        element.dataset.split = 'true';

        devLog(`[GRV:SPLITTER] Target element text:`, element.innerText);

        // Snapshot childNodes into a static array BEFORE any mutation.
        // Iterating a live NodeList while replacing nodes causes nodes to be skipped.
        const staticNodes = Array.from(element.childNodes);
        staticNodes.forEach(node => processNode(node));

        devLog(`[GRV:SPLITTER] Split completed. Found ${element.querySelectorAll('span').length} spans.`);
    };

    /* -------------------------------------------------------------------------
       HOVER HANDLER
    ------------------------------------------------------------------------- */
    const handleHover = (index, isEnter, card, visibleItems) => {
        const hoverEl = card.querySelector('.catalog-card_hover-overlay');
        if (!hoverEl || card.style.pointerEvents === 'none') return;

        if (isEnter) {
            clearTimeout(state._hoverFadeTimer);
            const rect       = card.getBoundingClientRect();
            const currentPos = { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
            let dirX = 0, dirY = 0;

            if (state.lastPos) {
                const dx = currentPos.left - state.lastPos.left;
                const dy = currentPos.top  - state.lastPos.top;
                dirX = dx > 10 ? 1 : dx < -10 ? -1 : 0;
                dirY = dy > 10 ? 1 : dy < -10 ? -1 : 0;
            }

            if (state.activeCardIndex !== null && state.activeCardIndex !== index) {
                const prevHover = visibleItems[state.activeCardIndex]?.querySelector('.catalog-card_hover-overlay');
                if (prevHover) {
                    gsap.to(prevHover, {
                        x: `${dirX * 100}%`,
                        y: `${dirY * 100}%`,
                        duration: 0.3,
                        ease: 'power2.inOut',
                        onComplete: () => gsap.set(prevHover, { display: 'none' })
                    });
                }
            }

            gsap.killTweensOf(hoverEl);
            gsap.set(hoverEl, { display: 'block', opacity: 1, x: `${dirX * -100}%`, y: `${dirY * -100}%` });
            gsap.to(hoverEl, { x: '0%', y: '0%', duration: 0.35, ease: 'power2.out' });

            state.lastPos        = currentPos;
            state.activeCardIndex = index;

        } else {
            state._hoverFadeTimer = setTimeout(() => {
                if (state.activeCardIndex === index) {
                    gsap.to(hoverEl, {
                        opacity: 0,
                        duration: 0.3,
                        onComplete: () => gsap.set(hoverEl, { display: 'none', opacity: 1 })
                    });
                    state.activeCardIndex = null;
                }
            }, 50);
        }
    };

    /* -------------------------------------------------------------------------
       FIX-2A: FILTER LOGIC
    ------------------------------------------------------------------------- */
    const applyFilters = () => {
        if (!els.mainItems) return;

        let visibleCount = 0;

        els.mainItems.forEach(item => {
            const itemYear = item.dataset.year || 'All';
            const itemCat  = item.dataset.category || 'All';

            const yearMatch = state.activeYear === 'All' || itemYear === state.activeYear;
            const catMatch  = state.activeCat  === 'All' || itemCat  === state.activeCat;

            if (yearMatch && catMatch) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        devLog(`[GRV:FILTER] Year: ${state.activeYear} | Cat: ${state.activeCat} | Visible: ${visibleCount}`);
        updateDropdownStates();
    };

    /* -------------------------------------------------------------------------
       FIX-2B: DROPDOWN STATE UPDATER
    ------------------------------------------------------------------------- */
    const updateDropdownStates = () => {
        // Year dropdown
        if (els.yearList) {
            els.yearList.querySelectorAll('.pg-dropdown-link').forEach(link => {
                const isActive = (link.dataset.value || link.textContent.trim()) === state.activeYear;
                link.classList.toggle('pg-active', isActive);
            });
        }

        // Category dropdown
        if (els.catList) {
            els.catList.querySelectorAll('.pg-dropdown-link').forEach(link => {
                const isActive = (link.dataset.value || link.textContent.trim()) === state.activeCat;
                link.classList.toggle('pg-active', isActive);
            });
        }

        // View toggle buttons
        if (els.listBtn) els.listBtn.classList.toggle('pg-active', state.isListView);
        if (els.gridBtn) els.gridBtn.classList.toggle('pg-active', !state.isListView);
    };

    /* -------------------------------------------------------------------------
       FIX-2C: VIEW MODE TOGGLE
    ------------------------------------------------------------------------- */
    const setViewMode = (isList) => {
        if (state.isListView === isList) return;
        state.isListView = isList;

        if (els.dynList) {
            els.dynList.classList.toggle('is-list', isList);
        }

        updateDropdownStates();
        devLog(`[GRV:VIEW] Mode set to: ${isList ? 'List' : 'Grid'}`);
    };

    /* -------------------------------------------------------------------------
       FIX-2D: CUSTOM DROPDOWN SETUP
       Wires click listeners for year/category filter dropdowns and view toggles.
       Uses `addListener` so all listeners are registered in state and properly
       torn down on Barba leave via `teardown()`.
    ------------------------------------------------------------------------- */
    const setupCustomDropdowns = (context) => {

        // --- YEAR FILTER ---
        if (els.yearList) {
            els.yearList.querySelectorAll('.pg-dropdown-link').forEach(link => {
                addListener(link, 'click', (e) => {
                    e.preventDefault();
                    state.activeYear = link.dataset.value || link.textContent.trim();
                    applyFilters();

                    // Close the Webflow dropdown
                    const toggle = context.querySelector('#year-dropdown-toggle');
                    if (toggle) toggle.click();
                });
            });
        }

        // --- CATEGORY FILTER ---
        if (els.catList) {
            els.catList.querySelectorAll('.pg-dropdown-link').forEach(link => {
                addListener(link, 'click', (e) => {
                    e.preventDefault();
                    state.activeCat = link.dataset.value || link.textContent.trim();
                    applyFilters();

                    const toggle = context.querySelector('#category-dropdown-toggle');
                    if (toggle) toggle.click();
                });
            });
        }

        // --- VIEW TOGGLE: LIST ---
        if (els.listBtn) {
            addListener(els.listBtn, 'click', () => setViewMode(true));
        }

        // --- VIEW TOGGLE: GRID ---
        if (els.gridBtn) {
            addListener(els.gridBtn, 'click', () => setViewMode(false));
        }

        // --- RESPONSIVE RESIZE GUARD ---
        const handleResize = () => {
            clearTimeout(state.resizeTimer);
            state.resizeTimer = setTimeout(() => {
                const bp = getBreakpoint(window.innerWidth);
                if (bp !== state._lastBreakpoint) {
                    state._lastBreakpoint = bp;
                    devLog(`[GRV:RESIZE] Breakpoint changed to: ${bp}`);
                    // Re-evaluate last-in-col markers
                    applyLastInColMarkers();
                }
            }, 150);
        };
        addListener(window, 'resize', handleResize);

        updateDropdownStates();
        devLog(`[GRV:DROPDOWNS] Event listeners attached.`);
    };

    /* -------------------------------------------------------------------------
       LAST-IN-COL MARKER (used by card animations for bottom border logic)
    ------------------------------------------------------------------------- */
    const applyLastInColMarkers = () => {
        if (!els.mainItems) return;
        const visibleItems = els.mainItems.filter(el => el.style.display !== 'none');
        const cols = state.isListView
            ? (window.innerWidth > 991 ? 2 : 1)
            : (window.innerWidth > 991 ? 3 : window.innerWidth > 767 ? 2 : 1);

        visibleItems.forEach(item => {
            const card = item.querySelector('.catalog-card_component');
            if (card) card.classList.remove('is-last-in-col');
        });

        const lastRowStart = visibleItems.length - (visibleItems.length % cols || cols);
        visibleItems.slice(lastRowStart).forEach(item => {
            const card = item.querySelector('.catalog-card_component');
            if (card) card.classList.add('is-last-in-col');
        });
    };

    /* -------------------------------------------------------------------------
       CARD ANIMATIONS
    ------------------------------------------------------------------------- */
    const playCardAnimations = (masterTl, dir) => {
        const visibleMain = els.mainItems.filter(el => el.style.display !== 'none');
        if (visibleMain.length === 0) return;

        let cols = state.isListView
            ? (window.innerWidth > 991 ? 2 : 1)
            : (window.innerWidth > 991 ? 3 : window.innerWidth > 767 ? 2 : 1);
        cols = Math.min(cols, visibleMain.length);

        devLog(`[ANIM: CARDS] Found ${visibleMain.length} visible cards to animate.`);

        visibleMain.forEach((item, i) => {
            const card = item.querySelector('.catalog-card_component');
            if (!card) return;

            card.style.pointerEvents = 'none';
            card.onmouseenter = () => handleHover(i, true, card, visibleMain);
            card.onmouseleave = () => handleHover(i, false, card, visibleMain);

            if (i >= (visibleMain.length - cols)) card.classList.add('is-last-in-col');

            const topWrapper    = card.querySelector('.horizontal_line_top');
            const bottomWrapper = card.querySelector('.horizontal_line_bottom');
            const isLastInCol   = card.classList.contains('is-last-in-col');

            const topC  = topWrapper    ? gsap.utils.toArray(topWrapper.querySelectorAll('.line_h-c'))     : [];
            const topL  = topWrapper    ? gsap.utils.toArray(topWrapper.querySelectorAll('.line_h-cap_l')) : [];
            const topR  = topWrapper    ? gsap.utils.toArray(topWrapper.querySelectorAll('.line_h-cap_r')) : [];
            const botC  = (isLastInCol && bottomWrapper) ? gsap.utils.toArray(bottomWrapper.querySelectorAll('.line_h-c'))     : [];
            const botL  = (isLastInCol && bottomWrapper) ? gsap.utils.toArray(bottomWrapper.querySelectorAll('.line_h-cap_l')) : [];
            const botR  = (isLastInCol && bottomWrapper) ? gsap.utils.toArray(bottomWrapper.querySelectorAll('.line_h-cap_r')) : [];

            const allC = [...topC, ...botC];
            const allL = [...topL, ...botL];
            const allR = [...topR, ...botR];

            const img     = gsap.utils.toArray(card.querySelectorAll('.catalog-card_image'));
            const content = gsap.utils.toArray(card.querySelectorAll('.catalog-card_content'));
            const details = gsap.utils.toArray(card.querySelectorAll('.card_details_container'));

            const startX    = dir * 30;
            const startTime = i * CONFIG.timing.cardIntroStagger;

            // Set initial states
            if (allC.length) gsap.set(allC, { scaleX: 0, transformOrigin: 'center center' });
            if (allL.length) gsap.set(allL, { left: '50%', opacity: 0, xPercent: -50 });
            if (allR.length) gsap.set(allR, { right: '50%', opacity: 0, xPercent: 50 });

            // Animate
            if (allL.length) masterTl.fromTo(allL, { left: '50%', opacity: 0, xPercent: -50 }, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if (allR.length) masterTl.fromTo(allR, { right: '50%', opacity: 0, xPercent: 50  }, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if (allC.length) masterTl.fromTo(allC, { scaleX: 0, transformOrigin: 'center center' }, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime + 0.1);

            if (img.length)     masterTl.fromTo(img,     { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.imageFadeDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.2);
            if (content.length) masterTl.fromTo(content, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration,      ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.3);
            if (details.length) masterTl.fromTo(details, { opacity: 0, x: startX }, {
                opacity: 1, x: 0,
                duration: CONFIG.styling.textDuration,
                ease: CONFIG.styling.easeMain,
                clearProps: 'x,transform',
                onComplete: () => { card.style.pointerEvents = 'auto'; }
            }, startTime + 0.4);
        });
    };

    /* -------------------------------------------------------------------------
       PLAY INTRO
       FIX-3: This function is no longer called from app.js after Barba.enter().
       It is called exclusively from within the Barba slide onComplete callback
       (wired in app.js) so it only fires once the container is fully settled
       at x:0. On first-load (skipIntro = false), init() calls it via rAF as before.
    ------------------------------------------------------------------------- */
    const playIntro = (context, dir = 1) => {
        state.isTransitioning = false;
        devLog(`[ANIM: START] === PLAY INTRO INITIATED (Dir: ${dir}) ===`);

        const masterTl = gsap.timeline({
            onComplete: () => devLog('[ANIM: END] === MASTER TIMELINE COMPLETED ===')
        });

        // 1. VERTICAL LINES
        const vCenters = gsap.utils.toArray(context.querySelectorAll('.line_v-c')).filter(el => !el.closest('.w-dropdown-list'));
        const vCapsT   = gsap.utils.toArray(context.querySelectorAll('.line_v-cap_t')).filter(el => !el.closest('.w-dropdown-list'));
        const vCapsB   = gsap.utils.toArray(context.querySelectorAll('.line_v-cap_b')).filter(el => !el.closest('.w-dropdown-list'));
        devLog(`[ANIM: VLINES] Centers: ${vCenters.length} | TopCaps: ${vCapsT.length} | BotCaps: ${vCapsB.length}`);

        if (vCapsT.length)   masterTl.fromTo(vCapsT,   { top: '50%', opacity: 0, yPercent: -50 }, { top: '0%',    opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
        if (vCapsB.length)   masterTl.fromTo(vCapsB,   { bottom: '50%', opacity: 0, yPercent: 50  }, { bottom: '0%', opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
        if (vCenters.length) masterTl.fromTo(vCenters, { scaleY: 0, transformOrigin: 'center center' }, {
            scaleY: 1, duration: 0.4, ease: 'power2.out',
            onStart:    () => devLog('[ANIM: VLINES] Scaling started'),
            onComplete: () => devLog('[ANIM: VLINES] Scaling complete')
        }, 0.1);

        // 2. TYPEWRITER
        const p = context.querySelector('.header_paragraph');
        if (p) {
            const chars = gsap.utils.toArray(p.querySelectorAll('span'));
            devLog(`[ANIM: TYPEWRITER] Spans found: ${chars.length}`);
            if (chars.length > 0) {
                masterTl.fromTo(chars, { opacity: 0 }, {
                    opacity: 1, duration: 0.05, stagger: 0.02, ease: 'none',
                    onStart:    () => devLog('[ANIM: TYPEWRITER] Typing started'),
                    onComplete: () => devLog('[ANIM: TYPEWRITER] Typing complete')
                }, 0);
            } else {
                devLog('[ANIM: TYPEWRITER] ERROR: No spans found — splitTextNodes may have failed.');
            }
        } else {
            devLog('[ANIM: TYPEWRITER] ERROR: .header_paragraph not found in context.');
        }

        // 3. HORIZONTAL LINES (header only — cards handled in playCardAnimations)
        const headerHCenters = gsap.utils.toArray(context.querySelectorAll('.line_h-c')).filter(el =>
            !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        const headerHL = gsap.utils.toArray(context.querySelectorAll('.line_h-cap_l')).filter(el =>
            !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        const headerHR = gsap.utils.toArray(context.querySelectorAll('.line_h-cap_r')).filter(el =>
            !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));

        devLog(`[ANIM: HLINES] Centers: ${headerHCenters.length} | LeftCaps: ${headerHL.length} | RightCaps: ${headerHR.length}`);

        if (headerHL.length)      masterTl.fromTo(headerHL,      { left: '50%',  opacity: 0, xPercent: -50 }, { left: '0%',  opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
        if (headerHR.length)      masterTl.fromTo(headerHR,      { right: '50%', opacity: 0, xPercent: 50  }, { right: '0%', opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
        if (headerHCenters.length) masterTl.fromTo(headerHCenters, { scaleX: 0, transformOrigin: 'center center' }, {
            scaleX: 1, duration: 0.4, ease: 'power2.out',
            onStart:    () => devLog('[ANIM: HLINES] Header scaling started'),
            onComplete: () => devLog('[ANIM: HLINES] Header scaling complete')
        }, 0.1);

        // 4. HEADER ITEMS CASCADE
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

        devLog(`[ANIM: HEADER ITEMS] Valid targets: ${headerTargets.length}/9`);

        if (headerTargets.length) {
            const targets = dir === -1 ? [...headerTargets].reverse() : headerTargets;
            targets.forEach((target, i) => {
                const startX = i === 0 ? 0 : (dir === 1 ? -15 : 15);
                masterTl.fromTo(target,
                    { opacity: 0, x: startX },
                    {
                        opacity: 1, x: 0,
                        duration: 0.4,
                        ease: 'power2.out',
                        clearProps: 'x,transform',
                        onStart: i === 0 ? () => devLog('[ANIM: HEADER ITEMS] Cascade started') : null
                    },
                    i * 0.05
                );
            });
        }

        // 5. CARDS
        playCardAnimations(masterTl, dir);
    };

    /* -------------------------------------------------------------------------
       INIT
    ------------------------------------------------------------------------- */
    const init = (context, skipIntro = false, overrideDir = 1) => {
        if (state._initialised) teardown();
        state._initialised    = true;
        state.isTransitioning = skipIntro;
        state._lastBreakpoint = getBreakpoint(window.innerWidth);

        els = {
            mainItems: Array.from(context.querySelectorAll('.catalog-list_item')),
            yearList:  context.querySelector('#year-dropdown-list'),
            catList:   context.querySelector('#category-dropdown-list'),
            listBtn:   context.querySelector('.list-btn'),
            gridBtn:   context.querySelector('.grid-btn'),
            dynList:   context.querySelector('.catalog-list_grid'),
            cards:     Array.from(context.querySelectorAll('.catalog-card_component'))
        };

        devLog(`[GRV:INIT] Cards: ${els.cards.length} | Items: ${els.mainItems.length} | skipIntro: ${skipIntro}`);

        // FIX-1: splitTextNodes now works because processNode is declared above
        const p = context.querySelector('.header_paragraph');
        if (p) splitTextNodes(p);

        // FIX-2: Wire all UI controls
        setupCustomDropdowns(context);

        // Set initial hidden states when coming in via Barba transition
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
                gsap.set(headerTargets, { opacity: 0, x: overrideDir * 30 });
            }

            // FIX-3: Do NOT call playIntro here when skipIntro = true.
            // app.js wires playIntro into the Barba slide onComplete so it fires
            // only after the container has fully settled at x:0.
            devLog(`[GRV:INIT] skipIntro=true — playIntro deferred to Barba onComplete.`);

        } else {
            // First-load path: container is already in position, play immediately
            requestAnimationFrame(() => {
                playIntro(context, overrideDir);
                setTimeout(() => window.ScrollTrigger?.refresh(), 450);
            });
        }
    };

    /* -------------------------------------------------------------------------
       PUBLIC API
    ------------------------------------------------------------------------- */
    return { init, teardown, playIntro };

})();