import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/data";

function BookGrid({ books }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {books.map((book) => (
        <Link
          key={book.book_id}
          to={`/reader/${book.book_id}`}
          className="group overflow-hidden rounded-lg bg-card p-1.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <img
            src={book.cover_image}
            alt={`${book.title_ko} cover`}
            className="aspect-[3/4] w-full rounded-xl object-cover"
            loading="lazy"
          />
          <div className="mt-1.5 text-center">
            <p className="typo-ko typo-ko-title line-clamp-1 text-[11px] font-semibold sm:text-xs">{book.title_ko}</p>
            <p className="line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">{book.title_en}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function LandingPage() {
  const [books, setBooks] = useState([]);
  const [activeTestament, setActiveTestament] = useState(null);

  useEffect(() => {
    fetchJson("/data/books.json").then(setBooks).catch(() => setBooks([]));
  }, []);

  const { oldBooks, newBooks } = useMemo(() => {
    const oldList = books.filter((b) => b.testament === "old");
    const newList = books.filter((b) => b.testament === "new");
    return { oldBooks: oldList, newBooks: newList };
  }, [books]);

  const showOld = activeTestament === null || activeTestament === "old";
  const showNew = activeTestament === null || activeTestament === "new";

  const toggleTestament = (value) =>
    setActiveTestament((prev) => (prev === value ? null : value));

  return (
    <SiteShell>
      <main className="container grid gap-6 py-8 lg:py-10">
        <section className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary px-6 py-12 text-primary-foreground shadow-premium sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-secondary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <Badge variant="secondary" className="txt-en border-transparent bg-secondary/20 text-primary-foreground">Commemorative Bible Archive</Badge>
          <h1 className="typo-ko typo-ko-title mt-5 max-w-3xl font-serif text-3xl font-semibold sm:text-5xl">남서울평촌교회 성경 전시관</h1>
          <p className="typo-ko typo-ko-body mt-4 max-w-2xl pl-1.5 text-sm text-primary-foreground/80 sm:text-base" style={{ lineHeight: 1.95 }}>손으로 기록된 성경의 물성을 디지털로 온전히 전달하는 아카이브입니다. 종이의 흐름, 잉크의 결, 공동체의 시간을 한 화면에서 탐색할 수 있습니다.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-secondary text-primary shadow-lift transition hover:-translate-y-0.5 hover:bg-secondary/80">
              <Link to="/reader/genesis">성경책 보기 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground shadow-lift transition hover:-translate-y-0.5 hover:bg-accent/80">
              <Link to="/gallery">제작 기록 보기</Link>
            </Button>
          </div>
        </section>

        <Card className="border-0">
          <CardHeader className="sm:px-10">
            <Badge variant="outline" className="w-fit">발간사</Badge>
            <CardTitle className="typo-ko typo-ko-title font-serif">기록을 보존하고, 다음 세대로 전합니다.</CardTitle>
            <CardDescription className="typo-ko typo-ko-body" style={{ lineHeight: 1.95 }}>성도들의 손끝에서 완성된 성경 필사를 책의 물성 그대로 경험할 수 있도록 디지털 아카이브로 정리했습니다.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0">
          <CardHeader className="sm:px-10">
            <div className="txt-en flex items-center gap-2 text-sm text-muted-foreground"><BookOpenText className="h-4 w-4" /> Bible Collection</div>
            <CardTitle className="typo-ko typo-ko-title font-serif">66권 전권 소장본</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-6 sm:px-10">
            <p className="typo-ko typo-ko-body text-sm text-muted-foreground">구약·신약 전 권을 전시 중입니다. 위 버튼으로 구약/신약만 골라 볼 수도 있어요.</p>

            <div className="-mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
              <Button
                type="button"
                variant={activeTestament === "old" ? "default" : "secondary"}
                onClick={() => toggleTestament("old")}
                aria-expanded={activeTestament === "old"}
                className="typo-ko"
              >
                구약 성경 보기
              </Button>
              <Button
                type="button"
                variant={activeTestament === "new" ? "default" : "secondary"}
                onClick={() => toggleTestament("new")}
                aria-expanded={activeTestament === "new"}
                className="typo-ko"
              >
                신약 성경 보기
              </Button>
            </div>

            {showOld && (
              <section className="grid gap-3">
                <div className="flex items-baseline gap-2 border-b border-border pb-2">
                  <h3 className="typo-ko typo-ko-title font-serif text-xl font-semibold">&nbsp;구약</h3>
                  <span className="txt-en text-xs text-muted-foreground">Old Testament · {oldBooks.length}권</span>
                </div>
                <BookGrid books={oldBooks} />
              </section>
            )}

            {showNew && (
              <section className="grid gap-3">
                <div className="flex items-baseline gap-2 border-b border-border pb-2">
                  <h3 className="typo-ko typo-ko-title font-serif text-xl font-semibold">&nbsp;신약</h3>
                  <span className="txt-en text-xs text-muted-foreground">New Testament · {newBooks.length}권</span>
                </div>
                <BookGrid books={newBooks} />
              </section>
            )}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6 sm:px-10">
            <div>
              <p className="txt-en flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" /> Making Story</p>
              <h2 className="typo-ko typo-ko-title mt-1 font-serif text-xl font-semibold">제작 스토리 보기</h2>
            </div>
            <Button asChild variant="secondary"><Link to="/gallery">이동하기</Link></Button>
          </CardContent>
        </Card>
      </main>
    </SiteShell>
  );
}
