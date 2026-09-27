import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PdfViewerModal({ open, title, src, pages = [], onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || (!src && pages.length === 0)) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-[92vh] sm:max-w-6xl sm:rounded-2xl sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
          <div>
            <p className="txt-en text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Writer Assignment</p>
            <h2 className="typo-ko font-serif text-base font-semibold sm:text-lg">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {src && (
              <Button asChild variant="outline" size="sm">
                <a href={src} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> 원본 PDF
                </a>
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="분배표 닫기">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/60 p-2 sm:p-4">
          {pages.length > 0 ? (
            <div className="mx-auto grid max-w-4xl gap-3 sm:gap-4">
              {pages.map((page, index) => (
                <figure key={page} className="overflow-hidden rounded-md border bg-white shadow-sm">
                  <img
                    src={page}
                    alt={`${title} ${index + 1}쪽`}
                    loading={index === 0 ? "eager" : "lazy"}
                    className="h-auto w-full"
                  />
                  <figcaption className="border-t bg-muted/30 py-1.5 text-center text-xs text-muted-foreground">
                    {index + 1} / {pages.length}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <iframe title={title} src={src} className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
