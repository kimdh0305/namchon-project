import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { ReaderPage } from "@/pages/ReaderPage";

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
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/reader/:bookId" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
