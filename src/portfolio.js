/**
 * Module: Portfolio Gallery
 * Description: Manages Webflow CMS filtering, List/Grid view toggling, 
 * directional hover states, GSAP entry animations, and Custom Dropdown states.
 */

export const PortfolioGallery = (() => {
    const state = {
        activeYear: 'All', activeCat: 'All',
        activeCardIndex: null, lastPos: null,
        isListView: false, listeners: [],
        _initialised: false, _hoverFadeTimer: null,
        resizeTimer: null, isTransitioning: false,
        _lastBreakpoint: null
    };

    const CONFIG = {
        timing: { cardIntroDelay: 0, cardIntroStagger: 0.1, maxDelay: 0.5 },
        styling: {
            lineDuration: 0.5, textDuration: 0.3, textYOffset: -20, textStagger: 0.08,
            imageFadeDuration: 0.6, easeMain: 'power2.out', easeLines: 'expo.inOut'
        },
        colors: {
            primary: 'var(--grv-primary, #0d9488)',
            contrast: 'var(--grv-contrast, #e2572b)',
            activeWhite: 'rgba(255, 255, 255, 1)',
            disabledGrey: 'rgba(255, 255, 255, 0.25)'
        }
    };

    let els = {};

    const getBreakpoint = (w) => w > 991 ? 'lg' : w > 767 ? 'md' : 'sm';

    const addListener = (el, type, fn, options = false) => {
        if (!el) return;
        el.addEventListener(type, fn, options);
        state.listeners.push({ el, type, fn, options });
    };

    const teardown = () => {
        clearTimeout(state.resizeTimer);
        clearTimeout(state._hoverFadeTimer);
        
        if (els && els.cards) {
            els.cards.forEach(card => {
                const allEls = gsap.utils.toArray(card.querySelectorAll('*'));
                if(allEls.length) {
                    gsap.killTweensOf(allEls);
                    gsap.set(allEls, { clearProps: 'all' });
                }
                
                card.querySelectorAll('.catalog-card_image').forEach(img => {
                    img.style.transform = ''; img.style.opacity = ''; img.style.scale = '';
                });
                card.style.pointerEvents = '';
            });
        }
        
        state.listeners.forEach(l => {
            if (l.el) l.el.removeEventListener(l.type, l.fn, l.options);
        });
        
        state.listeners = [];
        state._initialised = false;
        state.isTransitioning = false;
        els = {};
    };

    const handleHover = (index, isEnter, card, visibleItems) => {
        const hoverEl = card.querySelector('.catalog-card_hover-overlay') || card.querySelector('.card_hover');
        if (!hoverEl || card.style.pointerEvents === 'none') return;

        if (isEnter) {
            clearTimeout(state._hoverFadeTimer);
            const rect = card.getBoundingClientRect();
            const currentPos = { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
            let dirX = 0, dirY = 0;

            if (state.lastPos) {
                const dx = currentPos.left - state.lastPos.left;
                const dy = currentPos.top - state.lastPos.top;
                dirX = dx > 10 ? 1 : dx < -10 ? -1 : 0;
                dirY = dy > 10 ? 1 : dy < -10 ? -1 : 0;
            }

            if (state.activeCardIndex !== null && state.activeCardIndex !== index) {
                const prevHover = visibleItems[state.activeCardIndex]?.querySelector('.catalog-card_hover-overlay') || visibleItems[state.activeCardIndex]?.querySelector('.card_hover');
                if (prevHover) {
                    gsap.to(prevHover, {
                        x: `${dirX * 100}%`, y: `${dirY * 100}%`, duration: 0.3, ease: 'power2.inOut',
                        onComplete: () => gsap.set(prevHover, { display: 'none' })
                    });
                }
            }

            gsap.killTweensOf(hoverEl);
            gsap.set(hoverEl, { display: 'block', opacity: 1, x: `${dirX * -100}%`, y: `${dirY * -100}%` });
            gsap.to(hoverEl, { x: '0%', y: '0%', duration: 0.35, ease: 'power2.out' });
            state.lastPos = currentPos;
            state.activeCardIndex = index;
        } else {
            state._hoverFadeTimer = setTimeout(() => {
                if (state.activeCardIndex === index) {
                    gsap.to(hoverEl, {
                        opacity: 0, duration: 0.3,
                        onComplete: () => gsap.set(hoverEl, { display: 'none', opacity: 1 })
                    });
                    state.activeCardIndex = null;
                }
            }, 50);
        }
    };

    const playCardAnimations = () => {
        if (!els.mainItems) return;
        const visibleMain = els.mainItems.filter(el => el.style.display !== 'none');
        if (visibleMain.length === 0) return;

        const w = window.innerWidth;
        let cols = 1;
        if (state.isListView) cols = (w > 991) ? 2 : 1;
        else cols = (w > 991) ? 3 : (w > 767 ? 2 : 1);
        
        cols = Math.min(cols, visibleMain.length);
        state.activeCardIndex = null;

        els.mainItems.forEach(item => {
            const card = item.querySelector('.catalog-card_component') || item.querySelector('.card_container');
            if (card) card.classList.remove('is-last-in-col');
        });

        visibleMain.forEach((item, i) => {
            const card = item.querySelector('.catalog-card_component') || item.querySelector('.card_container');
            if (!card) return;

            card.style.pointerEvents = 'none';
            card.onmouseenter = () => handleHover(i, true, card, visibleMain);
            card.onmouseleave = () => handleHover(i, false, card, visibleMain);

            const isLastInColumn = i >= (visibleMain.length - cols);
            if (isLastInColumn) card.classList.add('is-last-in-col');

            const topWrapper = card.querySelector('.horizontal_line_top');
            const bottomWrapper = card.querySelector('.horizontal_line_bottom');
            const hoverEl = card.querySelector('.catalog-card_hover-overlay') || card.querySelector('.card_hover');

            const getLineParts = (wrapper) => wrapper
                ? { c: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-c')), 
                    l: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-cap_l')), 
                    r: gsap.utils.toArray(wrapper.querySelectorAll('.line_h-cap_r')) }
                : { c: [], l: [], r: [] };

            const top = getLineParts(topWrapper);
            const bottom = getLineParts(bottomWrapper);
            const img = gsap.utils.toArray(card.querySelectorAll('.catalog-card_image, .card_image'));
            const text = gsap.utils.toArray(card.querySelectorAll('.card_title, .card_category, .info_value, .card_detail, .catalog-card_title'));

            const allTargets = [...top.c, ...top.l, ...top.r, ...bottom.c, ...bottom.l, ...bottom.r, ...img, ...text];
            if (hoverEl) allTargets.push(hoverEl);

            if(allTargets.length) {
                gsap.killTweensOf(allTargets);
                gsap.set(allTargets, { clearProps: 'all' });
            }

            if(top.c.length) gsap.set([top.c, bottom.c], { scaleX: 0 });
            if(top.l.length) gsap.set([top.l, bottom.l], { left: '50%', opacity: 0 });
            if(top.r.length) gsap.set([top.r, bottom.r], { right: '50%', opacity: 0 });
            if(img.length) gsap.set(img, { opacity: 0 });
            if(text.length) gsap.set(text, { opacity: 0, y: CONFIG.styling.textYOffset });
            if(hoverEl) gsap.set(hoverEl, { display: 'none', opacity: 0 });

            const delay = Math.min(CONFIG.timing.cardIntroDelay + i * CONFIG.timing.cardIntroStagger, CONFIG.timing.maxDelay);
            const tl = gsap.timeline({ delay, onComplete: () => { card.style.pointerEvents = 'auto'; } });

            if(top.l.length) tl.to(top.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.r.length) tl.to(top.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
            if(top.c.length) tl.to(top.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);

            if (isLastInColumn && bottomWrapper) {
                if(bottom.l.length) tl.to(bottom.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.r.length) tl.to(bottom.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0);
                if(bottom.c.length) tl.to(bottom.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);
            }

            if(img.length) tl.to(img, { opacity: 1, duration: CONFIG.styling.imageFadeDuration, ease: 'none' }, 0.3);
            if(text.length) tl.to(text, { opacity: 1, y: 0, duration: CONFIG.styling.textDuration, stagger: CONFIG.styling.textStagger, ease: CONFIG.styling.easeMain }, 0.4);
        });
    };

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
                    link.dataset.state = 'active';
                    link.style.pointerEvents = 'auto';
                    link.style.cursor = 'pointer';
                    gsap.to(link, { color: CONFIG.colors.primary, opacity: 1, duration: 0.2, overwrite: 'auto' });
                } else if (!exists) {
                    link.dataset.state = 'disabled';
                    link.style.pointerEvents = 'none';
                    link.style.cursor = 'default';
                    gsap.to(link, { color: CONFIG.colors.disabledGrey, opacity: 0.5, duration: 0.2, overwrite: 'auto' });
                } else {
                    link.dataset.state = 'default';
                    link.style.pointerEvents = 'auto';
                    link.style.cursor = 'pointer';
                    gsap.to(link, { color: CONFIG.colors.activeWhite, opacity: 1, duration: 0.2, overwrite: 'auto' });
                }
            });
        });
    };

    const applyFilters = () => {
        els.mainItems.forEach(item => {
            const year = item.getAttribute('data-col');
            const cat = item.getAttribute('data-cat');
            const isVisible = (state.activeYear === 'All' || year === state.activeYear) &&
                              (state.activeCat === 'All' || cat === state.activeCat);
            item.style.display = isVisible ? 'block' : 'none';
        });
        updateDropdownStates();

        requestAnimationFrame(() => {
            if (!state.isTransitioning) {
                playCardAnimations();
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

    // --- NEW: Custom Dropdown Controller ---
    const setupCustomDropdowns = (context) => {
        const dropdownWrappers = context.querySelectorAll('.w-dropdown');
        
        dropdownWrappers.forEach(dropdown => {
            const toggle = dropdown.querySelector('.w-dropdown-toggle');
            const list = dropdown.querySelector('.w-dropdown-list');
            if (!toggle || !list) return;

            // Pre-hide all lists via GSAP so they don't pop open
            gsap.set(list, { display: 'none', opacity: 0, y: -10 });
            dropdown.dataset.customOpen = 'false';

            const handleToggleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isOpen = dropdown.dataset.customOpen === 'true';

                // Close all other dropdowns
                dropdownWrappers.forEach(other => {
                    if (other !== dropdown && other.dataset.customOpen === 'true') {
                        const otherList = other.querySelector('.w-dropdown-list');
                        gsap.to(otherList, { opacity: 0, y: -10, duration: 0.2, onComplete: () => gsap.set(otherList, { display: 'none' }) });
                        other.dataset.customOpen = 'false';
                    }
                });

                if (!isOpen) {
                    // Open logic
                    gsap.set(list, { display: 'block' });
                    
                    const tl = gsap.timeline();
                    tl.to(list, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });

                    // Internal decorative line animation
                    const cLine = list.querySelector('.line_h-c');
                    const lCap = list.querySelector('.line_h-cap_l');
                    const rCap = list.querySelector('.line_h-cap_r');
                    if (cLine && lCap && rCap) {
                        gsap.set(cLine, { scaleX: 0 });
                        gsap.set([lCap, rCap], { opacity: 0 });
                        tl.to([lCap, rCap], { opacity: 1, duration: 0.3 }, 0)
                          .to(cLine, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, 0.1);
                    }
                    dropdown.dataset.customOpen = 'true';
                } else {
                    // Close logic
                    gsap.to(list, { opacity: 0, y: -10, duration: 0.2, onComplete: () => gsap.set(list, { display: 'none' }) });
                    dropdown.dataset.customOpen = 'false';
                }
            };

            addListener(toggle, 'click', handleToggleClick);
        });

        // Global click-outside listener to close dropdowns
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

    const init = (context, skipIntro = false) => {
        if (state._initialised) teardown();
        state._initialised = true;
        state.isTransitioning = skipIntro;
        state._lastBreakpoint = getBreakpoint(window.innerWidth);

        els = {
            mainItems: Array.from(context.querySelectorAll('.catalog-list_item, .collection-item')),
            yearList: context.querySelector('#year-dropdown-list'),
            catList: context.querySelector('#category-dropdown-list'),
            listBtn: context.querySelector('.list-btn'),
            gridBtn: context.querySelector('.grid-btn'),
            dynList: context.querySelector('.catalog-list_grid, .collection-list'),
            cards: Array.from(context.querySelectorAll('.catalog-card_component, .card_container'))
        };

        if (skipIntro) {
            const images = gsap.utils.toArray(context.querySelectorAll('.catalog-card_image, .card_image'));
            if(images.length) gsap.set(images, { opacity: 0 });

            const textEls = gsap.utils.toArray(context.querySelectorAll('.card_title, .card_category, .info_value, .card_detail'));
            if(textEls.length) gsap.set(textEls, { opacity: 0, y: -20 });

            const lineCenters = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-c, .card_container .line_h-c'));
            const lineCapsL = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-cap_l, .card_container .line_h-cap_l'));
            const lineCapsR = gsap.utils.toArray(context.querySelectorAll('.catalog-card_component .line_h-cap_r, .card_container .line_h-cap_r'));
            
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

        if (state.isListView) {
            if (els.dynList) els.dynList.classList.add('is-list');
            els.cards.forEach(card => {
                card.classList.add('is-list');
                card.querySelectorAll('.catalog-card_content, .card_title, .catalog-card_image, .card_details_container')
                    .forEach(t => t.classList.add('is-list'));
            });
        }

        // BIND VIEW MODE BUTTONS
        if (els.listBtn) {
            addListener(els.listBtn, 'click', () => setViewMode(true));
            els.listBtn.classList.toggle('is-hidden', state.isListView);
        }
        if (els.gridBtn) {
            addListener(els.gridBtn, 'click', () => setViewMode(false));
            els.gridBtn.classList.toggle('is-hidden', !state.isListView);
        }

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

                addListener(a, 'mouseenter', () => {
                    if (a.dataset.state === 'default') gsap.to(a, { color: CONFIG.colors.contrast, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
                });
                addListener(a, 'mouseleave', () => {
                    if (a.dataset.state === 'default') gsap.to(a, { color: CONFIG.colors.activeWhite, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
                });
                addListener(a, 'click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (type === 'year') state.activeYear = v;
                    else state.activeCat = v;

                    const btn = dropdownWrapper.querySelector('.card_filter_title');
                    if (btn) btn.innerText = v === 'All' ? (type === 'year' ? 'Collection' : 'Category') : v;

                    applyFilters();

                    // Close dropdown upon selection
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

        // INITIALIZE CUSTOM DROPDOWNS INSTEAD OF WEBFLOW NATIVE
        setupCustomDropdowns(context);

        const handleResize = () => {
            if (state.isTransitioning) return;
            const bp = getBreakpoint(window.innerWidth);
            if (bp === state._lastBreakpoint) return;
            state._lastBreakpoint = bp;
            clearTimeout(state.resizeTimer);
            state.resizeTimer = setTimeout(() => playCardAnimations(), 200);
        };
        window.addEventListener('resize', handleResize);
        state.listeners.push({ el: window, type: 'resize', fn: handleResize });

        els.mainItems.forEach(item => {
            const year = item.getAttribute('data-col');
            const cat = item.getAttribute('data-cat');
            const isVisible = (state.activeYear === 'All' || year === state.activeYear) && (state.activeCat === 'All' || cat === state.activeCat);
            item.style.display = isVisible ? 'block' : 'none';
        });
        updateDropdownStates();

        if (!skipIntro) {
            requestAnimationFrame(() => {
                playCardAnimations();
                setTimeout(() => window.ScrollTrigger?.refresh(), 450);
            });
        }
    };

    const playIntro = () => {
        state.isTransitioning = false;
        playCardAnimations();
    };

    return { init, teardown, playIntro };
})();