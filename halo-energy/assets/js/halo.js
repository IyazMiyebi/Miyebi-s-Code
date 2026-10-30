// Halo Energy — site behaviour. No dependencies.

// Where enquiry and partner forms are posted. Point this at the CRM / form handler
// (HubSpot, Zoho, Formspree, a serverless function…) before launch. While it is empty,
// forms validate normally but tell the visitor plainly that nothing was sent.
const HALO_CONFIG = {
  formEndpoint: "",
  maxUploadMB: 20,
};

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Navigation ---------- */
function initNav() {
  const toggle = $(".nav-toggle");
  if (!toggle) return;
  const close = () => {
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  matchMedia("(min-width: 1081px)").addEventListener("change", close);
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window) || reducedMotion) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach((el) => io.observe(el));
}

/* ---------- Hero network canvas ---------- */
// Slow-drifting nodes joined when near each other: the "connected operations" motif.
function initNetwork() {
  const canvas = $(".hero__canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, dpr, nodes = [], raf = 0, visible = true;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(70, (w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: w * (0.35 + Math.random() * 0.65),
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() < 0.12 ? 2.6 : 1.4,
    }));
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const max = 150;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > max) continue;
        ctx.strokeStyle = `rgba(92,224,194,${0.22 * (1 - d / max)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = n.r > 2 ? "rgba(92,224,194,.95)" : "rgba(232,240,242,.55)";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      if (n.r > 2) {
        ctx.strokeStyle = "rgba(92,224,194,.25)";
        ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function tick() {
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < w * 0.3 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  resize();
  addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); if (!reducedMotion && visible) tick(); });
  if (reducedMotion) return;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) tick();
  }).observe(canvas);
}

/* ---------- Illustrative dashboard tooltips ---------- */
function initBars() {
  for (const chart of $$("[data-bars]")) {
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.setAttribute("role", "status");
    chart.style.position = "relative";
    chart.append(tip);
    for (const row of $$(".bars__row", chart)) {
      const show = () => {
        const fill = $(".bars__fill", row);
        const box = chart.getBoundingClientRect();
        const f = fill.getBoundingClientRect();
        tip.innerHTML = `<b>${row.dataset.label}</b>${row.dataset.value}% utilisation · sample data`;
        tip.style.left = `${Math.min(Math.max(f.right - box.left, 90), box.width - 90)}px`;
        tip.style.top = `${f.top - box.top}px`;
        tip.classList.add("is-on");
      };
      const hide = () => tip.classList.remove("is-on");
      row.addEventListener("pointerenter", show);
      row.addEventListener("pointerleave", hide);
      row.addEventListener("focus", show);
      row.addEventListener("blur", hide);
    }
  }
}

/* ---------- Equipment catalogue filter ---------- */
function initCatalogue() {
  const bar = $("[data-filters]");
  if (!bar) return;
  const items = $$("[data-cat]");
  const count = $("[data-filter-count]");
  bar.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$(".chip", bar).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    const f = chip.dataset.filter;
    let shown = 0;
    for (const item of items) {
      const match = f === "all" || item.dataset.cat.split(" ").includes(f);
      item.hidden = !match;
      if (match) shown++;
    }
    if (count) count.textContent = `${shown} equipment ${shown === 1 ? "category" : "categories"} shown`;
  });
}

/* ---------- Forms ---------- */
function fmtSize(bytes) {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function initDrop(drop) {
  const input = $("input[type=file]", drop);
  const list = $(`#${drop.dataset.list}`);
  const render = () => {
    list.innerHTML = "";
    for (const f of input.files) {
      const li = document.createElement("li");
      li.innerHTML = `<span></span><span>${fmtSize(f.size)}</span>`;
      li.firstChild.textContent = f.name;
      list.append(li);
    }
  };
  input.addEventListener("change", render);
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("is-over")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) { input.files = e.dataTransfer.files; render(); }
  });
}

