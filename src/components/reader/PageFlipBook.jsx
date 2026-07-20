import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PageFlip } from "page-flip";

function createPageElement(pageData, pageNum) {
  const page = document.createElement("div");
  page.className = "page";

  const img = document.createElement("img");
  img.alt = `Page ${pageNum}`;
  img.decoding = "async";
  // Lazy via JS window (see loadAround) instead of native loading="lazy",
  // which page-flip's transformed pages can defer indefinitely.
  img.dataset.src = pageData.image;

  page.appendChild(img);
  return page;
}

function clampPage(page, totalPages) {
  return Math.max(1, Math.min(totalPages, Number(page) || 1));
}

function clampZoom(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const PageFlipBook = forwardRef(function PageFlipBook(
  {
    manifest,
    initialPage = 1,
    zoomScale = 1,
    minZoom = 1,
    maxZoom = 2.5,
    zoomStep = 0.1,
    onZoomChange,
    onPageChange,
    coverImage
  },
  ref
) {
  const wrapperRef = useRef(null);
  const hostRef = useRef(null);
  const pageFlipRef = useRef(null);
  const totalPagesRef = useRef(1);
  const coverOffsetRef = useRef(0);
  const onPageChangeRef = useRef(onPageChange);
  const activePointerIdRef = useRef(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const nativeZoomedRef = useRef(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  // Tracks OS-level pinch-zoom (visualViewport scale), separate from our own
  // +/- zoomScale, so a mobile pinch gesture can't be misread as a page swipe.
  const [nativeZoomed, setNativeZoomed] = useState(false);

  const zoomed = zoomScale > minZoom + 0.001;
  const flipBlocked = zoomed || nativeZoomed;

  const clampPanForScale = useCallback((x, y, scale) => {
    if (!wrapperRef.current || scale <= minZoom + 0.001) return { x: 0, y: 0 };

    const rect = wrapperRef.current.getBoundingClientRect();
    const maxX = Math.max(0, ((rect.width * scale) - rect.width) / 2);
    const maxY = Math.max(0, ((rect.height * scale) - rect.height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }, [minZoom]);

  const clampPan = useCallback(
    (x, y) => clampPanForScale(x, y, zoomScale),
    [clampPanForScale, zoomScale]
  );

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (!wrapperRef.current || !manifest?.pages?.length) return undefined;

    // Create the page-flip mount node imperatively so React never reconciles the
    // DOM that page-flip mutates (prevents "removeChild: not a child" crashes).
    const host = document.createElement("div");
    host.id = "book";
    wrapperRef.current.appendChild(host);
    hostRef.current = host;

    // Cover (if any) is page index 0 but counts as "page 0" - content pages are 1..N.
    const offset = coverImage ? 1 : 0;
    coverOffsetRef.current = offset;

    const pageWindow = manifest.page_window || 3;
    const pages = manifest.pages.map((p, idx) => createPageElement(p, idx + 1));
    if (coverImage) pages.unshift(createPageElement({ image: coverImage }, 0));
    totalPagesRef.current = (manifest.total_pages || manifest.pages.length) + offset;
    const contentTotal = totalPagesRef.current - offset;

    // Load only the pages near `index` so a book open doesn't fire 100+ image
    // requests at once. data-src stays on every img, so indices stay stable.
    const loadAround = (index) => {
      const imgs = host.querySelectorAll(".page img[data-src]");
      const start = Math.max(0, index - pageWindow);
      const end = Math.min(imgs.length - 1, index + pageWindow);
      for (let i = start; i <= end; i += 1) {
        const img = imgs[i];
        if (img && !img.getAttribute("src")) {
          img.setAttribute("src", img.getAttribute("data-src"));
        }
      }
    };

    const toIndex = (contentPage) =>
      Math.min(totalPagesRef.current - 1, Math.max(0, contentPage - 1 + offset));

    const pageFlip = new PageFlip(host, {
      width: 560,
      height: 760,
      size: "stretch",
      minWidth: 320,
      maxWidth: 1200,
      minHeight: 420,
      maxHeight: 1600,
      showCover: false,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      mobileScrollSupport: true,
      usePortrait: true,
      autoSize: true,
      flippingTime: 760,
      swipeDistance: 34,
      clickEventForward: true
    });

    pageFlipRef.current = pageFlip;
    pageFlip.loadFromHTML(pages);

    // Default open shows the cover (page "0"); an explicit page request opens that content page.
    const startIndex = offset && initialPage <= 1 ? 0 : toIndex(initialPage);
    loadAround(startIndex);
    if (typeof pageFlip.flip === "function") {
      pageFlip.flip(startIndex);
    }
    onPageChangeRef.current?.(Math.max(0, startIndex + 1 - offset), contentTotal);

    pageFlip.on("flip", (event) => {
      const idx = Number.isFinite(event.data)
        ? event.data
        : pageFlip.getCurrentPageIndex();
      loadAround(idx);
      onPageChangeRef.current?.(Math.max(0, idx + 1 - offset), contentTotal);
    });

    return () => {
      try {
        pageFlip.destroy();
      } catch (err) {
        /* page-flip may already be torn down */
      }
      pageFlipRef.current = null;
      hostRef.current = null;
      if (host.parentNode) host.parentNode.removeChild(host);
    };
  }, [manifest, coverImage]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.style.pointerEvents = flipBlocked ? "none" : "auto";
  }, [flipBlocked]);

  // Instant lock the moment a second finger touches down, since visualViewport's
  // resize event can lag a frame behind and let page-flip see the first swipe.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const onTouchStartCapture = (event) => {
      if (event.touches.length > 1) {
        nativeZoomedRef.current = true;
        setNativeZoomed(true);
        if (hostRef.current) hostRef.current.style.pointerEvents = "none";
      }
    };

    wrapper.addEventListener("touchstart", onTouchStartCapture, { capture: true, passive: true });
    return () => {
      wrapper.removeEventListener("touchstart", onTouchStartCapture, { capture: true });
    };
  }, []);

  // Authoritative unlock: only once the OS-level pinch-zoom has actually been
  // released back to 1x, per "확대 후 다시 줄일 때까지 페이지 넘김 금지".
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const ZOOM_EPSILON = 0.02;
    const updateFromViewport = () => {
      const isZoomed = vv.scale > 1 + ZOOM_EPSILON;
      nativeZoomedRef.current = isZoomed;
      setNativeZoomed(isZoomed);
    };

    updateFromViewport();
    vv.addEventListener("resize", updateFromViewport);
    vv.addEventListener("scroll", updateFromViewport);
    return () => {
      vv.removeEventListener("resize", updateFromViewport);
      vv.removeEventListener("scroll", updateFromViewport);
    };
  }, []);

  useEffect(() => {
    if (!zoomed) {
      setPan({ x: 0, y: 0 });
      setIsPanning(false);
      activePointerIdRef.current = null;
      return;
    }
    setPan((prev) => clampPan(prev.x, prev.y));
  }, [zoomed, clampPan]);

  useEffect(() => {
    if (!zoomed) return undefined;
    const onResize = () => {
      setPan((prev) => clampPan(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [zoomed, clampPan]);

  useEffect(() => {
    const pageFlip = pageFlipRef.current;
    if (!pageFlip || !manifest) return;

    const offset = coverOffsetRef.current;
    const targetIndex =
      offset && initialPage <= 1
        ? 0
        : Math.min(totalPagesRef.current - 1, Math.max(0, initialPage - 1 + offset));
    const currentIndex =
      typeof pageFlip.getCurrentPageIndex === "function"
        ? pageFlip.getCurrentPageIndex()
        : -1;

    if (currentIndex !== targetIndex && typeof pageFlip.flip === "function") {
      pageFlip.flip(targetIndex);
    }
  }, [initialPage, manifest]);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    activePointerIdRef.current = null;
    nativeZoomedRef.current = false;
    setNativeZoomed(false);
  }, [manifest]);

  const handleWheel = useCallback((event) => {
    if (!wrapperRef.current || !onZoomChange) return;
    // Keep wheel interaction dedicated to zoom while hovering the reader.
    event.preventDefault();
    event.stopPropagation();

    const direction = event.deltaY < 0 ? 1 : -1;
    const rounded = Math.round((zoomScale + direction * zoomStep) * 100) / 100;
    const nextZoom = clampZoom(rounded, minZoom, maxZoom);

    if (Math.abs(nextZoom - zoomScale) < 0.001) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const anchorX = event.clientX - (rect.left + rect.width / 2);
    const anchorY = event.clientY - (rect.top + rect.height / 2);
    const ratio = nextZoom / zoomScale;

    setPan((prev) => {
      const nextX = (prev.x * ratio) + (anchorX * (1 - ratio));
      const nextY = (prev.y * ratio) + (anchorY * (1 - ratio));
      return clampPanForScale(nextX, nextY, nextZoom);
    });

    onZoomChange(nextZoom);
  }, [onZoomChange, zoomScale, zoomStep, minZoom, maxZoom, clampPanForScale]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      wrapper.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  function handlePointerDown(event) {
    if (!zoomed) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    activePointerIdRef.current = event.pointerId;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!zoomed || activePointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    setPan((prev) => clampPan(prev.x + dx, prev.y + dy));
    event.preventDefault();
  }

  function stopPointerPan(event) {
    if (activePointerIdRef.current === null) return;
    if (event && activePointerIdRef.current !== event.pointerId) return;
    activePointerIdRef.current = null;
    setIsPanning(false);
  }

  useImperativeHandle(ref, () => ({
    prev() {
      pageFlipRef.current?.flipPrev?.();
    },
    next() {
      pageFlipRef.current?.flipNext?.();
    },
    flipTo(pageNumber) {
      const pageFlip = pageFlipRef.current;
      if (!pageFlip) return;
      const offset = coverOffsetRef.current;
      const contentTotal = totalPagesRef.current - offset;
      const target = Math.min(
        totalPagesRef.current - 1,
        Math.max(0, clampPage(pageNumber, contentTotal) - 1 + offset)
      );
      pageFlip.flip?.(target);
    }
  }), []);

  return (
    <div
      ref={wrapperRef}
      className="w-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPointerPan}
      onPointerCancel={stopPointerPan}
      onLostPointerCapture={stopPointerPan}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: "translate(" + pan.x + "px, " + pan.y + "px) scale(" + zoomScale + ")",
        transformOrigin: "center center",
        transition: isPanning ? "none" : "transform 140ms ease-out",
        touchAction: zoomed ? "none" : "auto",
        cursor: zoomed ? (isPanning ? "grabbing" : "grab") : "auto"
      }}
    />
  );
});
