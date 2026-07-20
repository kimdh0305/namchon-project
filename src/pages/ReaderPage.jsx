import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookMarked, Search, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { PageFlipBook } from "@/components/reader/PageFlipBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetchJson, findBook, formatWriterEntry } from "@/lib/data";

function parsePage(value) {
  const page = Number(value || "1");
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

function normalizeWriterSearch(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").trim();
}

export function ReaderPage() {
  const { bookId = "genesis" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = searchParams.get("page");
  const initialPage = parsePage(pageParam);

  const [books, setBooks] = useState([]);
  const [toc, setToc] = useState({ sections: [] });
  const [writers, setWriters] = useState([]);
  const [manifest, setManifest] = useState(null);
  const [pageInfo, setPageInfo] = useState({ current: initialPage, total: 0 });
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [writerKeyword, setWriterKeyword] = useState("");
  const [zoomScale, setZoomScale] = useState(1);

  const flipRef = useRef(null);
  const minZoom = 1;
  const maxZoom = 2.5;
  const zoomStep = 0.1;

  useEffect(() => {
    Promise.all([
      fetchJson("/data/books.json", { cache: "no-cache" }),
      fetchJson("/data/toc.json", { cache: "no-cache" }),
      fetchJson("/data/writers.json", { cache: "no-cache" })
    ])
      .then(([booksData, tocData, writersData]) => {
        setBooks(Array.isArray(booksData) ? booksData : []);
        setToc(tocData && tocData.sections ? tocData : { sections: [] });
        setWriters(Array.isArray(writersData) ? writersData : []);
      })
      .catch(() => {
        setBooks([]);
        setToc({ sections: [] });
        setWriters([]);
      });
  }, []);

  useEffect(() => {
    let alive = true;
    setManifest(null);

    fetchJson(`/data/manifests/${bookId}.json`, { cache: "no-cache" })
      .then((data) => {
        if (!alive) return;
        setManifest(data);
        const startPage = parsePage(pageParam);
        setPageInfo({ current: startPage, total: data.total_pages || 0 });
        setPageInput(String(startPage));
      })
      .catch(() => {
        if (!alive) return;
        setManifest(null);
      });

    return () => {
      alive = false;
    };
  }, [bookId]);

  useEffect(() => {
    setPageInput(String(initialPage));
  }, [initialPage]);

  const currentBook = useMemo(() => findBook(books, bookId), [books, bookId]);

  const booksById = useMemo(() => {
    const map = new Map();
    books.forEach((book) => map.set(book.book_id, book));
    return map;
  }, [books]);

  const filteredWriters = useMemo(() => {
    const keyword = normalizeWriterSearch(writerKeyword);
    if (!keyword) return [];
    return writers
      .filter((w) => normalizeWriterSearch(w.name).includes(keyword))
      .slice(0, 12);
  }, [writers, writerKeyword]);

  const handlePageChange = useCallback((current, total) => {
    setPageInfo({ current, total });
    setPageInput(current > 0 ? String(current) : "");

    setSearchParams((prev) => {
      const nextParam = String(current);
      if (prev.get("page") === nextParam) return prev;
      const next = new URLSearchParams(prev);
      next.set("page", nextParam);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  function jumpToPage() {
    const num = parsePage(pageInput);
    flipRef.current?.flipTo(num);
  }

  function goWriterEntry(entry) {
    const targetBook = entry.book_id;
    const targetPage = parsePage(entry.page);
    setWriterKeyword("");
    navigate(`/reader/${targetBook}?page=${targetPage}`);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const setZoom = useCallback((nextZoom) => {
    const rounded = Math.round(nextZoom * 100) / 100;
    setZoomScale(clamp(rounded, minZoom, maxZoom));
  }, [minZoom, maxZoom]);

  return (
    <SiteShell>
      <main className="container grid gap-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:py-5">
        <Card className="overflow-hidden lg:flex lg:flex-col">
          <CardContent className="p-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <div className="flex items-center gap-2 border-b p-4">
              <BookMarked className="h-4 w-4 text-muted-foreground" />
              <p className="typo-ko typo-ko-title font-serif text-base font-bold">성경 목차</p>
            </div>
            <ScrollArea className="h-[320px] lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="grid gap-5 p-4">
                {toc.sections.map((section) => (
                  <section key={section.id} className="grid gap-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {section.title.split(" / ").map((part, i) =>
                        i === 0 ? (
                          <span key={i} className="typo-ko">{part}</span>
                        ) : (
                          <span key={i} className="uppercase tracking-tight text-xs"> / {part}</span>
                        )
                      )}
                    </p>
                    <div className="grid gap-1.5">
                      {section.books.map((id) => {
                        const info = booksById.get(id);
                        if (!info) return null;
                        const current = id === bookId;
                        return (
                          <Link
                            key={id}
                            to={`/reader/${id}`}
                            className={current
                              ? "typo-ko rounded-md border border-primary/40 bg-secondary px-2.5 py-1.5 text-sm font-semibold text-primary"
                              : "typo-ko rounded-md border bg-card px-2.5 py-1.5 text-sm text-muted-foreground transition hover:border-accent hover:text-foreground"}
                          >
                            {info.title_ko}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <section className="overflow-hidden rounded-xl border bg-card text-foreground shadow-premium">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/60 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="typo-ko typo-ko-title font-serif text-xl font-semibold">&nbsp;{currentBook?.title_ko || "성경"}</h1>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={writerKeyword}
                  onChange={(e) => setWriterKeyword(e.target.value)}
                  placeholder="필사자 검색"
                  className="border-input bg-card pl-9 text-foreground placeholder:text-muted-foreground"
                />
                {writerKeyword.trim() && (
                  <div className="writer-results-panel absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-auto rounded-md border border-border bg-card p-1.5 shadow-premium">
                    {filteredWriters.length > 0 ? (
                      filteredWriters.map((writer) => (
                        <div key={writer.writer_id} className="mb-1 rounded-md border border-border bg-muted/50 p-2 last:mb-0">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <strong className="typo-ko text-foreground">{writer.name}</strong>
                            <span className="text-muted-foreground">{writer.entries?.length || 0}곳</span>
                          </div>
                          <div className="grid gap-1">
                            {(writer.entries || []).map((entry, idx) => (
                              <button
                                key={`${writer.writer_id}-${idx}`}
                                type="button"
                                onClick={() => goWriterEntry(entry)}
                                className="typo-ko rounded-md border border-border bg-card px-2 py-1 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                              >
                                {formatWriterEntry(entry, booksById)} 열기
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="typo-ko rounded-md border border-border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">검색 결과가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && jumpToPage()}
                  placeholder="페이지"
                  className="w-24 border-input bg-card text-foreground"
                />
                <Button variant="outline" onClick={jumpToPage}>이동</Button>
                <div className="inline-flex items-center overflow-hidden rounded-md border border-border bg-card">
                  <button
                    type="button"
                    aria-label="Zoom out"
                    className="h-8 w-8 border-r border-border text-sm text-foreground transition hover:bg-muted disabled:opacity-40"
                    onClick={() => setZoom(zoomScale - zoomStep)}
                    disabled={zoomScale <= minZoom + 0.001}
                  >
                    -
                  </button>
                  <span className="w-14 text-center text-xs font-semibold text-muted-foreground">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    aria-label="Zoom in"
                    className="h-8 w-8 border-l border-border text-sm text-foreground transition hover:bg-muted disabled:opacity-40"
                    onClick={() => setZoom(zoomScale + zoomStep)}
                    disabled={zoomScale >= maxZoom - 0.001}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="page-stage flex min-h-[64vh] items-center justify-center overflow-hidden p-3 lg:min-h-[78vh]" style={{ overscrollBehavior: "contain" }}>
            {manifest ? (
              <PageFlipBook
                key={bookId}
                ref={flipRef}
                manifest={manifest}
                initialPage={initialPage}
                zoomScale={zoomScale}
                minZoom={minZoom}
                maxZoom={maxZoom}
                zoomStep={zoomStep}
                onZoomChange={setZoom}
                onPageChange={handlePageChange}
                coverImage={bookId === "genesis" ? "/assets/covers/genesis_cover.png" : undefined}
              />
            ) : (
              <p className="typo-ko text-sm text-secondary">리더 데이터를 불러오는 중입니다...</p>
            )}
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-center gap-3 px-3 py-2">
            <Button size="sm" onClick={() => flipRef.current?.prev()} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">이전</Button>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> {pageInfo.current === 0 ? "표지" : pageInfo.current} / {pageInfo.total || "-"}
            </p>
            <Button size="sm" onClick={() => flipRef.current?.next()} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">다음</Button>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
