(function () {
  var top = document.querySelector(".top");
  var menu = document.querySelector(".menu");
  var rail = document.getElementById("rail");
  var main = document.querySelector(".main");
  var closeBtn = rail.querySelector(".rail-close");
  var status = document.getElementById("status");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function focusable(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll("a, button"),
      function (el) { return !el.disabled && el.getClientRects().length; }
    );
  }
  function setOpen(open) {
    rail.classList.toggle("open", open);
    document.body.classList.toggle("lock", open);
    menu.setAttribute("aria-expanded", open ? "true" : "false");
    main.inert = open;
    if (open) closeBtn.focus();
    else menu.focus();
  }
  menu.addEventListener("click", function () {
    setOpen(menu.getAttribute("aria-expanded") !== "true");
  });
  closeBtn.addEventListener("click", function () { setOpen(false); });
  rail.addEventListener("keydown", function (event) {
    if (!rail.classList.contains("open") || event.key !== "Tab") return;
    var items = focusable(rail);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  rail.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href") || "";
      var target = id.charAt(0) === "#" ? document.querySelector(id) : null;
      setOpen(false);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.pushState(null, "", id);
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && rail.classList.contains("open")) setOpen(false);
  });
  window.addEventListener("popstate", function () {
    if (!location.hash) return;
    var target = document.querySelector(location.hash);
    if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
  });
  window.addEventListener("scroll", function () {
    top.classList.toggle("is-stuck", window.scrollY > 8);
  }, { passive: true });

  var navLinks = Array.prototype.slice.call(rail.querySelectorAll("a[href^='#']"));
  var sections = navLinks.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);
  function mark(id) {
    navLinks.forEach(function (link) {
      var on = link.getAttribute("href") === "#" + id;
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) mark(entry.target.id);
      });
    }, { rootMargin: "-30% 0px -55% 0px", threshold: 0.01 });
    sections.forEach(function (section) { seen.observe(section); });
  }

  var hide = document.querySelector(".status-hide");
  if (hide) hide.addEventListener("click", function () { status.hidden = true; });

  var sheet = document.getElementById("commercial-sheet");
  var feature = document.getElementById("commercial-feature");
  var filter = "all";
  function apply() {
    [feature, sheet].forEach(function (box) {
      if (!box) return;
      Array.prototype.forEach.call(box.children, function (card) {
        var kind = card.getAttribute("data-kind") || "";
        var show = filter === "all" || kind === filter;
        card.hidden = !show;
      });
    });
  }
  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      var list = button.getAttribute("data-view") === "list";
      feature.classList.toggle("is-list", list);
      sheet.classList.toggle("is-list", list);
      document.querySelectorAll("[data-view]").forEach(function (other) {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
    });
  });
  document.querySelectorAll("[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      filter = button.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach(function (other) {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      apply();
    });
  });

  var thumb = document.createElement("img");
  thumb.className = "thumb";
  thumb.alt = "";
  thumb.hidden = true;
  document.body.appendChild(thumb);
  var canHover = window.matchMedia("(hover: hover) and (min-width: 900px)").matches;
  if (canHover) {
    document.querySelectorAll(".is-list, #commercial-feature, #commercial-sheet").forEach(function () {});
    [feature, sheet].forEach(function (box) {
      box.addEventListener("mousemove", function (event) {
        if (!box.classList.contains("is-list")) { thumb.hidden = true; return; }
        var card = event.target.closest(".work");
        var img = card && card.querySelector("img");
        if (!img) { thumb.hidden = true; return; }
        thumb.src = img.currentSrc || img.src;
        thumb.hidden = false;
        var x = Math.min(event.clientX + 16, window.innerWidth - 256);
        var y = Math.min(event.clientY + 16, window.innerHeight - 160);
        thumb.style.left = x + "px";
        thumb.style.top = y + "px";
      });
      box.addEventListener("mouseleave", function () { thumb.hidden = true; });
    });
  }

  var zoomables = Array.prototype.slice.call(document.querySelectorAll("[data-zoom]"));
  var box = document.querySelector(".lightbox");
  var shot = box.querySelector("img");
  var cap = box.querySelector("figcaption");
  var index = 0;
  function show(i) {
    index = (i + zoomables.length) % zoomables.length;
    var fig = zoomables[index];
    var img = fig.querySelector("img");
    shot.src = img.currentSrc || img.src;
    shot.alt = img.alt;
    cap.textContent = (fig.querySelector("figcaption") || {}).textContent || img.alt;
    box.hidden = false;
    document.body.classList.add("lock");
  }
  function closeLight() {
    box.hidden = true;
    shot.removeAttribute("src");
    document.body.classList.remove("lock");
  }
  zoomables.forEach(function (fig, i) {
    fig.style.cursor = "zoom-in";
    fig.addEventListener("click", function () { show(i); });
  });
  box.querySelector(".lb-close").addEventListener("click", closeLight);
  box.querySelector(".lb-prev").addEventListener("click", function () { show(index - 1); });
  box.querySelector(".lb-next").addEventListener("click", function () { show(index + 1); });
  document.addEventListener("keydown", function (event) {
    if (box.hidden) return;
    if (event.key === "Escape") closeLight();
    if (event.key === "ArrowRight") show(index + 1);
    if (event.key === "ArrowLeft") show(index - 1);
  });
})();
