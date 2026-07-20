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
  const pinchRef = useRef(null);
  // Mirror the latest zoom/pan into refs so the (stable) native touch handler
  // can read current values without re-attaching listeners mid-gesture.
  const zoomScaleRef = useRef(zoomScale);
  const panRef = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const zoomed = zoomScale > minZoom + 0.001;

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
    host.style.pointerEvents = zoomed ? "none" : "auto";
  }, [zoomed]);

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Two-finger pinch = in-frame zoom (drives the same zoomScale/pan as the +/-
  // buttons), NOT the browser's native whole-page zoom.
  //
  // page-flip binds touchstart on #book and touchmove/touchend on window, and
  // decides a page flip in its touchend (start->end distance > swipeDistance).
  // So these listeners run in the CAPTURE phase (before page-flip's) and use
  // stopImmediatePropagation to hide touches from page-flip in two cases:
  //   1) during a pinch (2nd finger down → all fingers up), so the concluding
  //      touchend can't be scored as a swipe — that flipped one page otherwise;
  //   2) whenever the view is zoomed in, so the book never flips on touch and
  //      navigation is by the 이전/다음 buttons only (a stale touchPoint left by
  //      the pinch used to leak one flip on the first tap after zooming).
  // Single-finger touches at 1x pass through untouched, so normal swipe-to-flip
  // still works. Panning while zoomed uses pointer events, unaffected by this.
  const getTouchDistance = (t1, t2) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onZoomChange) return undefined;

    const isZoomedIn = () => zoomScaleRef.current > minZoom + 0.001;

    const beginPinch = (event) => {
      if (event.touches.length >= 2) {
        const [t1, t2] = [event.touches[0], event.touches[1]];
        const rect = wrapper.getBoundingClientRect();
        pinchRef.current = {
          startDistance: getTouchDistance(t1, t2),
          startZoom: zoomScaleRef.current,
          startPan: panRef.current,
          // Pinch midpoint relative to the frame center = the zoom anchor.
          anchorX: (t1.clientX + t2.clientX) / 2 - (rect.left + rect.width / 2),
          anchorY: (t1.clientY + t2.clientY) / 2 - (rect.top + rect.height / 2)
        };
        // Freeze page-flip and the pan transition for the duration of the pinch.
        if (hostRef.current) hostRef.current.style.pointerEvents = "none";
        activePointerIdRef.current = null;
        setIsPanning(true);
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      // Single finger while zoomed: the book must not flip on touch (buttons only).
      if (isZoomedIn()) event.stopImmediatePropagation();
    };

    const movePinch = (event) => {
      const pinch = pinchRef.current;
      if (!pinch) {
        if (isZoomedIn()) event.stopImmediatePropagation();
        return;
      }
      // Lock is active: keep the entire gesture away from page-flip.
      event.stopImmediatePropagation();
      if (event.cancelable) event.preventDefault();
      // A finger may have lifted mid-pinch; hold the lock but stop zooming.
      if (event.touches.length < 2 || pinch.startDistance <= 0) return;

      const distance = getTouchDistance(event.touches[0], event.touches[1]);
      const rawZoom = Math.round((pinch.startZoom * (distance / pinch.startDistance)) * 100) / 100;
      const nextZoom = clampZoom(rawZoom, minZoom, maxZoom);
      const ratio = nextZoom / pinch.startZoom;

      const nextX = (pinch.startPan.x * ratio) + (pinch.anchorX * (1 - ratio));
      const nextY = (pinch.startPan.y * ratio) + (pinch.anchorY * (1 - ratio));
      setPan(clampPanForScale(nextX, nextY, nextZoom));
      onZoomChange(nextZoom);
    };

    const endPinch = (event) => {
      if (!pinchRef.current) {
        if (isZoomedIn()) event.stopImmediatePropagation();
        return;
      }
      // Hide every touchend of the pinch from page-flip, including the last one
      // that would otherwise be scored as a swipe.
      event.stopImmediatePropagation();
      // Stay locked until the screen is fully released.
      if (event.touches.length > 0) return;
      pinchRef.current = null;
      setIsPanning(false);
      if (hostRef.current) {
        hostRef.current.style.pointerEvents = isZoomedIn() ? "none" : "auto";
      }
    };

    // WebKit-only: block iOS Safari's page zoom, which ignores touch-action.
    const blockGesture = (event) => event.preventDefault();

    const capture = { capture: true, passive: false };
    wrapper.addEventListener("touchstart", beginPinch, capture);
    wrapper.addEventListener("touchmove", movePinch, capture);
    wrapper.addEventListener("touchend", endPinch, capture);
    wrapper.addEventListener("touchcancel", endPinch, capture);
    wrapper.addEventListener("gesturestart", blockGesture, { passive: false });
    wrapper.addEventListener("gesturechange", blockGesture, { passive: false });
    wrapper.addEventListener("gestureend", blockGesture, { passive: false });
    return () => {
      wrapper.removeEventListener("touchstart", beginPinch, capture);
      wrapper.removeEventListener("touchmove", movePinch, capture);
      wrapper.removeEventListener("touchend", endPinch, capture);
      wrapper.removeEventListener("touchcancel", endPinch, capture);
      wrapper.removeEventListener("gesturestart", blockGesture);
      wrapper.removeEventListener("gesturechange", blockGesture);
      wrapper.removeEventListener("gestureend", blockGesture);
    };
  }, [onZoomChange, minZoom, maxZoom, clampPanForScale]);

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
    pinchRef.current = null;
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
    if (!zoomed || pinchRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    activePointerIdRef.current = event.pointerId;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!zoomed || pinchRef.current || activePointerIdRef.current !== event.pointerId) return;
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
        // pan-y (not auto) keeps vertical scroll + page-flip swipes but disables
        // the browser's native pinch-zoom, so pinching zooms inside the frame
        // instead of the whole page; once zoomed we own all touches.
        touchAction: zoomed ? "none" : "pan-y",
        cursor: zoomed ? (isPanning ? "grabbing" : "grab") : "auto"
      }}
    />
  );
});
