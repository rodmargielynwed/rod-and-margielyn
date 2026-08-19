/* =========================================================
   Rod & Margielyn — site logic (vanilla JS)
   ========================================================= */
(function () {
  "use strict";

  /* =======================================================
     0. RSVP CONFIG  —  EDIT THIS ONE BLOCK
     -------------------------------------------------------
     Pick ONE backend by setting RSVP.mode:
       "formspree"  → paste your Formspree endpoint below
       "gscript"    → paste your Google Apps Script /exec URL below
       "demo"       → no backend; logs to console (for local testing)
     ======================================================= */
  var RSVP = {
    mode: "demo",
    formspreeEndpoint: "https://formspree.io/f/XXXXXXXX",           // ← replace XXXXXXXX
    gscriptEndpoint:  "https://script.google.com/macros/s/XXXX/exec" // ← replace with your /exec URL
  };

  /* =======================================================
     1. COUNTDOWN TIMER  →  Nov 14, 2026, 3:00 PM (PH time, UTC+8)
     ======================================================= */
  var WEDDING_DATE = new Date("2026-11-14T10:00:00+08:00").getTime();

  function pad(n) { return String(n).padStart(2, "0"); }

  function tickCountdown() {
    var now = Date.now();
    var diff = WEDDING_DATE - now;
    var box = document.getElementById("countdown");
    if (!box) return;

    if (diff <= 0) {
      box.innerHTML = '<p class="countdown__over">Today is the day. We\u2019re married! \u2665</p>';
      clearInterval(timerId);
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);

    setNum("days", days);
    setNum("hours", pad(hours));
    setNum("minutes", pad(mins));
    setNum("seconds", pad(secs));
  }
  function setNum(unit, val) {
    var el = document.querySelector('[data-unit="' + unit + '"]');
    if (el) el.textContent = val;
  }
  tickCountdown();
  var timerId = setInterval(tickCountdown, 1000);

  /* =======================================================
     2. STICKY NAV — add background after scrolling past hero
     ======================================================= */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 60) nav.classList.add("is-stuck");
    else nav.classList.remove("is-stuck");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* =======================================================
     3. SCROLL REVEAL — fade-in on scroll via IntersectionObserver
     ======================================================= */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* =======================================================
     4. RSVP FORM — validation + submission
     ======================================================= */
  var form = document.getElementById("rsvpForm");
  var statusEl = document.getElementById("formStatus");
  var submitBtn = document.getElementById("submitBtn");
  var attendanceSel = document.getElementById("attendance");
  var attendeesInput = document.getElementById("attendees");
  var guestsField = document.getElementById("guestsField");

  // Attendees only required/enabled when the guest is coming
  function syncAttendees() {
    var coming = attendanceSel.value === "Joyfully Accepts";
    attendeesInput.required = coming;
    attendeesInput.disabled = !coming;
    guestsField.style.opacity = coming ? "1" : ".5";
    if (!coming) { attendeesInput.value = ""; clearError(attendeesInput); }
  }
  attendanceSel.addEventListener("change", syncAttendees);
  syncAttendees();

  // ---- validation helpers ----
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(input, msg) {
    var field = input.closest(".field");
    field.classList.add("has-error");
    var p = field.querySelector('[data-error-for="' + input.id + '"]');
    if (p) p.textContent = msg;
  }
  function clearError(input) {
    var field = input.closest(".field");
    field.classList.remove("has-error");
    var p = field.querySelector('[data-error-for="' + input.id + '"]');
    if (p) p.textContent = "";
  }

  function validate() {
    var ok = true;
    var name = document.getElementById("guestName");
    var email = document.getElementById("email");

    if (!name.value.trim()) { setError(name, "Please tell us who's replying."); ok = false; }
    else clearError(name);

    if (!email.value.trim()) { setError(email, "We need an email to confirm."); ok = false; }
    else if (!EMAIL_RE.test(email.value.trim())) { setError(email, "That email doesn't look right."); ok = false; }
    else clearError(email);

    if (!attendanceSel.value) { setError(attendanceSel, "Let us know if you can make it."); ok = false; }
    else clearError(attendanceSel);

    if (attendanceSel.value === "Joyfully Accepts") {
      var n = parseInt(attendeesInput.value, 10);
      if (!attendeesInput.value.trim()) { setError(attendeesInput, "How many seats shall we save?"); ok = false; }
      else if (isNaN(n) || n < 1 || n > 10) { setError(attendeesInput, "Enter a number from 1 to 10."); ok = false; }
      else clearError(attendeesInput);
    }
    return ok;
  }

  // clear error as the user fixes a field
  ["guestName", "email", "attendees"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", function () { clearError(el); });
  });

  // ---- submit ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.textContent = "";
    statusEl.className = "rsvp__status";

    // honeypot: if filled, silently pretend success (it's a bot)
    if (form._gotcha && form._gotcha.value) { showSuccess(); form.reset(); return; }

    if (!validate()) {
      statusEl.textContent = "Please check the highlighted fields.";
      statusEl.classList.add("is-err");
      var firstErr = form.querySelector(".has-error input, .has-error select");
      if (firstErr) firstErr.focus();
      return;
    }

    var data = {
      guestName: form.guestName.value.trim(),
      email: form.email.value.trim(),
      attendance: form.attendance.value,
      attendees: form.attendance.value === "Joyfully Accepts" ? form.attendees.value : "0",
      notes: form.notes.value.trim(),
      submittedAt: new Date().toISOString()
    };

    setLoading(true);

    submitRSVP(data)
      .then(function () { showSuccess(); form.reset(); syncAttendees(); })
      .catch(function (err) {
        console.error(err);
        statusEl.textContent = "Something went wrong sending your RSVP. Please try again, or message us directly.";
        statusEl.classList.add("is-err");
      })
      .finally(function () { setLoading(false); });
  });

  function setLoading(on) {
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.textContent = on ? "Sending\u2026" : "Send our RSVP";
  }

  function showSuccess() {
    var coming = attendanceSel.value !== "Regretfully Declines";
    statusEl.textContent = coming
      ? "Thank you \u2014 your seat is saved. We can't wait to celebrate with you! \u2665"
      : "Thank you for letting us know. You'll be missed \u2014 sending love. \u2665";
    statusEl.className = "rsvp__status is-ok";
  }

  /* ---- backend dispatch ---- */
  function submitRSVP(data) {
    if (RSVP.mode === "formspree") return sendFormspree(data);
    if (RSVP.mode === "gscript")   return sendGScript(data);
    // demo
    return new Promise(function (resolve) {
      console.log("[DEMO] RSVP captured:", data);
      setTimeout(resolve, 700);
    });
  }

  // Formspree: JSON POST, expects a configured form endpoint
  function sendFormspree(data) {
    return fetch(RSVP.formspreeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error("Formspree responded " + res.status);
      return res.json();
    });
  }

  // Google Apps Script: POST as form-encoded to dodge CORS preflight.
  // Using no-cors keeps it simple; response is opaque, so we assume success.
  function sendGScript(data) {
    var body = new URLSearchParams(data).toString();
    return fetch(RSVP.gscriptEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    }).then(function () { return true; }); // opaque response — treat as sent
  }

  /* =======================================================
     5. Optional: swap in the couple photo automatically if present
     ======================================================= */
  (function tryCouplePhoto() {
    var slot = document.querySelector('[data-slot="couple"]');
    if (!slot) return;
    var img = new Image();
    img.src = "assets/couple.jpg";
    img.alt = "Rod and Margielyn";
    img.onload = function () { slot.replaceWith(img); };
  })();
})();
