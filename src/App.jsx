import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((module) => ({ default: module.LandingPage }))
);
const GalleryPage = lazy(() =>
  import("@/pages/GalleryPage").then((module) => ({ default: module.GalleryPage }))
);
const ReaderPage = lazy(() =>
  import("@/pages/ReaderPage").then((module) => ({ default: module.ReaderPage }))
);

// Reset scroll to the top on every route change so a new page (e.g. the reader)
// always opens at the top instead of inheriting the previous scroll position.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