function fieldError(field, msg) {
  const wrap = field.closest(".field") || field.closest("fieldset");
  const err = wrap && $(".err", wrap);
  field.setAttribute("aria-invalid", msg ? "true" : "false");
  if (err) { err.textContent = msg || ""; err.classList.toggle("is-on", !!msg); }
}

function validate(form) {
  let first = null;
  for (const el of $$("input, select, textarea", form)) {
    if (el.closest("[hidden]") || el.type === "hidden") continue;
    let msg = "";
    if (el.type === "file") {
      const total = [...el.files].reduce((s, f) => s + f.size, 0);
      if (total > HALO_CONFIG.maxUploadMB * 1048576) msg = `Please keep attachments under ${HALO_CONFIG.maxUploadMB} MB in total.`;
    } else if (el.type === "checkbox" && el.dataset.group) {
      continue;
    } else if (!el.checkValidity()) {
      if (el.validity.valueMissing) msg = el.type === "checkbox" ? "Please confirm to continue." : el.type === "radio" ? "Choose one option." : "This field is required.";
      else if (el.validity.typeMismatch && el.type === "email") msg = "Enter a valid email address.";
      else msg = el.validationMessage;
    }
    fieldError(el, msg);
    if (msg && !first) first = el;
  }
  // Checkbox groups that need at least one choice
  for (const group of $$("[data-require-one]", form)) {
    if (group.closest("[hidden]")) continue;
    const boxes = $$("input[type=checkbox]", group);
    const ok = boxes.some((b) => b.checked);
    const err = $(".err", group);
    if (err) { err.textContent = ok ? "" : "Choose at least one option."; err.classList.toggle("is-on", !ok); }
    if (!ok && !first) first = boxes[0];
  }
  return first;
}

function initForm(form) {
  const status = $(".form__status", form);
  $$(".drop", form).forEach(initDrop);

  // Pre-select a requirement from the URL, e.g. contact.html?need=equipment
  const need = new URLSearchParams(location.search).get("need");
  if (need) {
    const box = $(`input[name="requirements"][value="${CSS.escape(need)}"]`, form);
    if (box) box.checked = true;
  }

  // Conditional sections: <div data-show-when="partnerType=equipment-owner">
  const conditionals = $$("[data-show-when]", form);
  const syncConditionals = () => {
    for (const block of conditionals) {
      const [name, value] = block.dataset.showWhen.split("=");
      const current = new FormData(form).getAll(name);
      block.hidden = !current.includes(value);
    }
  };
  form.addEventListener("change", syncConditionals);
  const type = new URLSearchParams(location.search).get("type");
  if (type) {
    const radio = $(`input[name="partnerType"][value="${CSS.escape(type)}"]`, form);
    if (radio) radio.checked = true;
  }
  syncConditionals();

  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true" && e.target.checkValidity()) fieldError(e.target, "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const show = (kind, html) => {
      status.className = `form__status form__status--${kind} is-on`;
      status.innerHTML = html;
      status.focus();
    };
    const invalid = validate(form);
    if (invalid) {
      show("err", "Some details are missing or need attention. They are highlighted above.");
      invalid.focus();
      return;
    }
    if (!HALO_CONFIG.formEndpoint) {
      show("info", "<b>Preview only.</b> Your details passed validation, but this site is not yet connected to an enquiry inbox, so nothing has been sent.");
      return;
    }
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      const res = await fetch(HALO_CONFIG.formEndpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(res.statusText);
      form.reset();
      $$(".filelist", form).forEach((l) => (l.innerHTML = ""));
      syncConditionals();
      show("ok", `<b>Thank you — your ${form.dataset.kind || "enquiry"} has been received.</b> A member of the Halo team will review it and respond with next steps.`);
    } catch {
      show("err", "We couldn't send this just now. Please try again in a few minutes.");
    } finally {
      button.disabled = false;
    }
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  initNav();
  initReveal();
  initNetwork();
  initBars();
  initCatalogue();
  $$("form[data-halo-form]").forEach(initForm);
});
