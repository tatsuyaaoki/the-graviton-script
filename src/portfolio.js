/**
 * Module: Portfolio Gallery
 * Description: Manages Webflow CMS filtering, List/Grid view toggling, 
 * directional hover states, and GSAP entry animations for catalog cards.
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

    const addListener = (el, type, fn) => {
        if (!el) return;
        el.addEventListener(type, fn);
        state.listeners.push({ el, type, fn });
    };

    const teardown = () => {
        clearTimeout(state.resizeTimer);
        clearTimeout(state._hoverFadeTimer);
        
        if (els && els.cards) {
            els.cards.forEach(card => {
                const allEls = card.querySelectorAll('*');
                // Kill tweens and wipe inline GSAP styles to prevent html2canvas scaling bugs
                gsap.killTweensOf(allEls);
                gsap.set(allEls, { clearProps: 'all' });
                
                // Manually clear Webflow IX2 inline styles
                card.querySelectorAll('.card_image, .card_image img').forEach(img => {
                    img.style.transform = '';
                    img.style.opacity = '';
                    img.style.scale = '';
                });
                card.style.pointerEvents = '';
            });
        }
        
        // Unbind all event listeners and MutationObservers
        state.listeners.forEach(listener => {
            if (listener.type === 'observer') listener.fn.disconnect();
            else if (listener.el) listener.el.removeEventListener(listener.type, listener.fn);
        });
        
        state.listeners = [];
        state._initialised = false;
        state.isTransitioning = false;
        els = {};
    };

    const handleHover = (index, isEnter, card, visibleItems) => {
        const hoverEl = card.querySelector('.card_hover');
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
                const prevHover = visibleItems[state.activeCardIndex]?.querySelector('.card_hover');
                if (prevHover) {
                    gsap.to(prevHover, {
                        x: `${dirX * 100}%`, y: `${dirY * 100}%`,
                        duration: 0.3, ease: 'power2.inOut',
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
        if (state.isListView) {
            cols = (w > 991) ? 2 : 1;
        } else {
            if (w > 991) cols = 3;
            else if (w > 767) cols = 2;
        }
        cols = Math.min(cols, visibleMain.length);
        state.activeCardIndex = null;

        els.mainItems.forEach(item => {
            const card = item.querySelector('.card_container');
            if (card) card.classList.remove('is-last-in-col');
        });

        visibleMain.forEach((item, i) => {
            const card = item.querySelector('.card_container');
            if (!card) return;

            card.style.pointerEvents = 'none';
            card.onmouseenter = () => handleHover(i, true, card, visibleMain);
            card.onmouseleave = () => handleHover(i, false, card, visibleMain);

            const isLastInColumn = i >= (visibleMain.length - cols);
            if (isLastInColumn) card.classList.add('is-last-in-col');

            const topWrapper = card.querySelector('.horizontal_line_top');
            const bottomWrapper = card.querySelector('.horizontal_line_bottom');
            const hoverEl = card.querySelector('.card_hover');

            const getLineParts = (wrapper) => wrapper
                ? { c: wrapper.querySelectorAll('.line_h-c'), l: wrapper.querySelectorAll('.line_h-cap_l'), r: wrapper.querySelectorAll('.line_h-cap_r') }
                : { c: [], l: [], r: [] };

            const top = getLineParts(topWrapper);
            const bottom = getLineParts(bottomWrapper);
            const img = card.querySelectorAll('.card_image');
            const text = card.querySelectorAll('.card_title, .card_category, .info_value, .card_detail');

            const allTargets = [...top.c, ...top.l, ...top.r, ...bottom.c, ...bottom.l, ...bottom.r, ...img, ...text];
            if (hoverEl) allTargets.push(hoverEl);

            gsap.killTweensOf(allTargets);
            gsap.set(allTargets, { clearProps: 'all' });
            gsap.set([top.c, bottom.c], { scaleX: 0 });
            gsap.set([top.l, bottom.l], { left: '50%', opacity: 0 });
            gsap.set([top.r, bottom.r], { right: '50%', opacity: 0 });
            gsap.set(img, { opacity: 0 });
            gsap.set(text, { opacity: 0, y: CONFIG.styling.textYOffset });
            if (hoverEl) gsap.set(hoverEl, { display: 'none', opacity: 0 });

            const delay = Math.min(CONFIG.timing.cardIntroDelay + i * CONFIG.timing.cardIntroStagger, CONFIG.timing.maxDelay);
            const tl = gsap.timeline({ delay, onComplete: () => { card.style.pointerEvents = 'auto'; } });

            tl.to(top.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0)
              .to(top.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0)
              .to(top.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);

            if (isLastInColumn && bottomWrapper) {
                tl.to(bottom.l, { left: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0)
                  .to(bottom.r, { right: '0%', opacity: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0)
                  .to(bottom.c, { scaleX: 1, duration: CONFIG.styling.lineDuration, ease: CONFIG.styling.easeLines }, 0.2);
            }

            tl.to(img, { opacity: 1, duration: CONFIG.styling.imageFadeDuration, ease: 'none' }, 0.3)
              .to(text, { opacity: 1, y: 0, duration: CONFIG.styling.textDuration, stagger: CONFIG.styling.textStagger, ease: CONFIG.styling.easeMain }, 0.4);
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
            card.querySelectorAll('.card_content, .card_title, .card_image, .card_details_container')
                .forEach(t => t.classList.toggle('is-list', isList));
        });

        applyFilters();
    };

    const init = (context, skipIntro = false) => {
        if (state._initialised) teardown();
        state._initialised = true;
        state.isTransitioning = skipIntro;
        state._lastBreakpoint = getBreakpoint(window.innerWidth);

        els = {
            mainItems: Array.from(context.querySelectorAll('.w-dyn-item')),
            yearList: context.querySelector('#year-dropdown-list'),
            catList: context.querySelector('#category-dropdown-list'),
            listBtn: context.querySelector('.list-btn'),
            gridBtn: context.querySelector('.grid-btn'),
            dynList: context.querySelector('.w-dyn-items'),
            cards: Array.from(context.querySelectorAll('.card_container'))
        };

        if (skipIntro) {
            gsap.set(context.querySelectorAll('.card_image'), { opacity: 0 });
            gsap.set(context.querySelectorAll('.card_title, .card_category, .info_value, .card_detail'), { opacity: 0, y: -20 });
            const lineCenters = context.querySelectorAll('.card_container .line_h-c');
            const lineCapsL = context.querySelectorAll('.card_container .line_h-cap_l');
            const lineCapsR = context.querySelectorAll('.card_container .line_h-cap_r');
            if (lineCenters.length) gsap.set(lineCenters, { scaleX: 0 });
            if (lineCapsL.length) gsap.set(lineCapsL, { opacity: 0, left: '50%' });
            if (lineCapsR.length) gsap.set(lineCapsR, { opacity: 0, right: '50%' });
        }

        // 1. Data Stamping: Extracting Webflow CMS values into attributes for filtering
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

        // Restore view mode persistence on Barba navigation
        if (state.isListView) {
            if (els.dynList) els.dynList.classList.add('is-list');
            els.cards.forEach(card => {
                card.classList.add('is-list');
                card.querySelectorAll('.card_content, .card_title, .card_image, .card_details_container')
                    .forEach(t => t.classList.add('is-list'));
            });
        }

        if (els.listBtn) {
            addListener(els.listBtn, 'click', () => setViewMode(true));
            els.listBtn.classList.toggle('is-hidden', state.isListView);
        }
        if (els.gridBtn) {
            addListener(els.gridBtn, 'click', () => setViewMode(false));
            els.gridBtn.classList.toggle('is-hidden', !state.isListView);
        }

        const populate = (listEl, type) => {
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
                a.setAttribute('role', 'menuitem');
                a.setAttribute('tabindex', '0');
                a.style.cursor = 'pointer';

                addListener(a, 'mouseenter', () => {
                    if (a.dataset.state === 'default') gsap.to(a, { color: CONFIG.colors.contrast, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
                });
                addListener(a, 'mouseleave', () => {
                    if (a.dataset.state === 'default') gsap.to(a, { color: CONFIG.colors.activeWhite, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
                });
                addListener(a, 'click', (e) => {
                    e.preventDefault();
                    if (type === 'year') state.activeYear = v;
                    else state.activeCat = v;

                    const btn = listEl.previousElementSibling?.querySelector('div:last-child');
                    if (btn) btn.innerText = v === 'All' ? (type === 'year' ? 'Collection' : 'Category') : v;

                    applyFilters();
                    if (typeof $ !== 'undefined') $(listEl).trigger('w-close');
                });

                listEl.appendChild(a);
            });

            if (decorativeLine) listEl.appendChild(decorativeLine);
        };

        populate(els.yearList, 'year');
        populate(els.catList, 'cat');

        // Observe Webflow Native Dropdown triggers for custom line animations
        const setupDropdownAnimation = (list) => {
            if (!list) return;
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName !== 'class') return;
                    const isOpen = list.classList.contains('w--open');

                    if (isOpen && list.dataset.animating !== 'true') {
                        list.dataset.animating = 'true';
                        const links = list.querySelectorAll('.w-dropdown-link');
                        const decLine = list.querySelector('.line-horizontal');

                        gsap.fromTo(list,
                            { clipPath: 'inset(0% 0% 100% 0%)' },
                            { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'power2.inOut', clearProps: 'clipPath', onComplete: () => list.dataset.animating = 'false' }
                        );

                        if (links.length) gsap.from(links, { opacity: 0, y: -10, duration: 0.4, stagger: 0.05, ease: 'power2.inOut', clearProps: 'transform' });

                        if (decLine) {
                            const cLine = decLine.querySelector('.line_h-c');
                            const lCap = decLine.querySelector('.line_h-cap_l');
                            const rCap = decLine.querySelector('.line_h-cap_r');
                            if (cLine && lCap && rCap) {
                                gsap.fromTo(cLine, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.inOut' });
                                gsap.fromTo(lCap, { left: '50%', opacity: 0 }, { left: '0%', opacity: 1, duration: 0.5, ease: 'power2.inOut' });
                                gsap.fromTo(rCap, { right: '50%', opacity: 0 }, { right: '0%', opacity: 1, duration: 0.5, ease: 'power2.inOut' });
                            }
                        }
                    } else if (!isOpen) {
                        list.dataset.animating = 'false';
                    }
                });
            });
            observer.observe(list, { attributes: true, attributeFilter: ['class'] });
            state.listeners.push({ type: 'observer', fn: observer });
        };

        setupDropdownAnimation(els.yearList);
        setupDropdownAnimation(els.catList);

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