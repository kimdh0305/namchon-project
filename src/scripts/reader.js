(function () {
  const manifest = window.__MANIFEST__;
  const toc = window.__TOC__;
  const writers = window.__WRITERS__ || [];
  const books = window.__BOOKS__ || [];
  if (!manifest) return;

  const pageStage = document.getElementById("page-stage");
  const bookEl = document.getElementById("book");
  const pageIndicator = document.getElementById("page-indicator");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageSearch = document.getElementById("page-search");
  const tocList = document.getElementById("toc-list");
  const writerSearch = document.getElementById("writer-search");
  const writerResults = document.getElementById("writer-results");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomLevel = document.getElementById("zoom-level");

  const totalPages = manifest.total_pages || 0;
  const pageWindow = manifest.page_window || 3;
  const currentBook = manifest.book_id;

  const minZoom = 1;
  const maxZoom = 2.5;
  const zoomStep = 0.1;

  let pageFlip = null;
  let currentIndex = getInitialPageIndex();
  let zoomScale = 1;
  let panX = 0;
  let panY = 0;

  let pointerPanning = false;
  let activePointerId = null;
  let pointerLastX = 0;
  let pointerLastY = 0;

  let touchPanning = false;
  let touchPanLastX = 0;
  let touchPanLastY = 0;

  let pinching = false;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isZoomed() {
    return zoomScale > minZoom + 0.001;
  }

  function getInitialPageIndex() {
    const params = new URLSearchParams(window.location.search);
    const page = Number(params.get("page") || "1");
    if (!Number.isFinite(page) || page < 1) return 0;
    if (page > totalPages) return totalPages - 1;
    return page - 1;
  }

  function createPageElement(pageData, pageNum) {
    const div = document.createElement("div");
    div.className = "page";

    const img = document.createElement("img");
    img.alt = "Page " + pageNum;
    img.setAttribute("data-src", pageData.image);
    img.loading = "lazy";
    img.decoding = "async";

    div.appendChild(img);
    return div;
  }

  function loadAround(index) {
    const start = Math.max(0, index - pageWindow);
    const end = Math.min(totalPages - 1, index + pageWindow);
    const pages = bookEl.querySelectorAll(".page img[data-src]");
    for (let i = start; i <= end; i += 1) {
      const img = pages[i];
      if (!img) continue;
      if (!img.getAttribute("src")) {
        img.setAttribute("src", img.getAttribute("data-src"));
      }
    }
  }

  function updatePageMeta(index) {
    const now = index + 1;
    pageIndicator.textContent = now + " / " + totalPages;
    pageSearch.value = String(now);
    history.replaceState({}, "", "?page=" + now);
    loadAround(index);
  }

  function clampPan() {
    if (!pageStage) return;
    if (!isZoomed()) {
      panX = 0;
      panY = 0;
      return;
    }

    const rect = pageStage.getBoundingClientRect();
    const maxX = Math.max(0, ((rect.width * zoomScale) - rect.width) / 2);
    const maxY = Math.max(0, ((rect.height * zoomScale) - rect.height) / 2);
    panX = clamp(panX, -maxX, maxX);
    panY = clamp(panY, -maxY, maxY);
  }

  function applyZoom() {
    clampPan();

    if (bookEl) {
      bookEl.style.transformOrigin = "center center";
      bookEl.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoomScale + ")";
    }

    if (pageStage) {
      pageStage.classList.toggle("is-zoomed", isZoomed());
      pageStage.classList.toggle("is-panning", pointerPanning || touchPanning);
    }

    if (zoomLevel) {
      zoomLevel.textContent = Math.round(zoomScale * 100) + "%";
    }

    if (zoomOutBtn) zoomOutBtn.disabled = zoomScale <= minZoom + 0.001;
    if (zoomInBtn) zoomInBtn.disabled = zoomScale >= maxZoom - 0.001;
  }

  function setZoom(nextScale) {
    const clamped = clamp(Math.round(nextScale * 100) / 100, minZoom, maxZoom);
    if (Math.abs(clamped - zoomScale) < 0.001) return;

    zoomScale = clamped;
    if (!isZoomed()) {
      panX = 0;
      panY = 0;
      pointerPanning = false;
      touchPanning = false;
      activePointerId = null;
    }
    applyZoom();
  }

  function initPageFlip() {
    if (!window.St || !window.St.PageFlip) {
      pageIndicator.textContent = "page-flip 로드 실패";
      return;
    }

    const nodes = manifest.pages.map((p, i) => createPageElement(p, i + 1));
    pageFlip = new window.St.PageFlip(bookEl, {
      width: 550,
      height: 740,
      size: "stretch",
      minWidth: 320,
      maxWidth: 1200,
      minHeight: 420,
      maxHeight: 1600,
      showCover: true,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      mobileScrollSupport: true,
      usePortrait: true,
      autoSize: true,
      flippingTime: 760,
      swipeDistance: 34,
      clickEventForward: true
    });

    pageFlip.loadFromHTML(nodes);

    loadAround(currentIndex);
    if (typeof pageFlip.flip === "function") {
      pageFlip.flip(currentIndex);
    } else if (typeof pageFlip.turnToPage === "function") {
      pageFlip.turnToPage(currentIndex);
    }
    updatePageMeta(currentIndex);

    pageFlip.on("flip", function () {
      currentIndex = pageFlip.getCurrentPageIndex();
      updatePageMeta(currentIndex);
    });

    pageFlip.on("changeState", function () {
      if (pageFlip) updatePageMeta(pageFlip.getCurrentPageIndex());
    });
  }

  function goPrev() {
    if (!pageFlip || isZoomed()) return;
    if (typeof pageFlip.flipPrev === "function") pageFlip.flipPrev();
  }

  function goNext() {
    if (!pageFlip || isZoomed()) return;
    if (typeof pageFlip.flipNext === "function") pageFlip.flipNext();
  }

  function flipToPage(pageNumber) {
    if (!pageFlip || isZoomed()) return;
    const target = Math.max(1, Math.min(totalPages, pageNumber)) - 1;
    if (typeof pageFlip.flip === "function") {
      pageFlip.flip(target);
    } else if (typeof pageFlip.turnToPage === "function") {
      pageFlip.turnToPage(target);
    }
  }

  function bookMap() {
    const m = new Map();
    books.forEach((b) => m.set(b.book_id, b));
    return m;
  }

  function renderToc() {
    if (!tocList || !toc || !toc.sections) return;
    const map = bookMap();
    tocList.innerHTML = "";
    toc.sections.forEach((section) => {
      const sec = document.createElement("li");
      sec.className = "toc-section";
      sec.innerHTML = '<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">' + section.title + "</p>";

      const booksWrap = document.createElement("div");
      booksWrap.className = "mt-2 grid gap-1.5";

      (section.books || []).forEach((id) => {
        const info = map.get(id);
        if (!info) return;
        const a = document.createElement("a");
        a.className = "rounded-md border px-2.5 py-1.5 text-sm transition " + (id === currentBook
          ? "border-zinc-300 bg-zinc-100 font-semibold text-zinc-900"
          : "border-border bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900");
        a.href = "/reader/" + id + "/";
        a.textContent = info.title_ko;
        booksWrap.appendChild(a);
      });

      sec.appendChild(booksWrap);
      tocList.appendChild(sec);
    });
  }

  function openWriterResults() {
    if (!writerResults) return;
    writerResults.classList.add("is-open");
  }

  function closeWriterResults() {
    if (!writerResults) return;
    writerResults.classList.remove("is-open");
    writerResults.innerHTML = "";
  }

  function formatEntryLabel(entry) {
    const info = books.find((b) => b.book_id === entry.book_id);
    const title = info ? info.title_ko : entry.book_id;
    const chapter = Number.isFinite(Number(entry.chapter)) ? " " + entry.chapter + "장" : "";
    const page = Number.isFinite(Number(entry.page)) ? " · " + entry.page + "p" : "";
    return title + chapter + page;
  }

  function normalizeWriterSearch(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "").trim();
  }

  function renderWriterHits(keyword) {
    if (!writerResults) return;
    writerResults.innerHTML = "";
    if (!keyword) {
      closeWriterResults();
      return;
    }

    const lowered = normalizeWriterSearch(keyword);
    const matched = writers.filter((w) => normalizeWriterSearch(w.name).includes(lowered));
    openWriterResults();

    if (!matched.length) {
      writerResults.innerHTML = '<div class="rounded-md border border-border bg-white px-3 py-2 text-sm text-zinc-500">검색 결과가 없습니다.</div>';
      return;
    }

    const sameNameCount = {};
    matched.forEach((w) => {
      const name = w.name || "이름없음";
      sameNameCount[name] = (sameNameCount[name] || 0) + 1;
    });

    const sameNameIndex = {};
    matched.slice(0, 12).forEach((writer) => {
      const entries = Array.isArray(writer.entries) ? writer.entries : [];
      if (!entries.length) return;

      const name = writer.name || "이름없음";
      sameNameIndex[name] = (sameNameIndex[name] || 0) + 1;
      const alias = sameNameCount[name] > 1 ? " (동명이인 " + sameNameIndex[name] + ")" : "";

      const card = document.createElement("div");
      card.className = "rounded-lg border border-border bg-white p-2 shadow-sm";

      const head = document.createElement("div");
      head.className = "mb-1.5 flex items-center justify-between gap-2";

      const strong = document.createElement("strong");
      strong.className = "text-sm font-semibold text-zinc-900";
      strong.textContent = name + alias;

      const meta = document.createElement("span");
      meta.className = "text-xs text-zinc-500";
      meta.textContent = entries.length + "곳";

      head.appendChild(strong);
      head.appendChild(meta);
      card.appendChild(head);

      const list = document.createElement("div");
      list.className = "grid gap-1";

      entries.forEach((entry) => {
        if (!entry.book_id || !entry.page) return;
        const a = document.createElement("a");
        a.className = "rounded-md border border-border bg-zinc-50 px-2 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900";
        a.href = "/reader/" + entry.book_id + "/?page=" + entry.page;
        a.textContent = formatEntryLabel(entry) + " 열기";
        a.addEventListener("click", function () {
          closeWriterResults();
        });
        list.appendChild(a);
      });

      card.appendChild(list);
      writerResults.appendChild(card);
    });
  }

  function getTouchDistance(touchA, touchB) {
    const dx = touchA.clientX - touchB.clientX;
    const dy = touchA.clientY - touchB.clientY;
    return Math.hypot(dx, dy);
  }

  function handlePointerDown(e) {
    if (!isZoomed() || e.button !== 0) return;
    pointerPanning = true;
    activePointerId = e.pointerId;
    pointerLastX = e.clientX;
    pointerLastY = e.clientY;
    pageStage.setPointerCapture(e.pointerId);
    applyZoom();
  }

  function handlePointerMove(e) {
    if (!pointerPanning || e.pointerId !== activePointerId) return;
    e.preventDefault();
    const dx = e.clientX - pointerLastX;
    const dy = e.clientY - pointerLastY;
    pointerLastX = e.clientX;
    pointerLastY = e.clientY;
    panX += dx;
    panY += dy;
    applyZoom();
  }

  function stopPointerPan(e) {
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
    pointerPanning = false;
    if (e && activePointerId !== null) {
      try {
        pageStage.releasePointerCapture(activePointerId);
      } catch (_) {
        // No-op: capture may already be released.
      }
    }
    activePointerId = null;
    applyZoom();
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      pinching = true;
      touchPanning = false;
      const touchA = e.touches[0];
      const touchB = e.touches[1];
      pinchStartDistance = getTouchDistance(touchA, touchB);
      pinchStartScale = zoomScale;
      applyZoom();
      return;
    }

    if (e.touches.length === 1 && isZoomed()) {
      touchPanning = true;
      touchPanLastX = e.touches[0].clientX;
      touchPanLastY = e.touches[0].clientY;
      applyZoom();
    }
  }

  function handleTouchMove(e) {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      const touchA = e.touches[0];
      const touchB = e.touches[1];
      const distance = getTouchDistance(touchA, touchB);
      if (pinchStartDistance > 0) {
        const ratio = distance / pinchStartDistance;
        setZoom(pinchStartScale * ratio);
      }
      return;
    }

    if (touchPanning && e.touches.length === 1 && isZoomed()) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - touchPanLastX;
      const dy = touch.clientY - touchPanLastY;
      touchPanLastX = touch.clientX;
      touchPanLastY = touch.clientY;
      panX += dx;
      panY += dy;
      applyZoom();
    }
  }

  function handleTouchEnd(e) {
    if (pinching && e.touches.length < 2) {
      pinching = false;
    }

    if (e.touches.length === 0) {
      touchPanning = false;
      applyZoom();
      return;
    }

    if (!isZoomed()) {
      touchPanning = false;
      applyZoom();
      return;
    }

    if (e.touches.length === 1) {
      touchPanning = true;
      touchPanLastX = e.touches[0].clientX;
      touchPanLastY = e.touches[0].clientY;
      applyZoom();
    }
  }

  prevBtn && prevBtn.addEventListener("click", goPrev);
  nextBtn && nextBtn.addEventListener("click", goNext);

  zoomOutBtn &&
    zoomOutBtn.addEventListener("click", function () {
      setZoom(zoomScale - zoomStep);
    });

  zoomInBtn &&
    zoomInBtn.addEventListener("click", function () {
      setZoom(zoomScale + zoomStep);
    });

  pageSearch &&
    pageSearch.addEventListener("change", function () {
      const page = Number(pageSearch.value);
      if (Number.isFinite(page)) flipToPage(page);
    });

  writerSearch &&
    writerSearch.addEventListener("input", function (e) {
      renderWriterHits(e.target.value.trim());
    });

  writerSearch &&
    writerSearch.addEventListener("focus", function () {
      const q = writerSearch.value.trim();
      if (q) renderWriterHits(q);
    });

  document.addEventListener("click", function (e) {
    if (!writerSearch || !writerResults) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".writer-search-wrap")) return;
    closeWriterResults();
  });

  window.addEventListener("keydown", function (e) {
    const target = e.target;
    const isTypingTarget = target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (isTypingTarget) return;

    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
  });

  if (pageStage) {
    pageStage.addEventListener("pointerdown", handlePointerDown);
    pageStage.addEventListener("pointermove", handlePointerMove);
    pageStage.addEventListener("pointerup", stopPointerPan);
    pageStage.addEventListener("pointercancel", stopPointerPan);

    pageStage.addEventListener("touchstart", handleTouchStart, { passive: false });
    pageStage.addEventListener("touchmove", handleTouchMove, { passive: false });
    pageStage.addEventListener("touchend", handleTouchEnd, { passive: false });
    pageStage.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  }

  window.addEventListener("resize", applyZoom);

  renderToc();
  initPageFlip();
  applyZoom();
})();
