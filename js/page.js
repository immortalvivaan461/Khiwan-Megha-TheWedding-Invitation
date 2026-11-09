(function () {
    /* ---------- Navbar menu button (phones) ---------- */
    const header = document.querySelector(".fp-nav");
    const toggle = header.querySelector(".fp-toggle");
    const isOpen = () => header.classList.contains("menu-open");
    function setMenu(open) {
        header.classList.toggle("menu-open", open);
        toggle.setAttribute("aria-expanded", open);
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    toggle.addEventListener("click", () => setMenu(!isOpen()));
    header.querySelector("nav").addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
    header.querySelector(".fp-logo").addEventListener("click", () => setMenu(false));
    document.addEventListener("click", e => { if (isOpen() && !header.contains(e.target)) setMenu(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) { setMenu(false); toggle.focus(); } });
    window.matchMedia("(min-width: 861px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

    /* ---------- Day tabs ---------- */
    const tabs = [...document.querySelectorAll('.fp-tabs [role="tab"]')];
    function selectTab(tab) {
        tabs.forEach(t => {
            const on = t === tab;
            t.setAttribute("aria-selected", on);
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
        });
    }
    tabs.forEach((t, i) => {
        t.addEventListener("click", () => selectTab(t));
        t.addEventListener("keydown", e => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
            selectTab(next); next.focus();
        });
    });

    /* ---------- Scratch to reveal ---------- */
    const card = document.getElementById("scratchCard");
    const canvas = document.getElementById("scratchCanvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let drawing = false, scratched = false, done = false, dpr = 1;

    function paintCover() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = card.offsetWidth * dpr;
        canvas.height = card.offsetHeight * dpr;
        const W = canvas.width, H = canvas.height;
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "#C9A46A"); g.addColorStop(.55, "#D9A9A5"); g.addColorStop(1, "#B77C83");
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,249,243,.14)"; ctx.lineWidth = dpr;
        for (let x = -H; x < W; x += 18 * dpr) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
        ctx.fillStyle = "#FFF9F3"; ctx.textAlign = "center";
        ctx.font = `${36 * dpr}px "Great Vibes", cursive`;
        ctx.fillText("Scratch here", W / 2, H / 2 + 6 * dpr);
        ctx.font = `italic ${15 * dpr}px "Cormorant Garamond", serif`;
        ctx.fillText("using your finger or mouse", W / 2, H / 2 + 34 * dpr);
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(paintCover);
    window.addEventListener("resize", () => { if (!scratched && !done) paintCover(); });

    function reveal() {
        if (done) return;
        done = true;
        card.classList.add("is-done");
        card.closest(".fp-scratch").classList.add("is-done");
    }
    function scratch(e) {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (canvas.width / r.width);
        const y = (e.clientY - r.top) * (canvas.height / r.height);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath(); ctx.arc(x, y, 24 * dpr, 0, Math.PI * 2); ctx.fill();
    }
    function cleared() {
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let clear = 0, total = 0;
        for (let i = 3; i < d.length; i += 64) { total++; if (d[i] < 128) clear++; }
        return clear / total;
    }
    canvas.addEventListener("pointerdown", e => { drawing = scratched = true; canvas.setPointerCapture(e.pointerId); scratch(e); });
    canvas.addEventListener("pointermove", e => { if (drawing) scratch(e); });
    ["pointerup", "pointercancel"].forEach(ev => canvas.addEventListener(ev, () => {
        if (!drawing) return;
        drawing = false;
        if (cleared() > 0.4) reveal();
    }));
    document.getElementById("revealDate").addEventListener("click", reveal);

    /* ---------- Add to calendar ---------- */
    // Edit these details. Leave startTime empty for an all-day event, or set times like "10:00" / "23:00" (India time).
    const WEDDING = {
        title: "Khiwan & Megha's Wedding",
        date: "2026-11-22",
        startTime: "",
        endTime: "",
        location: "The Grand Barso, Bharatpur, Rajasthan",
        description: "Join us to celebrate the wedding of Khiwan & Megha at The Grand Barso, Bharatpur, Rajasthan. " +
            "Celebrations:  22 November - Haldi, Noor-e-Haldi 10:00 AM onward,#KhiwanKiBaraat 06:00 pm onwards, and the Wedding, Shubh Vivaah." + 
            "Jaimala 09:00 pm onwards, The Gala Dinner 10:00 pm onwards, Shubh Vivaah 11:30 pm onwards Moodboard: Traditional attire"
    };

    (function setupCalendar() {
        const btn = document.getElementById("calBtn");
        const options = document.getElementById("calOptions");
        const googleLink = document.getElementById("calGoogle");
        const icsLink = document.getElementById("calIcs");
        const compact = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

        let start, end, allDay = !WEDDING.startTime;
        if (allDay) {
            const [y, m, d] = WEDDING.date.split("-").map(Number);
            const day = x => new Date(Date.UTC(y, m - 1, d + x)).toISOString().slice(0, 10).replace(/-/g, "");
            start = day(0); end = day(1);
        } else {
            const s = new Date(`${WEDDING.date}T${WEDDING.startTime}:00+05:30`);
            const e = WEDDING.endTime ? new Date(`${WEDDING.date}T${WEDDING.endTime}:00+05:30`) : new Date(s.getTime() + 3 * 36e5);
            start = compact(s); end = compact(e);
        }

        googleLink.href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
            "&text=" + encodeURIComponent(WEDDING.title) +
            "&dates=" + start + "/" + end +
            "&details=" + encodeURIComponent(WEDDING.description) +
            "&location=" + encodeURIComponent(WEDDING.location);

        const esc = t => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
        const ics = [
            "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Khiwan and Megha//Wedding Invitation//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            "UID:khiwan-megha-wedding-" + WEDDING.date + "@wedding-invitation",
            "DTSTAMP:" + compact(new Date()),
            allDay ? "DTSTART;VALUE=DATE:" + start : "DTSTART:" + start,
            allDay ? "DTEND;VALUE=DATE:" + end : "DTEND:" + end,
            "SUMMARY:" + esc(WEDDING.title),
            "LOCATION:" + esc(WEDDING.location),
            "DESCRIPTION:" + esc(WEDDING.description),
            "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + esc(WEDDING.title), "END:VALARM",
            "END:VEVENT", "END:VCALENDAR"
        ].join("\r\n");
        icsLink.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);

        btn.addEventListener("click", () => {
            const open = options.hidden;
            options.hidden = !open;
            btn.setAttribute("aria-expanded", open);
        });
    })();

    /* ---------- Our journey carousel ---------- */
    // Native scroll-snap does the swiping (smooth on touch). This adds arrows, dots, keyboard,
    // mouse-drag, the "active slide" highlight and a gentle autoplay that stops once the visitor interacts.
    (function setupCarousel() {
        const root = document.getElementById("journeyCarousel");
        if (!root) return;
        const track = root.querySelector(".fp-track");
        const slides = [...track.querySelectorAll(".fp-slide")];
        const dotsBox = root.querySelector(".fp-dots");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const AUTOPLAY_MS = 4800;   // time between slides while autoplaying
        let index = 0, ticking = false, timer = null, interacted = false, visible = false;

        const dots = slides.map((_, i) => {
            const b = document.createElement("button");
            b.type = "button"; b.className = "fp-dot";
            b.setAttribute("aria-label", "Go to photo " + (i + 1));
            b.addEventListener("click", () => { userAction(); goTo(i); });
            dotsBox.appendChild(b);
            return b;
        });

        const offsetFor = i => slides[i].offsetLeft - (track.clientWidth - slides[i].offsetWidth) / 2;
        function goTo(i, instant) {
            i = (i + slides.length) % slides.length;
            track.scrollTo({ left: offsetFor(i), behavior: instant || reduce ? "auto" : "smooth" });
        }
        function nearest() {
            const mid = track.scrollLeft + track.clientWidth / 2;
            let best = 0, bestD = Infinity;
            slides.forEach((s, i) => {
                const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
                if (d < bestD) { bestD = d; best = i; }
            });
            return best;
        }
        function setActive(i) {
            index = i;
            slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
            dots.forEach((d, k) => { d.classList.toggle("is-active", k === i); d.setAttribute("aria-current", k === i ? "true" : "false"); });
        }
        track.addEventListener("scroll", () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { ticking = false; setActive(nearest()); });
        }, { passive: true });

        /* arrows + keyboard */
        root.querySelector(".fp-car-prev").addEventListener("click", () => { userAction(); goTo(index - 1); });
        root.querySelector(".fp-car-next").addEventListener("click", () => { userAction(); goTo(index + 1); });
        track.addEventListener("keydown", e => {
            const k = e.key;
            if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "Home" && k !== "End") return;
            e.preventDefault(); userAction();
            goTo(k === "ArrowRight" ? index + 1 : k === "ArrowLeft" ? index - 1 : k === "Home" ? 0 : slides.length - 1);
        });

        /* mouse drag (touch and trackpads already scroll natively) */
        let drag = null;
        track.addEventListener("pointerdown", e => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            userAction();
            drag = { x: e.clientX, left: track.scrollLeft };
            track.classList.add("is-dragging");
        });
        window.addEventListener("pointermove", e => { if (drag) track.scrollLeft = drag.left - (e.clientX - drag.x); });
        const endDrag = () => {
            if (!drag) return;
            drag = null;
            track.classList.remove("is-dragging");
            goTo(nearest());
        };
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);
        track.addEventListener("dragstart", e => e.preventDefault());

        /* autoplay: only while on screen, stops for good after any interaction, never with reduced motion */
        function stopTimer() { clearInterval(timer); timer = null; }
        function startTimer() {
            if (reduce || interacted || timer || !visible) return;
            timer = setInterval(() => {
                if (index >= slides.length - 1) return stopTimer();   // stop on the last photo
                goTo(index + 1);
            }, AUTOPLAY_MS);
        }
        function userAction() { interacted = true; stopTimer(); }
        track.addEventListener("touchstart", userAction, { passive: true });
        track.addEventListener("wheel", e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) userAction(); }, { passive: true });
        new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startTimer() : stopTimer(); }, { threshold: 0.6 }).observe(root);

        /* keep the current slide centred when the screen size or orientation changes */
        let rz;
        window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => goTo(index, true), 120); });

        setActive(0);
    })();

    /*
    // ---------- RSVP ---------- //
    // Set your WhatsApp number (country code, digits only, e.g. "919876543210") to receive replies.
    const WHATSAPP_NUMBER = "917800879801";
    const form = document.getElementById("rsvpForm");
    const status = document.getElementById("rsvpStatus");

    form.addEventListener("submit", e => {
        e.preventDefault();
        const f = new FormData(form);
        const name = (f.get("name") || "").trim();
        if (!name || !f.get("attending")) {
            status.textContent = "Please add your name and let us know if you can join.";
            return;
        }
        const yes = f.get("attending") === "yes";
        const msg = [
            `RSVP from ${name}`,
            yes ? `Joining us (${f.get("guests")} guest${f.get("guests") > 1 ? "s" : ""})` : "Unable to attend",
            f.get("phone") ? `Contact: ${f.get("phone")}` : "",
            f.get("message") ? `Message: ${f.get("message")}` : ""
        ].filter(Boolean).join("\n");

        if (WHATSAPP_NUMBER) {
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
        } else {
            console.warn("RSVP not delivered: set WHATSAPP_NUMBER in js/page.js.\n" + msg);
        }
        status.textContent = yes ? `Thank you, ${name}. We can’t wait to celebrate with you.` : `Thank you, ${name}. You will be missed.`;
        form.reset();
    });
})();
*/

/* ---------- GOOGLE SHEETS RSVP ---------- */


// ---------- GOOGLE SHEETS RSVP ---------- //

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyAu4vld4YBxZQfBo5Tu7mS33M2Avj3X8AuL8bMIIA6HjZMqN7lKdR1LD3ljsPuFNu6/exec";

const form = document.getElementById("rsvpForm");
const status = document.getElementById("rsvpStatus");
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const f = new FormData(form);

    const name = (f.get("name") || "").trim();
    const attending = f.get("attending");

    if (!name || !attending) {
        status.textContent =
            "Please add your name and attendance confirmation.";
        return;
    }

    const data = {
        name: name,
        phone: (f.get("phone") || "").trim(),
        guests: f.get("guests"),
        attending: attending === "yes" ? "Yes" : "No",
        message: (f.get("message") || "").trim()
    };

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    status.textContent = "";

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(data)
        });

        // no-cors cannot confirm whether Google saved the entry.
        // Show a pending message rather than claiming success.
        status.textContent =
            "Your response has been submitted. Thank you!";

        form.reset();

    } catch (error) {
        console.error("RSVP Error:", error);

        status.textContent =
            "Something went wrong. Please try again.";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent =
            "Kindly send your confirmation";
    }
});
})();