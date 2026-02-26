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
        // Fallback checks for both new BEM and old class names
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

            // Filter out empty arrays to prevent GSAP errors
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

    const updateDropdownStates = () => { /* ... (keeps existing logic) ... */ };
    const applyFilters = () => { /* ... (keeps existing logic) ... */ };
    const setViewMode = (isList) => { /* ... (keeps existing logic) ... */ };

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
            // FIX: Safely convert node lists to arrays and check length before setting GSAP
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

        // Data Stamping
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