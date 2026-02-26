/**
 * Module: Portfolio Gallery
 * Description: Manages Concurrent Spatial Sequences, Filtering, and Dropdowns.
 * Update: Bulletproof Selectors, Physics Injection, and Recursive Text Splitter.
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
                    gsap.set(allEls, { clearProps: 'opacity,x,y,transform,scaleX,scaleY,left,right,top,bottom' }); 
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
            
            // Flatten Arrays to prevent GSAP Array-Nesting Errors
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

            // Physics Injected Directly into fromTo
            if(allL.length) masterTl.fromTo(allL, { left: '50%', opacity: 0, xPercent: -50 }, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if(allR.length) masterTl.fromTo(allR, { right: '50%', opacity: 0, xPercent: 50 }, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime);
            if(allC.length) masterTl.fromTo(allC, { scaleX: 0, transformOrigin: 'center center' }, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, startTime + 0.1);

            if(img.length) masterTl.fromTo(img, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.imageFadeDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.2);
            if(content.length) masterTl.fromTo(content, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform' }, startTime + 0.3);
            if(details.length) masterTl.fromTo(details, { opacity: 0, x: startX }, { opacity: 1, x: 0, duration: CONFIG.styling.textDuration, ease: CONFIG.styling.easeMain, clearProps: 'x,transform', onComplete: () => { card.style.pointerEvents = 'auto'; } }, startTime + 0.4);
        });
    };

    /* ==========================================================================
       UI CONTROLLERS (Dropdowns & Filters)
       ========================================================================== */
    const updateDropdownStates = () => {
        ['year', 'cat'].forEach(type => {
            const listEl = type === 'year' ? els.yearList : els.catList;
            if (!listEl) return;
            listEl.querySelectorAll('.w-dropdown-link').forEach(link => {
                const val = link.innerText;
                const isActive = val === (type === 'year' ? state.activeYear : state.activeCat);
                let exists = true;
                if (val !== 'All') {
                    exists = els.mainItems.some(item => {
                        const itemYear = item.getAttribute('data-col');
                        const itemCat = item.getAttribute('data-cat');
                        return type === 'year'
                            ? itemYear === val && (state.activeCat === 'All' || itemCat === state.activeCat)
                            : itemCat === val && (state.activeYear === 'All' || itemYear === state.activeYear);
                    });
                }
                if (isActive) {
                    link.dataset.state = 'active'; link.style.pointerEvents = 'auto'; link.style.cursor = 'pointer';
                    gsap.to(link, { color: CONFIG.colors.primary, opacity: 1, duration: 0.2, overwrite: 'auto' });
                } else if (!exists) {
                    link.dataset.state = 'disabled'; link.style.pointerEvents = 'none'; link.style.cursor = 'default';
                    gsap.to(link, { color: CONFIG.colors.disabledGrey, opacity: 0.5, duration: 0.2, overwrite: 'auto' });
                } else {
                    link.dataset.state = 'default'; link.style.pointerEvents = 'auto'; link.style.cursor = 'pointer';
                    gsap.to(link, { color: CONFIG.colors.activeWhite, opacity: 1, duration: 0.2, overwrite: 'auto' });
                }
            });
        });
    };

    const applyFilters = () => {
        els.mainItems.forEach(item => {
            const year = item.getAttribute('data-col');
            const cat = item.getAttribute('data-cat');
            const isVisible = (state.activeYear === 'All' || year === state.activeYear) && (state.activeCat === 'All' || cat === state.activeCat);
            item.style.display = isVisible ? 'block' : 'none';
        });
        updateDropdownStates();
        requestAnimationFrame(() => {
            if (!state.isTransitioning) {
                const tl = gsap.timeline();
                playCardAnimations(tl, 1);
                setTimeout(() => window.ScrollTrigger?.refresh(), 450);
            }
        });
    };

    const setViewMode = (isList) => {
        if (state.isListView === isList) return;
        state.isListView = isList;
        if (els.listBtn) els.listBtn.classList.toggle('is-hidden', isList);
        if (els.gridBtn) els.gridBtn.classList.toggle('is-hidden', !isList);
        if (els.dynList) els.dynList.classList.toggle('is-list', isList);
        els.cards.forEach(card => {
            card.classList.toggle('is-list', isList);
            card.querySelectorAll('.catalog-card_content, .card_title, .catalog-card_image, .card_details_container')
                .forEach(t => t.classList.toggle('is-list', isList));
        });
        applyFilters();
    };

    const setupCustomDropdowns = (context) => {
        const dropdownWrappers = context.querySelectorAll('.w-dropdown');
        dropdownWrappers.forEach(dropdown => {
            const toggle = dropdown.querySelector('.w-dropdown-toggle');
            const list = dropdown.querySelector('.w-dropdown-list');
            if (!toggle || !list) return;

            gsap.set(list, { display: 'none', opacity: 0, y: -10 });
            dropdown.dataset.customOpen = 'false';

            const handleToggleClick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const isOpen = dropdown.dataset.customOpen === 'true';

                dropdownWrappers.forEach(other => {
                    if (other !== dropdown && other.dataset.customOpen === 'true') {
                        const otherList = other.querySelector('.w-dropdown-list');
                        gsap.to(otherList, { opacity: 0, y: -10, duration: 0.2, onComplete: () => gsap.set(otherList, { display: 'none' }) });
                        other.dataset.customOpen = 'false';
                    }
                });

                if (!isOpen) {
                    gsap.set(list, { display: 'block' });
                    const tl = gsap.timeline();
                    tl.to(list, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
                    const cLine = list.querySelector('.line_h-c');
                    const lCap = list.querySelector('.line_h-cap_l');
                    const rCap = list.querySelector('.line_h-cap_r');
                    if (cLine && lCap && rCap) {
                        gsap.set(cLine, { scaleX: 0, transformOrigin: 'center center' }); 
                        gsap.set([lCap, rCap], { opacity: 0 });
                        tl.to([lCap, rCap], { opacity: 1, duration: 0.3 }, 0).to(cLine, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, 0.1);
                    }
                    dropdown.dataset.customOpen = 'true';
                } else {
                    gsap.to(list, { opacity: 0, y: -10, duration: 0.2, onComplete: () => gsap.set(list, { display: 'none' }) });
                    dropdown.dataset.customOpen = 'false';
                }
            };
            addListener(toggle, 'click', handleToggleClick);
        });

        const handleOutsideClick = (e) => {
            dropdownWrappers.forEach(dropdown => {
                if (dropdown.dataset.customOpen === 'true' && !dropdown.contains(e.target)) {
                    const list = dropdown.querySelector('.w-dropdown-list');
                    gsap.to(list, { opacity: 0, y: -10, duration: 0.2, onComplete: () => gsap.set(list, { display: 'none' }) });
                    dropdown.dataset.customOpen = 'false';
                }
            });
        };
        addListener(document, 'click', handleOutsideClick);
    };

    // --- RECURSIVE HTML TEXT SPLITTER ---
    const splitTextNodes = (element) => {
        if (!element || element.dataset.split === 'true') return;
        element.dataset.split = 'true';
        
        const processNode = (node) => {
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
        };
        Array.from(element.childNodes).forEach(processNode);
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
            // Hide specific elements instantly before Barba slides
            const hideTargets = [
                ...context.querySelectorAll('header .line_v-c'),
                ...context.querySelectorAll('header .line_v-cap_t'),
                ...context.querySelectorAll('header .line_v-cap_b'),
                ...context.querySelectorAll('header .line_h-c, .catalog-card_component .line_h-c'),
                ...context.querySelectorAll('header .line_h-cap_l, .catalog-card_component .line_h-cap_l'),
                ...context.querySelectorAll('header .line_h-cap_r, .catalog-card_component .line_h-cap_r'),
                ...context.querySelectorAll('.catalog-card_image, .catalog-card_content, .card_details_container')
            ];
            gsap.set(hideTargets, { opacity: 0 });

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

        if (els.listBtn) { addListener(els.listBtn, 'click', () => setViewMode(true)); els.listBtn.classList.toggle('is-hidden', state.isListView); }
        if (els.gridBtn) { addListener(els.gridBtn, 'click', () => setViewMode(false)); els.gridBtn.classList.toggle('is-hidden', !state.isListView); }

        const populate = (listEl, type, dropdownWrapper) => {
            if (!listEl) return;
            const vals = new Set(['All']);
            els.mainItems.forEach(item => vals.add(item.getAttribute(type === 'year' ? 'data-col' : 'data-cat')));

            const decorativeLine = listEl.querySelector('.line-horizontal');
            listEl.innerHTML = '';

            vals.forEach(v => {
                if (!v) return;
                const a = document.createElement('a');
                a.className = 'w-dropdown-link';
                a.innerText = v;
                a.style.cursor = 'pointer';

                addListener(a, 'mouseenter', () => { if (a.dataset.state === 'default') gsap.to(a, { color: CONFIG.colors.contrast, duration: 0.2, ease: 'power2.out', overwrite: 'auto' }); });
                addListener(a, 'mouseleave', () => { if (a.dataset.state === 'default') gsap.to(a, { color: CONFIG.colors.activeWhite, duration: 0.2, ease: 'power2.out', overwrite: 'auto' }); });
                addListener(a, 'click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (type === 'year') state.activeYear = v;
                    else state.activeCat = v;

                    const btn = dropdownWrapper.querySelector('.card_filter_title');
                    if (btn) btn.innerText = v === 'All' ? (type === 'year' ? 'Collection' : 'Category') : v;

                    applyFilters();
                    gsap.to(listEl, { opacity: 0, y: -10, duration: 0.2, onComplete: () => gsap.set(listEl, { display: 'none' }) });
                    dropdownWrapper.dataset.customOpen = 'false';
                });
                listEl.appendChild(a);
            });
            if (decorativeLine) listEl.appendChild(decorativeLine);
        };

        const yearWrapper = context.querySelector('#filter_item_1');
        const catWrapper = context.querySelector('#filter_item_2');
        populate(els.yearList, 'year', yearWrapper);
        populate(els.catList, 'cat', catWrapper);

        setupCustomDropdowns(context);

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

        // 1. Title Vertical Line (Math Filter to avoid Dropdowns)
        const vCenters = gsap.utils.toArray(context.querySelectorAll('.line_v-c')).filter(el => !el.closest('.w-dropdown-list'));
        const vCapsT = gsap.utils.toArray(context.querySelectorAll('.line_v-cap_t')).filter(el => !el.closest('.w-dropdown-list'));
        const vCapsB = gsap.utils.toArray(context.querySelectorAll('.line_v-cap_b')).filter(el => !el.closest('.w-dropdown-list'));

        if (vCapsT.length) masterTl.fromTo(vCapsT, { top: '50%', opacity: 0, yPercent: -50 }, { top: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (vCapsB.length) masterTl.fromTo(vCapsB, { bottom: '50%', opacity: 0, yPercent: 50 }, { bottom: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (vCenters.length) masterTl.fromTo(vCenters, { scaleY: 0, transformOrigin: 'center center' }, { scaleY: 1, duration: 0.4, ease: "power2.out" }, 0.1);

        // 2. Typewriter Effect
        const p = context.querySelector('.header_paragraph');
        if (p) {
            const chars = gsap.utils.toArray(p.querySelectorAll('span'));
            if (chars.length > 0) {
                masterTl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.02, ease: "none" }, 0);
            }
        }

        // 3. Header Horizontal Lines (Math Filter to avoid Cards and Dropdowns)
        const headerHCenters = gsap.utils.toArray(context.querySelectorAll('.line_h-c')).filter(el => !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        const headerHL = gsap.utils.toArray(context.querySelectorAll('.line_h-cap_l')).filter(el => !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        const headerHR = gsap.utils.toArray(context.querySelectorAll('.line_h-cap_r')).filter(el => !el.closest('.catalog-card_component') && !el.closest('.w-dropdown-list'));
        
        if (headerHL.length) masterTl.fromTo(headerHL, { left: '50%', opacity: 0, xPercent: -50 }, { left: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (headerHR.length) masterTl.fromTo(headerHR, { right: '50%', opacity: 0, xPercent: 50 }, { right: '0%', opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        if (headerHCenters.length) masterTl.fromTo(headerHCenters, { scaleX: 0, transformOrigin: 'center center' }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, 0.1);

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

    return { init, teardown, playIntro };
})();