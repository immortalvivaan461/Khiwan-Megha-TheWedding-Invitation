(function () {
    /* =====================================================
       AUTO SCROLL SETTINGS  (change these numbers only)
       ===================================================== */
    const AUTO_SCROLL_ENABLED     = true; // false = turn auto scroll off completely
    const AUTO_SCROLL_DELAY       = 3;    // seconds to wait AFTER the invitation is visible, then start scrolling
    const AUTO_SCROLL_SPEED       = 55;   // pixels per second (20 = slow, 45 = calm, 80 = fast)
    const AUTO_SCROLL_RESUME_IDLE = 0;    // seconds of no touching before it restarts by itself (0 = never restart)
    /* ===================================================== */

    const page = document.getElementById("finalPage");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $$ = s => [...page.querySelectorAll(s)];

    /* ---- mark reveal targets while the page is still hidden (no flash) ---- */
    const sel = ".fp-title,.fp-lead,.fp-invite-card,.fp-invite-card > *,.fp-venue-photo,.fp-venue-grid > div:last-child > *," +
        ".fp-scratch > *,.fp-tabs,.fp-events li,.fp-journey > *,.fp-countdown,.fp-form,.fp-footer > *";
    const els = [...new Set($$(sel))].filter(e => !e.classList.contains("fp-divider"));
    const seen = new Map();
    els.forEach(el => {
        const n = seen.get(el.parentNode) || 0;
        seen.set(el.parentNode, n + 1);
        el.classList.add("rv");
        el.style.setProperty("--d", Math.min(n, 6) * 0.09 + "s");
    });
    const draws = $$(".fp-divider");
    draws.forEach(el => el.classList.add("draw"));

    /* ---- started by gate.js once the doors open ---- */
    window.initReveals = function () {
        const all = els.concat(draws);
        if (reduce) return all.forEach(e => e.classList.add("in"));
        // (petals start below, after the observer is set up)
        const io = new IntersectionObserver(entries => entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
        all.forEach(e => io.observe(e));
        onScroll();
        startPetals();
        scheduleAutoScroll();
    };

    /* =====================================================
       AUTO SCROLL
       - waits AUTO_SCROLL_DELAY seconds, then glides down the page
       - stops as soon as the visitor touches, scrolls, clicks or presses a key
       - stops by itself when it reaches the bottom
       ===================================================== */
    let asRunning = false, asRaf = 0, asStartTimer = null, asResumeTimer = null;
    let asPos = 0, asLast = null, asArmed = false;

    function asStep(t) {
        if (!asRunning) return;
        if (asLast === null) asLast = t;
        const dt = Math.min((t - asLast) / 1000, 0.1);   // clamp so a background tab doesn't cause a jump
        asLast = t;
        const max = page.scrollHeight - page.clientHeight;
        asPos += AUTO_SCROLL_SPEED * dt;                  // we keep our own decimal position so slow speeds stay smooth
        if (asPos >= max) {
            page.scrollTop = max;
            stopAutoScroll(false);                        // reached the bottom: finish, don't restart
            return;
        }
        page.scrollTop = asPos;
        asRaf = requestAnimationFrame(asStep);
    }

    function runAutoScroll() {
        if (asRunning) return;
        asRunning = true;
        asLast = null;
        asPos = page.scrollTop;
        page.style.scrollBehavior = "auto";               // CSS has smooth scrolling, which would fight every small step
        asRaf = requestAnimationFrame(asStep);
    }

    function stopAutoScroll(allowResume) {
        clearTimeout(asStartTimer);
        clearTimeout(asResumeTimer);
        if (asRunning) {
            asRunning = false;
            cancelAnimationFrame(asRaf);
            page.style.scrollBehavior = "";               // give smooth scrolling back to the menu links
        }
        if (allowResume && AUTO_SCROLL_RESUME_IDLE > 0) {
            asResumeTimer = setTimeout(runAutoScroll, AUTO_SCROLL_RESUME_IDLE * 1000);
        }
    }

    function scheduleAutoScroll() {
        if (!AUTO_SCROLL_ENABLED || reduce || asArmed) return;
        asArmed = true;
        // any real user action cancels auto scroll
        ["wheel", "touchstart", "pointerdown", "keydown"].forEach(ev =>
            page.addEventListener(ev, () => { if (asArmed) stopAutoScroll(true); }, { passive: true })
        );
        asStartTimer = setTimeout(runAutoScroll, AUTO_SCROLL_DELAY * 1000);
    }

    /* ---- falling petals + tiny blossoms over the whole page ---- */
    function startPetals() {
        if (reduce || document.querySelector(".petal-layer")) return;
        const layer = document.createElement("div");
        layer.className = "petal-layer";
        layer.setAttribute("aria-hidden", "true");
        const colors = ["#F4DDE0", "#EBC3C8", "#E3A9B1", "#FFF9F3", "#E6CB94"];
        const count = window.innerWidth < 600 ? 16 : 28;
        const r = (a, b) => a + Math.random() * (b - a);
        for (let i = 0; i < count; i++) {
            const bloom = i % 4 === 0;
            const f = document.createElement("span");
            f.className = "fall " + (bloom ? "bloom" : "petal");
            f.style.cssText = `--x:${r(0, 100)}%;--s:${bloom ? r(14, 20) : r(9, 15)}px;--c:${colors[i % colors.length]};` +
                `--t:${r(10, 18)}s;--dl:${r(0, 9)}s;--dx:${r(-90, 90)}px;--sw:${r(2, 4)}s`;
            f.appendChild(document.createElement("i"));
            layer.appendChild(f);
        }
        document.body.appendChild(layer);
        requestAnimationFrame(() => layer.classList.add("on"));
    }

    /* ---- scroll: progress bar, parallax, active link, nav shadow ---- */
    const nav = page.querySelector(".fp-nav");
    const bar = page.querySelector(".fp-progress");
    const hero = page.querySelector(".fp-hero");
    const links = $$(".fp-nav nav a");
    const targets = links.map(a => page.querySelector(a.getAttribute("href")));
    let ticking = false;

    function onScroll() {
        ticking = false;
        const st = page.scrollTop, max = page.scrollHeight - page.clientHeight;
        bar.style.setProperty("--p", max > 0 ? st / max : 0);
        nav.classList.toggle("is-scrolled", st > 10);
        if (!reduce && st < hero.offsetHeight) hero.style.setProperty("--py", st * 0.3 + "px");
        let active = 0;
        targets.forEach((t, i) => { if (t && t.offsetTop - 140 <= st) active = i; });
        if (max > 0 && st >= max - 4) active = links.length - 1;
        links.forEach((a, i) => a.classList.toggle("is-active", i === active));
    }
    page.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

    /* ---- navbar hashtag: fades in and bursts into sparkles once the curtains are gone (called by gate.js) ---- */
    window.revealHashtag = function () {
        const tag = page.querySelector(".fp-tag");
        if (!tag || tag.classList.contains("in")) return;
        tag.classList.add("in");
        if (reduce || typeof gsap === "undefined") return;
        const wrap = tag.querySelector(".fp-tag-wrap");
        const r = (a, b) => a + Math.random() * (b - a);
        setTimeout(() => {
            const w = wrap.offsetWidth, h = wrap.offsetHeight;
            for (let i = 0; i < 24; i++) {
                const s = document.createElement("span");
                s.className = "fp-spark";
                s.style.left = r(0, w) + "px"; s.style.top = r(0, h) + "px";
                wrap.appendChild(s);
                gsap.fromTo(s, { x: 0, y: 0, scale: 0, opacity: 1 },
                    { x: r(-28, 28), y: r(-24, 24), scale: r(0.5, 1.3), opacity: 0,
                      duration: r(0.9, 1.6), delay: r(0, 0.8), ease: "power2.out", onComplete: () => s.remove() });
            }
        }, 150);
    };

    /* ---- countdown: tick when a number changes ---- */
    ["days", "hours", "mins", "secs"].forEach(k => {
        const el = document.getElementById("cd-" + k);
        let last = el.textContent;
        new MutationObserver(() => {
            if (el.textContent === last) return;
            last = el.textContent;
            el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick");
        }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    /* ---- scratch card: sparkle burst on reveal ---- */
    const card = document.getElementById("scratchCard");
    new MutationObserver(() => {
        if (!card.classList.contains("is-done") || reduce) return;
        const sec = card.parentNode;
        const cx = card.offsetLeft + card.offsetWidth / 2, cy = card.offsetTop + card.offsetHeight / 2;
        for (let i = 0; i < 20; i++) {
            const s = document.createElement("span");
            s.className = "fp-spark";
            s.style.left = cx + "px"; s.style.top = cy + "px";
            sec.appendChild(s);
            const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 130;
            gsap.fromTo(s, { x: 0, y: 0, scale: 0, opacity: 1 },
                { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0.6 + Math.random() * 1.2, opacity: 0,
                  duration: 1.1 + Math.random() * 0.6, ease: "power2.out", onComplete: () => s.remove() });
        }
        // simple confetti: pops up out of the card, then drifts down while spinning
        const confetti = ["#C9A46A", "#B77C83", "#E3A9B1", "#E6CB94", "#A7B49A", "#FFF9F3"];
        for (let i = 0; i < 36; i++) {
            const c = document.createElement("span");
            c.className = "fp-confetti";
            c.style.left = cx + "px"; c.style.top = cy + "px";
            c.style.background = confetti[i % confetti.length];
            sec.appendChild(c);
            const x = (Math.random() - 0.5) * 340;
            gsap.timeline({ onComplete: () => c.remove() })
                .fromTo(c, { x: 0, y: 0, scale: 0, opacity: 1, rotation: Math.random() * 360 },
                    { x: x, y: -(80 + Math.random() * 120), scale: 1, rotation: "+=" + (180 + Math.random() * 240),
                      duration: 0.6 + Math.random() * 0.3, ease: "power2.out" })
                .to(c, { x: x + (Math.random() - 0.5) * 80, y: "+=" + (260 + Math.random() * 160), rotation: "+=" + (240 + Math.random() * 360),
                         opacity: 0, duration: 1.6 + Math.random() * 0.8, ease: "power1.in" });
        }
    }).observe(card, { attributes: true, attributeFilter: ["class"] });
})();