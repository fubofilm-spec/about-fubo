(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var top = document.querySelector(".top");
  var menu = document.querySelector(".menu");
  var rail = document.getElementById("rail");
  var main = document.querySelector(".main");
  var closeBtn = rail.querySelector(".rail-close");
  var scrim = document.querySelector(".scrim");
  var status = document.getElementById("status");
  var currentLabel = document.querySelector(".top-current");
  var feature = document.getElementById("commercial-feature");
  var sheet = document.getElementById("commercial-sheet");
  var live = document.querySelector(".filter-live");
  var unmarked = document.querySelector(".unmarked");
  var viewer = document.getElementById("viewer");
  var player = document.getElementById("player");
  var labels = {
    intro: "01 介绍",
    commercial: "02 商业作品",
    dop: "03 摄影指导",
    author: "04 作者作品",
    home: "05 故乡",
    vgent: "06 VGENT",
    foptic: "07 FOPTIC",
    media: "08 自媒体",
    cases: "09 完整案例",
    archive: "10 档案",
    contact: "11 联系"
  };

  if ("scrollRestoration" in history) history.scrollRestoration = "auto";

  function focusable(root) {
    return Array.prototype.filter.call(root.querySelectorAll("a, button"), function (el) {
      return !el.disabled && el.getClientRects().length;
    });
  }

  function setOpen(open) {
    rail.classList.toggle("open", open);
    document.body.classList.toggle("lock", open);
    menu.setAttribute("aria-expanded", open ? "true" : "false");
    scrim.hidden = !open;
    scrim.classList.toggle("is-on", open);
    main.inert = open;
    if (open) {
      var current = rail.querySelector("[aria-current='true']");
      if (current) current.scrollIntoView({ block: "nearest" });
      closeBtn.focus();
    } else {
      menu.focus();
    }
  }

  menu.addEventListener("click", function () {
    setOpen(menu.getAttribute("aria-expanded") !== "true");
  });
  closeBtn.addEventListener("click", function () { setOpen(false); });
  scrim.addEventListener("click", function () { setOpen(false); });
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

  function jumpTo(target) {
    var distance = Math.abs(target.getBoundingClientRect().top);
    var behavior = reduce || distance > window.innerHeight * 2 ? "auto" : "smooth";
    target.scrollIntoView({ behavior: behavior, block: "start" });
  }

  rail.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href") || "";
      var target = id.charAt(0) === "#" ? document.querySelector(id) : null;
      setOpen(false);
      if (!target) return;
      event.preventDefault();
      jumpTo(target);
      if (location.hash !== id) history.pushState(history.state, "", id);
    });
  });

  var navLinks = Array.prototype.slice.call(rail.querySelectorAll("a[href^='#']"));
  var sections = navLinks.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);

  function mark(id) {
    navLinks.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    if (currentLabel) currentLabel.textContent = labels[id] || "";
  }

  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) mark(entry.target.id);
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 });
    sections.forEach(function (section) { seen.observe(section); });
    var sentinel = document.getElementById("status");
    if (sentinel) {
      new IntersectionObserver(function (entries) {
        top.classList.toggle("is-stuck", !entries[0].isIntersecting);
      }).observe(sentinel);
    }
  }

  var hide = document.querySelector(".status-hide");
  if (hide && status) hide.addEventListener("click", function () { status.hidden = true; });

  var cards = Array.prototype.slice.call(document.querySelectorAll("#commercial-feature .work, #commercial-sheet .work"));
  cards.forEach(function (card, index) {
    if (!card.id) card.id = "work-" + (index + 1);
  });
  var view = "grid";
  var filter = "all";

  function counts() {
    var all = cards.length;
    var liveN = cards.filter(function (card) { return card.getAttribute("data-kind") === "live"; }).length;
    var aigcN = cards.filter(function (card) { return card.getAttribute("data-kind") === "aigc"; }).length;
    var blank = cards.filter(function (card) { return !card.getAttribute("data-kind"); }).length;
    return { all: all, live: liveN, aigc: aigcN, blank: blank };
  }
  function paintCounts() {
    var tally = counts();
    document.querySelectorAll("[data-count]").forEach(function (node) {
      node.textContent = tally[node.getAttribute("data-count")];
    });
  }
  function visibleCards() {
    return cards.filter(function (card) { return !card.hidden; });
  }
  function nearestCard() {
    var best = null;
    var bestDist = Infinity;
    visibleCards().forEach(function (card) {
      var topEdge = card.getBoundingClientRect().top;
      var dist = Math.abs(topEdge);
      if (dist < bestDist) { best = card; bestDist = dist; }
    });
    return best;
  }
  function announce() {
    var shown = visibleCards().length;
    if (live) live.textContent = "显示 " + shown + " / " + cards.length + " 条";
    var tally = counts();
    if (unmarked) {
      if (filter !== "all" && tally.blank) {
        unmarked.hidden = false;
        unmarked.textContent = "另有 " + tally.blank + " 条未标注手段，见「全部」。";
      } else {
        unmarked.hidden = true;
        unmarked.textContent = "";
      }
    }
  }
  function applyFilter() {
    cards.forEach(function (card) {
      var kind = card.getAttribute("data-kind") || "";
      card.hidden = !(filter === "all" || kind === filter);
    });
    announce();
  }
  function applyView(next, keepPlace) {
    var anchor = keepPlace ? nearestCard() : null;
    var before = anchor ? anchor.getBoundingClientRect().top : 0;
    view = next;
    var list = view === "list";
    feature.classList.toggle("is-list", list);
    sheet.classList.toggle("is-list", list);
    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-view") === view ? "true" : "false");
    });
    if (anchor) {
      var after = anchor.getBoundingClientRect().top;
      window.scrollBy(0, after - before);
    }
  }
  function writeUrl() {
    var params = new URLSearchParams(location.search);
    params.delete("work");
    if (view === "list") params.set("view", "list");
    else params.delete("view");
    if (filter !== "all") params.set("type", filter);
    else params.delete("type");
    var qs = params.toString();
    var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    history.replaceState({ view: view, type: filter }, "", url);
  }
  function readUrl() {
    var params = new URLSearchParams(location.search);
    var wantedView = params.get("view") === "list" ? "list" : "grid";
    var wanted = params.get("type");
    if (wanted !== "live" && wanted !== "aigc") wanted = "all";
    filter = wanted;
    applyView(wantedView, false);
    applyFilter();
    document.querySelectorAll("[data-filter]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-filter") === filter ? "true" : "false");
    });
  }

  paintCounts();
  readUrl();

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyView(button.getAttribute("data-view"), true);
      writeUrl();
    });
  });
  document.querySelectorAll("[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var anchor = nearestCard();
      filter = button.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach(function (other) {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      applyFilter();
      if (anchor && !anchor.hidden) {
        var topEdge = anchor.getBoundingClientRect().top;
        if (Math.abs(topEdge) > 80) anchor.scrollIntoView({ behavior: "auto", block: "start" });
      } else {
        document.getElementById("commercial").scrollIntoView({ behavior: "auto", block: "start" });
      }
      writeUrl();
    });
  });

  document.querySelectorAll("img").forEach(function (img) {
    if (img.getAttribute("fetchpriority") === "high") return;
    img.classList.add("defer");
    function show() { img.classList.add("is-in"); }
    if (img.complete && img.naturalWidth) {
      img.classList.add("is-in");
      return;
    }
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", show, { once: true });
  });

  var pushedModal = false;
  var fromPop = false;
  var opener = null;
  var savedScroll = 0;

  function rememberScroll() { savedScroll = window.scrollY; }

  function fadeOpen(dialog) {
    dialog.classList.remove("is-out");
    dialog.showModal();
    if (reduce) {
      dialog.classList.add("is-in");
      return;
    }
    requestAnimationFrame(function () { dialog.classList.add("is-in"); });
  }
  function fadeClose(dialog, done) {
    function finish() {
      dialog.classList.remove("is-in", "is-out");
      dialog.dataset.closing = "";
      if (dialog.open) dialog.close();
      if (done) done();
      window.scrollTo(0, savedScroll);
      if (opener && opener.focus) opener.focus();
    }
    if (reduce) { finish(); return; }
    dialog.classList.add("is-out");
    window.setTimeout(finish, 120);
  }

  function closeModal(dialog, viaPop) {
    if (dialog.dataset.closing === "1") return;
    if (!dialog.open && !dialog.classList.contains("is-in")) return;
    dialog.dataset.closing = "1";
    var shouldBack = !viaPop && history.state && history.state.modal;
    pushedModal = false;
    fadeClose(dialog, function () {
      var slot = dialog.querySelector(".player-slot");
      if (slot) slot.replaceChildren();
    });
    if (shouldBack) history.back();
  }

  function openPlayer(button) {
    if (player.open || viewer.open) return;
    rememberScroll();
    opener = button;
    var bvid = button.getAttribute("data-bvid");
    var page = button.getAttribute("data-page");
    var label = button.getAttribute("data-label") || "视频";
    var poster = player.querySelector(".player-poster");
    var img = button.querySelector("img");
    poster.src = (img && (img.currentSrc || img.src)) || "";
    poster.alt = label;
    player.querySelector(".player-open").href = page;
    player.querySelector(".player-open").textContent = "在 B 站打开";
    var iframe = document.createElement("iframe");
    iframe.src = "https://player.bilibili.com/player.html?bvid=" + encodeURIComponent(bvid) + "&autoplay=0";
    iframe.title = label;
    iframe.setAttribute("allowfullscreen", "true");
    iframe.allow = "fullscreen";
    player.querySelector(".player-slot").replaceChildren(iframe);
    var url = new URL(location.href);
    url.searchParams.set("work", bvid);
    history.pushState({ modal: bvid }, "", url.pathname + url.search + location.hash);
    pushedModal = true;
    fadeOpen(player);
    player.querySelector(".player-close").focus();
  }

  var zoomables = Array.prototype.slice.call(document.querySelectorAll("[data-zoom]"));
  var zoomIndex = 0;
  function renderZoom() {
    var fig = zoomables[zoomIndex];
    var img = fig.querySelector("img");
    var shot = viewer.querySelector("img");
    shot.src = img.currentSrc || img.src;
    shot.alt = img.alt;
    viewer.querySelector("figcaption").textContent = (fig.querySelector("figcaption") || {}).textContent || img.alt;
    viewer.querySelector(".viewer-count").textContent = (zoomIndex + 1) + " / " + zoomables.length;
    [zoomIndex - 1, zoomIndex + 1].forEach(function (i) {
      var neighbor = zoomables[(i + zoomables.length) % zoomables.length];
      var preload = new Image();
      preload.src = neighbor.querySelector("img").src;
    });
  }
  function openZoom(index, source) {
    if (player.open || viewer.open) return;
    rememberScroll();
    opener = source;
    zoomIndex = index;
    renderZoom();
    history.pushState({ modal: "zoom" }, "", location.href);
    pushedModal = true;
    fadeOpen(viewer);
  }

  document.querySelectorAll("[data-bvid]").forEach(function (button) {
    button.addEventListener("click", function () { openPlayer(button); });
  });
  zoomables.forEach(function (fig, index) {
    fig.style.cursor = "zoom-in";
    fig.addEventListener("click", function () { openZoom(index, fig); });
  });

  function onDialogClose(dialog) {
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeModal(dialog, false);
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeModal(dialog, false);
    });
  }
  onDialogClose(player);
  onDialogClose(viewer);
  player.querySelector(".player-close").addEventListener("click", function () { closeModal(player, false); });
  viewer.querySelector(".viewer-close").addEventListener("click", function () { closeModal(viewer, false); });
  viewer.querySelector(".viewer-prev").addEventListener("click", function () {
    zoomIndex = (zoomIndex - 1 + zoomables.length) % zoomables.length;
    renderZoom();
  });
  viewer.querySelector(".viewer-next").addEventListener("click", function () {
    zoomIndex = (zoomIndex + 1) % zoomables.length;
    renderZoom();
  });

  var touchX = 0;
  viewer.addEventListener("touchstart", function (event) {
    touchX = event.changedTouches[0].clientX;
  }, { passive: true });
  viewer.addEventListener("touchend", function (event) {
    var dx = event.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) < 48) return;
    zoomIndex = (zoomIndex + (dx < 0 ? 1 : -1) + zoomables.length) % zoomables.length;
    renderZoom();
  }, { passive: true });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (player.open) { event.preventDefault(); closeModal(player, false); return; }
      if (viewer.open) { event.preventDefault(); closeModal(viewer, false); return; }
      if (rail.classList.contains("open")) setOpen(false);
    }
    if (viewer.open) {
      if (event.key === "ArrowRight") viewer.querySelector(".viewer-next").click();
      if (event.key === "ArrowLeft") viewer.querySelector(".viewer-prev").click();
    }
  });

  window.addEventListener("popstate", function () {
    if (player.open) closeModal(player, true);
    else if (viewer.open) closeModal(viewer, true);
  });
})();
