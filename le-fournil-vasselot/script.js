(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Flavours ------------------------------------------------------ */
  var FLAVORS = {
    caramel:   { base: "#d9944a", edge: "#b8742f", chip: "#f0a93b", chipDark: "#a8641a", salt: true,  peanuts: false, crumbs: false, label: "caramel beurre salé" },
    cacahuete: { base: "#cf9a58", edge: "#ab7a3b", chip: "#4a2a1b", chipDark: "#2b1710", salt: false, peanuts: true,  crumbs: false, label: "cacahuète" },
    speculoos: { base: "#a85a2c", edge: "#873f18", chip: "#d08a52", chipDark: "#7a3912", salt: false, peanuts: false, crumbs: true,  label: "spéculoos" }
  };

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Wobbly circle outline, smoothed with quadratic curves.
  function blobPath(rand, cx, cy, r, points) {
    var pts = [], i;
    for (i = 0; i < points; i++) {
      var a = (i / points) * Math.PI * 2;
      var rr = r * (0.94 + rand() * 0.08);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    var d = "M" + mid(pts[points - 1], pts[0]).join(",");
    for (i = 0; i < points; i++) {
      var next = pts[(i + 1) % points];
      var m = mid(pts[i], next);
      d += " Q" + pts[i].join(",") + " " + m.join(",");
    }
    return d + "Z";
  }
  function mid(a, b) { return [((a[0] + b[0]) / 2).toFixed(1), ((a[1] + b[1]) / 2).toFixed(1)]; }

  function scatter(rand, count, radius, minDist) {
    var out = [], tries = 0;
    while (out.length < count && tries < 600) {
      tries++;
      var a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * radius;
      var p = { x: 120 + Math.cos(a) * d, y: 120 + Math.sin(a) * d };
      var ok = true;
      for (var i = 0; i < out.length; i++) {
        var dx = out[i].x - p.x, dy = out[i].y - p.y;
        if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
      }
      if (ok) out.push(p);
    }
    return out;
  }

  var maskCount = 0;

  function drawCookie(svg, key, bites) {
    var f = FLAVORS[key];
    var rand = rng(key.length * 97 + 11);
    svg.textContent = "";
    var maskId = "bite-mask-" + (++maskCount);

    var defs = el("defs", {}, svg);
    var mask = el("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 240, height: 240 }, defs);
    el("rect", { x: 0, y: 0, width: 240, height: 240, fill: "#fff" }, mask);
    bites.forEach(function (b) {
      el("circle", { cx: b.x, cy: b.y, r: b.r, fill: "#000" }, mask);
    });

    var g = el("g", { mask: "url(#" + maskId + ")" }, svg);
    var outline = blobPath(rand, 120, 120, 108, 18);
    el("path", { d: outline, fill: f.edge }, g);
    var inner = el("path", { d: blobPath(rand, 120, 118, 100, 18), fill: f.base }, g);
    inner.setAttribute("transform", "translate(0 -1)");

    // soft highlight
    el("ellipse", { cx: 92, cy: 78, rx: 52, ry: 30, fill: "#fff", opacity: 0.12, transform: "rotate(-24 92 78)" }, g);

    if (f.crumbs) {
      scatter(rand, 20, 88, 15).forEach(function (p) {
        el("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (2 + rand() * 4).toFixed(1), fill: f.chip, opacity: 0.85 }, g);
      });
      // glaze swirl
      el("path", { d: "M70 130 C90 100 130 160 160 112 S190 100 176 82", stroke: f.chip, "stroke-width": 7, "stroke-linecap": "round", fill: "none", opacity: 0.55 }, g);
    }

    var chunks = scatter(rand, f.peanuts ? 7 : 9, 82, 28);
    chunks.forEach(function (p) {
      var w = 15 + rand() * 9, h = 11 + rand() * 8, rot = (rand() * 80 - 40).toFixed(0);
      el("rect", { x: (p.x - w / 2).toFixed(1), y: (p.y - h / 2).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), rx: 3.5, fill: f.chip, transform: "rotate(" + rot + " " + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")" }, g);
      el("rect", { x: (p.x - w / 2 + 2).toFixed(1), y: (p.y - h / 2 + 2).toFixed(1), width: (w * 0.5).toFixed(1), height: 3, rx: 1.5, fill: "#fff", opacity: 0.22, transform: "rotate(" + rot + " " + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")" }, g);
    });

    if (f.peanuts) {
      scatter(rand, 9, 84, 20).forEach(function (p) {
        var rot = (rand() * 180).toFixed(0);
        var gp = el("g", { transform: "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ") rotate(" + rot + ")" }, g);
        el("ellipse", { rx: 8, ry: 5.5, fill: "#e8bd7e", stroke: "#b98a4a", "stroke-width": 1.2 }, gp);
        el("path", { d: "M-6 0 H6", stroke: "#b98a4a", "stroke-width": 1, opacity: 0.7 }, gp);
      });
    }

    if (f.salt) {
      scatter(rand, 16, 88, 12).forEach(function (p) {
        var s = 2.5 + rand() * 2.5;
        el("rect", { x: p.x.toFixed(1), y: p.y.toFixed(1), width: s.toFixed(1), height: s.toFixed(1), fill: "#fffaf0", opacity: 0.95, transform: "rotate(" + (rand() * 90).toFixed(0) + " " + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")" }, g);
      });
    }
  }

  /* ---- State --------------------------------------------------------- */
  var svg = document.querySelector("[data-cookie]");
  var biteBtn = document.querySelector("[data-bite]");
  var hint = document.querySelector("[data-hint]");
  var flavorButtons = Array.prototype.slice.call(document.querySelectorAll("[data-pick]"));
  var current = "caramel";
  var bites = [];

  var BITE_SPOTS = [
    { x: 196, y: 70, r: 34 },
    { x: 178, y: 188, r: 38 },
    { x: 50, y: 170, r: 40 }
  ];

  function render() { drawCookie(svg, current, bites); }

  function swapAnim() {
    if (reduceMotion) return;
    svg.classList.remove("swap");
    void svg.getBoundingClientRect();
    svg.classList.add("swap");
  }

  function pick(key) {
    current = key;
    bites = [];
    document.body.setAttribute("data-flavor", key);
    flavorButtons.forEach(function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-pick") === key ? "true" : "false");
      b.tabIndex = b.getAttribute("data-pick") === key ? 0 : -1;
    });
    render();
    swapAnim();
    hint.textContent = "Cookie " + FLAVORS[key].label + ". Touchez pour croquer.";
  }

  flavorButtons.forEach(function (b, i) {
    b.addEventListener("click", function () { pick(b.getAttribute("data-pick")); });
    b.addEventListener("keydown", function (e) {
      var dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var n = flavorButtons[(i + dir + flavorButtons.length) % flavorButtons.length];
      n.focus();
      pick(n.getAttribute("data-pick"));
    });
  });

  biteBtn.addEventListener("click", function () {
    if (bites.length >= BITE_SPOTS.length) {
      bites = [];
      hint.textContent = "Une autre ? Voilà.";
    } else {
      bites.push(BITE_SPOTS[bites.length]);
      hint.textContent = bites.length === BITE_SPOTS.length ? "Plus de cookie ! Touchez pour en reprendre un." : "Miam. Encore ?";
    }
    render();
  });

  /* ---- Opening hours ------------------------------------------------- */
  // Tuesday to Sunday, 07:00 to 20:00 (to be confirmed with the bakery).
  var OPEN = 7 * 60, CLOSE = 20 * 60;
  function parisNow() {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[get("weekday")], minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
  }

  function updateStatus() {
    var now = parisNow();
    var row = document.querySelector('[data-day="' + now.day + '"]');
    if (row) row.classList.add("today");

    var status = document.querySelector("[data-open-status]");
    var open = now.day !== 1 && now.minutes >= OPEN && now.minutes < CLOSE;
    status.hidden = false;
    status.setAttribute("data-state", open ? "open" : "closed");
    if (open) {
      status.textContent = "Ouvert maintenant, jusqu’à 20 h";
    } else if (now.day !== 1 && now.minutes < OPEN) {
      status.textContent = "Fermé, ouvre aujourd’hui à 7 h";
    } else {
      var next = now.day === 1 ? "mardi à 7 h" : now.day === 0 ? "mardi à 7 h" : "demain à 7 h";
      if (now.day === 0) next = "mardi à 7 h";
      status.textContent = "Fermé, ouvre " + next;
    }
  }

  /* ---- Photos: show placeholders until real files are dropped in ------ */
  Array.prototype.forEach.call(document.querySelectorAll("img[data-photo]"), function (img) {
    var box = img.parentNode;
    function ok() { box.classList.add("has-photo"); }
    function ko() { box.classList.add("no-photo"); }
    img.addEventListener("load", ok);
    img.addEventListener("error", ko);
    if (img.complete) { img.naturalWidth ? ok() : ko(); }
  });

  /* ---- Custom order -------------------------------------------------- */
  // Set the bakery's e-mail address here to enable the "Envoyer par e-mail" button.
  var CONTACT_EMAIL = "";

  var TYPE_LABELS = {
    anniversaire: "un gâteau d’anniversaire",
    mariage: "un gâteau ou des desserts pour un mariage ou une grande fête",
    cookies: "une boîte de cookies",
    viennoiseries: "un plateau de viennoiseries",
    sale: "un plateau salé",
    pain: "du pain en grande quantité",
    saison: "une spécialité de saison",
    autre: "une commande personnalisée"
  };

  var form = document.querySelector("[data-order]");
  if (form) {
    var dateInput = form.elements.date;
    var min = new Date(); min.setDate(min.getDate() + 3);
    dateInput.min = min.getFullYear() + "-" + String(min.getMonth() + 1).padStart(2, "0") + "-" + String(min.getDate()).padStart(2, "0");

    var result = form.querySelector("[data-result]");
    var resultText = form.querySelector("[data-result-text]");
    var mailBtn = form.querySelector("[data-result-mail]");
    var copyBtn = form.querySelector("[data-copy]");
    var copyStatus = form.querySelector("[data-copy-status]");

    var setError = function (id, input, bad) {
      document.getElementById(id).hidden = !bad;
      if (input) input.setAttribute("aria-invalid", bad ? "true" : "false");
    };
    var formatDate = function (v) {
      var p = v.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var type = form.querySelector('input[name="type"]:checked');
      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.trim();
      var date = form.elements.date.value;
      var phoneOk = phone.replace(/[^0-9+]/g, "").length >= 9;

      setError("err-type", null, !type);
      setError("err-date", form.elements.date, !date);
      setError("err-name", form.elements.name, !name);
      setError("err-phone", form.elements.phone, !phoneOk);

      if (!type || !date || !name || !phoneOk) {
        var first = !type ? form.querySelector('input[name="type"]') : !date ? form.elements.date : !name ? form.elements.name : form.elements.phone;
        first.focus();
        return;
      }

      var people = form.elements.people.value;
      var diet = form.elements.diet.value.trim();
      var details = form.elements.details.value.trim();
      var lines = ["Bonjour, je souhaite commander " + TYPE_LABELS[type.value] + (people ? " pour " + people + " personne" + (people > 1 ? "s" : "") : "") + ", à récupérer le " + formatDate(date) + "."];
      if (diet) lines.push("Allergies ou régime : " + diet + ".");
      if (details) lines.push("Mon idée : " + details);
      lines.push("Merci de me recontacter pour confirmer.", name + ", " + phone);
      var text = lines.join("\n");

      resultText.textContent = text;
      copyStatus.textContent = "";
      if (CONTACT_EMAIL) {
        mailBtn.hidden = false;
        mailBtn.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("Commande personnalisée") + "&body=" + encodeURIComponent(text);
      }
      result.hidden = false;
      result.focus();
      result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });

    copyBtn.addEventListener("click", function () {
      var text = resultText.textContent;
      var done = function () { copyStatus.textContent = "Message copié."; };
      var fail = function () { copyStatus.textContent = "Copie impossible : sélectionnez le texte ci-dessus."; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    });
  }

  pick("caramel");
  updateStatus();
})();
