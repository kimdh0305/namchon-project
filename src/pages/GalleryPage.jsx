import { useEffect, useMemo, useState } from "react";
import {
  BookText,
  ScrollText,
  FileText,
  Users,
  NotebookPen,
  MessageSquareQuote,
  ChevronDown,
  CalendarDays,
  Quote,
  Images,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink
} from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/data";

const APOSTLES_CREED =
  "전능하사 천지를 만드신 하나님 아버지를 내가 믿사오며, 그 외아들 우리 주 예수 그리스도를 믿사오니, 이는 성령으로 잉태하사 동정녀 마리아에게 나시고, 본디오 빌라도에게 고난을 받으사 십자가에 못 박혀 죽으시고, 장사한 지 사흘 만에 죽은 자 가운데서 다시 살아나시며, 하늘에 오르사 전능하신 하나님 우편에 앉아 계시다가, 저리로서 산 자와 죽은 자를 심판하러 오시리라. 성령을 믿사오며, 거룩한 공회와 성도가 서로 교통하는 것과, 죄를 사하여 주시는 것과, 몸이 다시 사는 것과, 영원히 사는 것을 믿사옵나이다. 아멘.";

const LORDS_PRAYER =
  "하늘에 계신 우리 아버지여, 이름이 거룩히 여김을 받으시오며, 나라가 임하시오며, 뜻이 하늘에서 이루어진 것 같이 땅에서도 이루어지이다. 오늘날 우리에게 일용할 양식을 주시옵고, 우리가 우리에게 죄 지은 자를 사하여 준 것 같이 우리 죄를 사하여 주시옵고, 우리를 시험에 들게 하지 마시옵고, 다만 악에서 구하시옵소서. 대개 나라와 권세와 영광이 아버지께 영원히 있사옵나이다. 아멘.";

const COMMANDMENTS = [
  "너는 나 외에는 다른 신들을 네게 두지 말라.",
  "너를 위하여 새긴 우상을 만들지 말고, 그것들에게 절하지 말며 섬기지 말라.",
  "너는 네 하나님 여호와의 이름을 망령되게 부르지 말라.",
  "안식일을 기억하여 거룩하게 지키라.",
  "네 부모를 공경하라.",
  "살인하지 말라.",
  "간음하지 말라.",
  "도둑질하지 말라.",
  "네 이웃에 대하여 거짓 증거하지 말라.",
  "네 이웃의 집을 탐내지 말라."
];

function DocImage({ src, alt }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="mx-auto max-h-[75vh] w-full rounded-lg border bg-card object-contain shadow-premium"
    />
  );
}

// 그림을 그린 무지개학교 유치부 친구들 (이미지 아래 · 본문 위에 표시)
const DOC_CREDITS = {
  creed: "무지개학교 유치부 친구들(김도엽, 박지온, 조이재, 채영원, 양서하)이 그린 사도신경",
  "lords-prayer": "무지개학교 유치부 친구들(금시우, 하채빈, 김민지, 김유하)이 그린 주기도문",
  commandments: "무지개학교 유치부 친구들(위하윤, 김해준, 전서진, 김예나, 조은빛)이 그린 십계명"
};

function DocCredit({ text }) {
  if (!text) return null;
  return (
    <p className="typo-ko rounded-md border border-border bg-muted/50 px-4 py-2.5 text-center text-sm font-medium text-foreground/80">
      {text}
    </p>
  );
}

const SECTIONS = [
  { id: "preface", title: "발간사", en: "Preface", icon: BookText },
  { id: "creed", title: "사도신경(무지개학교 유치부 그림)", en: "Apostles' Creed", icon: ScrollText },
  { id: "lords-prayer", title: "주기도문(무지개학교 유치부 그림)", en: "The Lord's Prayer", icon: ScrollText },
  { id: "commandments", title: "십계명(무지개학교 유치부 그림)", en: "Ten Commandments", icon: ScrollText },
  {
    id: "process",
    title: "제작 과정",
    en: "Making Process",
    icon: FileText,
    children: [
      { id: "participants", title: "참여자 명단", en: "Participants", icon: Users },
      { id: "assignment", title: "필사 분배표", en: "Writer Assignment", icon: ClipboardList },
      { id: "minutes", title: "회의록", en: "Meeting Minutes", icon: NotebookPen },
      { id: "reviews", title: "필사자 후기", en: "Reflections", icon: MessageSquareQuote },
      { id: "album", title: "제작 앨범", en: "Production Album", icon: Images }
    ]
  }
];

const PROCESS_CHILD_IDS = ["participants", "assignment", "minutes", "reviews", "album"];

function SectionShell({ en, title, children }) {
  return (
    <div className="grid gap-5">
      <div>
        <Badge variant="secondary" className="txt-en">{en}</Badge>
        <h2 className="typo-ko typo-ko-title mt-2 font-serif text-2xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function AlbumLightboxModal({ items, activeIndex, onClose, onPrev, onNext }) {
  const currentItem = items[activeIndex];

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Badge variant="secondary" className="bg-primary/20 text-xs text-primary-foreground border-transparent shrink-0">
              {activeIndex + 1} / {items.length}
            </Badge>
            <span className="typo-ko text-sm font-semibold truncate">
              {currentItem.title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition shrink-0 ml-2"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Display */}
        <div className="relative flex min-h-[250px] max-h-[70vh] items-center justify-center bg-black/60 p-2 sm:p-4">
          <img
            src={currentItem.src || currentItem.image}
            alt={currentItem.title}
            className="max-h-[66vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
          />

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2 text-white/80 hover:bg-black/80 hover:text-white transition shadow-md"
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2 text-white/80 hover:bg-black/80 hover:text-white transition shadow-md"
                aria-label="다음 사진"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </>
          )}
        </div>

        {/* Footer info */}
        {(currentItem.caption || currentItem.date) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t border-white/10 bg-zinc-950/80 px-4 py-3 text-xs sm:text-sm">
            <p className="typo-ko text-zinc-300 leading-relaxed">{currentItem.caption || currentItem.title}</p>
            {currentItem.date && (
              <span className="flex shrink-0 items-center gap-1.5 text-zinc-400 text-xs">
                <CalendarDays className="h-3.5 w-3.5" /> {currentItem.date}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_ALBUM_ITEMS = [
  {
    id: "alb-01",
    title: "성경 필사 TF 1차 모임",
    caption: "기획 및 전교인 이어쓰기 준비 회의 현장",
    date: "2025-12-28",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/meeting_notes/meeting_notes_1.webp"
  },
  {
    id: "alb-02",
    title: "필사성경 분량 배정 및 용지 준비",
    caption: "각 부서 및 개인별 필사 용지 배정 현황",
    date: "2026-01-04",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/meeting_notes/meeting_notes_2_01.webp"
  },
  {
    id: "alb-03",
    title: "유치부 사도신경 그림 필사",
    caption: "무지개학교 유치부 어린이들의 사도신경 그림 필사 작품",
    date: "2026-01-20",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/history/apostles-creed.webp"
  },
  {
    id: "alb-04",
    title: "유치부 주기도문 그림 필사",
    caption: "무지개학교 유치부 어린이들의 주기도문 그림 필사 작품",
    date: "2026-01-22",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/history/lords-prayer.webp"
  },
  {
    id: "alb-05",
    title: "유치부 십계명 그림 필사",
    caption: "무지개학교 유치부 어린이들의 십계명 그림 필사 작품",
    date: "2026-01-25",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/history/ten-commandments.webp"
  },
  {
    id: "alb-06",
    title: "부서별 이어쓰기 중간점검",
    caption: "전교인 필사 진척 상황 집계 및 서포터즈 점검",
    date: "2026-03-29",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/meeting_notes/meeting_notes_5_01.webp"
  },
  {
    id: "alb-07",
    title: "필사 원본 스캔 및 디지털화",
    caption: "500여 명 성도의 손글씨 성경 100% 디지털 보존 작업",
    date: "2026-05-31",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/meeting_notes/meeting_notes_7_01.webp"
  },
  {
    id: "alb-08",
    title: "e-book 및 웹 보존 시스템 구축",
    caption: "인터랙티브 웹 뷰어 및 검색 시스템 완성",
    date: "2026-07-26",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/meeting_notes/meeting_notes_8_01.webp"
  },
  {
    id: "alb-09",
    title: "봉헌식 준비 및 최종 검수",
    caption: "전교인 필사성경 출간 및 웹 아카이브 최종 점검",
    date: "2026-09-05",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/meeting_notes/meeting_notes_9_01.webp"
  },
  {
    id: "alb-10",
    title: "발간사 및 은혜의 기념",
    caption: "남서울평촌교회 담임목사 방상웅 발간사",
    date: "2026-09-20",
    src: "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/history/preface.webp?v=2"
  }
];

export function GalleryPage() {
  const [history, setHistory] = useState({ participants: [], reviews: [], minutes: [], album: [] });
  const [gallery, setGallery] = useState({ items: [] });
  const [active, setActive] = useState("preface");
  const [processOpen, setProcessOpen] = useState(true);
  const [activeMinute, setActiveMinute] = useState(null);
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(null);

  useEffect(() => {
    fetchJson("/data/history.json")
      .then((data) => setHistory(data || {}))
      .catch(() => setHistory({ participants: [], reviews: [], minutes: [], album: [] }));
    fetchJson("/data/gallery.json")
      .then(setGallery)
      .catch(() => setGallery({ items: [] }));
  }, []);

  const minutes = history.minutes || [];
  const writerAssignment = history.writerAssignment || null;
  const selectedMinute = useMemo(
    () => minutes.find((m) => m.id === activeMinute) || minutes[0] || null,
    [minutes, activeMinute]
  );

  const albumItems = useMemo(() => {
    if (Array.isArray(history.album) && history.album.length > 0) return history.album;
    if (Array.isArray(gallery.items) && gallery.items.length > 0) return gallery.items;
    if (Array.isArray(gallery) && gallery.length > 0) return gallery;
    return DEFAULT_ALBUM_ITEMS;
  }, [history.album, gallery]);

  function selectSection(id) {
    setActive(id);
    if (PROCESS_CHILD_IDS.includes(id) || id === "process") setProcessOpen(true);
  }

  const handlePrevAlbum = () => {
    setActiveAlbumIndex((prev) => (prev > 0 ? prev - 1 : albumItems.length - 1));
  };

  const handleNextAlbum = () => {
    setActiveAlbumIndex((prev) => (prev < albumItems.length - 1 ? prev + 1 : 0));
  };

  return (
    <SiteShell>
      <main className="container grid gap-6 py-8 lg:py-10">
        <section className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary px-6 py-12 text-primary-foreground shadow-premium sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <Badge variant="secondary" className="txt-en border-transparent bg-secondary/20 text-primary-foreground">History</Badge>
          <h1 className="typo-ko typo-ko-title mt-5 font-serif text-3xl font-semibold sm:text-5xl">성경이어쓰기 이야기</h1>
          <p className="typo-ko typo-ko-body mt-4 max-w-3xl text-sm text-primary-foreground/80 sm:text-base">전교인 필사성경을 만들어가는 은혜의 과정을 한 곳에 모았습니다.</p>
        </section>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit lg:sticky lg:top-[72px]">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b p-4">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <p className="typo-ko typo-ko-title font-serif text-sm font-medium">목차</p>
              </div>
              <ScrollArea className="h-auto lg:h-[calc(100vh-200px)]">
                <nav className="grid gap-1.5 p-3">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    if (!section.children) {
                      const current = active === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => selectSection(section.id)}
                          className={cn(
                            "typo-ko flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition",
                            current
                              ? "border-primary/40 bg-secondary font-semibold text-primary"
                              : "border-transparent text-muted-foreground hover:border-accent hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" /> {section.title}
                        </button>
                      );
                    }

                    return (
                      <div key={section.id} className="grid gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProcessOpen((v) => !v)}
                          aria-expanded={processOpen}
                          className={cn(
                            "typo-ko flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition",
                            active === section.id
                              ? "border-primary/40 bg-secondary font-semibold text-primary"
                              : "border-transparent text-muted-foreground hover:border-accent hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" /> {section.title}
                          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", processOpen && "rotate-180")} />
                        </button>
                        {processOpen && (
                          <div className="grid gap-1 pl-3">
                            {section.children.map((child) => {
                              const ChildIcon = child.icon;
                              const current = active === child.id;
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => selectSection(child.id)}
                                  className={cn(
                                    "typo-ko flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] transition",
                                    current
                                      ? "border-primary/40 bg-secondary font-semibold text-primary"
                                      : "border-transparent text-muted-foreground hover:border-accent hover:text-foreground"
                                  )}
                                >
                                  <ChildIcon className="h-3.5 w-3.5 shrink-0" /> {child.title}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 lg:p-8">
              {active === "preface" && (
                history.docImages?.preface ? (
                  <img
                    src={history.docImages.preface}
                    alt="발간사 · 남서울평촌교회 담임목사 방상웅"
                    loading="lazy"
                    className="mx-auto w-full max-w-2xl rounded-xl bg-card object-contain shadow-premium"
                  />
                ) : (
                  <p className="typo-ko text-sm text-muted-foreground">발간사 이미지를 준비 중입니다.</p>
                )
              )}

              {active === "creed" && (
                <SectionShell en="Apostles' Creed" title="사도신경">
                  <DocImage src={history.docImages?.creed} alt="사도신경" />
                  <DocCredit text={DOC_CREDITS.creed} />
                  <blockquote className="typo-ko typo-ko-body rounded-lg border-l-4 border-accent bg-muted/40 p-5 text-[15px] leading-loose text-foreground/90">
                    {APOSTLES_CREED}
                  </blockquote>
                </SectionShell>
              )}

              {active === "lords-prayer" && (
                <SectionShell en="The Lord's Prayer" title="주기도문">
                  <DocImage src={history.docImages?.["lords-prayer"]} alt="주기도문" />
                  <DocCredit text={DOC_CREDITS["lords-prayer"]} />
                  <blockquote className="typo-ko typo-ko-body rounded-lg border-l-4 border-accent bg-muted/40 p-5 text-[15px] leading-loose text-foreground/90">
                    {LORDS_PRAYER}
                  </blockquote>
                </SectionShell>
              )}

              {active === "commandments" && (
                <SectionShell en="Ten Commandments" title="십계명">
                  <DocImage src={history.docImages?.commandments} alt="십계명" />
                  <DocCredit text={DOC_CREDITS.commandments} />
                  <ol className="grid gap-2.5">
                    {COMMANDMENTS.map((text, idx) => (
                      <li key={idx} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-serif text-sm font-semibold text-primary-foreground">{idx + 1}</span>
                        <span className="typo-ko typo-ko-body text-[15px] leading-relaxed text-foreground/90">{text}</span>
                      </li>
                    ))}
                  </ol>
                </SectionShell>
              )}

              {active === "process" && (
                <SectionShell en="Making Process" title="제작 과정">
                  <p className="typo-ko typo-ko-body text-[15px] leading-relaxed text-foreground/90">스캔부터 웹 전시까지, 손글씨 성경을 디지털 보존물로 완성한 과정을 기록합니다. 아래 메뉴에서 참여자 명단, 회의록, 필사자 후기, 제작 앨범을 살펴보실 수 있습니다.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => selectSection("participants")}
                      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-accent hover:shadow-sm"
                    >
                      <Users className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="typo-ko text-sm font-semibold">참여자 명단</p>
                        <p className="typo-ko text-xs text-muted-foreground">562명 성도 참여 및 팀별 명단</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSection("assignment")}
                      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-accent hover:shadow-sm"
                    >
                      <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="typo-ko text-sm font-semibold">필사 분배표</p>
                        <p className="typo-ko text-xs text-muted-foreground">성경별 필사 구간과 참여자 확인</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSection("minutes")}
                      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-accent hover:shadow-sm"
                    >
                      <NotebookPen className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="typo-ko text-sm font-semibold">회의록</p>
                        <p className="typo-ko text-xs text-muted-foreground">성경 필사 TF 회의 기록</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSection("reviews")}
                      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-accent hover:shadow-sm"
                    >
                      <MessageSquareQuote className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="typo-ko text-sm font-semibold">필사자 후기</p>
                        <p className="typo-ko text-xs text-muted-foreground">필사 과정에서 얻은 은혜와 소감</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSection("album")}
                      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-accent hover:shadow-sm"
                    >
                      <Images className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="typo-ko text-sm font-semibold">제작 앨범</p>
                        <p className="typo-ko text-xs text-muted-foreground">제작 과정 바둑판식 이미지 갤러리</p>
                      </div>
                    </button>
                  </div>
                </SectionShell>
              )}

              {active === "participants" && (
                <SectionShell en="Participants" title="참여자 명단">
                  <div className="typo-ko typo-ko-body grid gap-1 rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground/90">
                    <p>전체 참여 인원은 총 562명, 실제 필사자는 512명입니다.</p>
                    <p>서포터즈는 장년 31명, 청년 2명, 유소년부 4명입니다.</p>
                  </div>
                  <div className="grid gap-4">
                    {(history.participants || []).map((group) => (
                      <div key={group.team} className="rounded-lg border bg-card p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <p className="typo-ko text-sm font-semibold">{group.team}</p>
                          <span className="text-xs text-muted-foreground">{group.members.length}명</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.members.map((name) => (
                            <span key={name} className="typo-ko rounded-full border bg-muted/50 px-3 py-1 text-sm text-foreground/90">{name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionShell>
              )}

              {active === "assignment" && (
                <SectionShell en="Writer Assignment" title="필사 분배표">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
                    <p className="typo-ko typo-ko-body text-sm text-foreground/90">
                      성경별 필사 범위와 참여자를 확인할 수 있는 원본 분배표입니다.
                    </p>
                    {writerAssignment?.pdf && (
                      <div>
                        <Button asChild variant="outline" size="sm">
                          <a href={writerAssignment.pdf} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1.5 h-4 w-4" /> 원본 PDF
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                  {writerAssignment?.pages?.length > 0 ? (
                    <div className="grid gap-4 rounded-lg bg-muted/30 p-2 sm:p-4">
                      {writerAssignment.pages.map((page, index) => (
                        <figure key={page} className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border bg-white shadow-sm">
                          <img
                            src={page}
                            alt={`${writerAssignment.title || "전교인 성경이어쓰기 분배표"} ${index + 1}쪽`}
                            loading={index === 0 ? "eager" : "lazy"}
                            className="h-auto w-full"
                          />
                          <figcaption className="border-t bg-muted/30 py-2 text-center text-xs text-muted-foreground">
                            {index + 1} / {writerAssignment.pages.length}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : writerAssignment?.pdf ? (
                    <div className="overflow-hidden rounded-lg border bg-muted/30">
                      <iframe title={writerAssignment.title} src={writerAssignment.pdf} className="h-[72vh] min-h-[520px] w-full" />
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
                      <p className="typo-ko text-sm text-muted-foreground">분배표 자료를 준비 중입니다.</p>
                    </div>
                  )}
                </SectionShell>
              )}

              {active === "minutes" && (
                <SectionShell en="Meeting Minutes" title="회의록">
                  <div className="grid gap-2">
                    {minutes.map((m) => {
                      const current = selectedMinute?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setActiveMinute(m.id)}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                            current ? "border-primary/40 bg-secondary" : "bg-card hover:border-accent"
                          )}
                        >
                          <div className="grid">
                            <p className="typo-ko text-sm font-semibold text-foreground">{m.title}</p>
                            <p className="typo-ko text-xs text-muted-foreground">{m.summary}</p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {m.date}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="overflow-hidden rounded-lg border bg-muted/30">
                    {selectedMinute?.pdf ? (
                      <iframe
                        title={selectedMinute.title}
                        src={selectedMinute.pdf}
                        className="h-[60vh] w-full"
                      />
                    ) : selectedMinute?.images?.length > 0 ? (
                      <div className="grid gap-0">
                        {selectedMinute.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`${selectedMinute.title} - ${i + 1}쪽`}
                            loading="lazy"
                            className="mx-auto w-full bg-card object-contain"
                          />
                        ))}
                      </div>
                    ) : selectedMinute?.image ? (
                      <img
                        src={selectedMinute.image}
                        alt={selectedMinute.title}
                        loading="lazy"
                        className="mx-auto max-h-[75vh] w-full bg-card object-contain"
                      />
                    ) : (
                      <div className="flex h-[42vh] flex-col items-center justify-center gap-3 p-6 text-center">
                        <NotebookPen className="h-8 w-8 text-muted-foreground" />
                        <p className="typo-ko text-sm font-medium text-foreground">{selectedMinute ? selectedMinute.title : "회의록"}</p>
                        <p className="typo-ko text-sm text-muted-foreground">회의록 자료가 준비되면 이곳에 표시됩니다.<br />(data/history.json의 해당 항목 <code className="text-xs">pdf</code> 또는 <code className="text-xs">images</code> 경로를 채워주세요.)</p>
                      </div>
                    )}
                  </div>
                </SectionShell>
              )}

              {active === "reviews" && (
                <SectionShell en="Reflections" title="필사자 후기">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(history.reviews || []).map((review) => (
                      <figure key={review.id} className="grid gap-3 rounded-lg border bg-card p-4 shadow-premium transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                        <Quote className="h-5 w-5 text-accent" />
                        <blockquote className="typo-ko typo-ko-body text-[15px] leading-relaxed text-foreground/90">{review.message}</blockquote>
                        <figcaption className="mt-1 flex items-baseline gap-1.5 border-t pt-3">
                          <span className="typo-ko text-sm font-semibold text-foreground">{review.name}</span>
                          {review.role && (
                            <span className="typo-ko text-xs font-medium text-primary">{review.role}</span>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </SectionShell>
              )}

              {active === "album" && (
                <SectionShell en="Production Album" title="제작 앨범">
                  <p className="typo-ko typo-ko-body text-[15px] leading-relaxed text-foreground/90">
                    성경 이어쓰기 제작 과정과 은혜의 순간들을 갤러리 앨범으로 모았습니다. 
                    사진을 클릭하시면 큰 이미지로 감상하실 수 있습니다.
                  </p>

                  {albumItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {albumItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => setActiveAlbumIndex(idx)}
                          className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md cursor-pointer"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-muted">
                            <img
                              src={item.src || item.image}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm shadow-md transition-transform duration-300 group-hover:scale-110">
                                <ZoomIn className="h-5 w-5" />
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 p-2.5 sm:p-3">
                            <p className="typo-ko text-xs sm:text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {item.title}
                            </p>
                            {item.date && (
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarDays className="h-3 w-3 shrink-0" />
                                <span>{item.date}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                      <Images className="h-8 w-8 text-muted-foreground" />
                      <p className="typo-ko mt-2 text-sm text-muted-foreground">등록된 제작 앨범 사진이 없습니다.</p>
                    </div>
                  )}
                </SectionShell>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Album Lightbox Modal */}
        {activeAlbumIndex !== null && (
          <AlbumLightboxModal
            items={albumItems}
            activeIndex={activeAlbumIndex}
            onClose={() => setActiveAlbumIndex(null)}
            onPrev={handlePrevAlbum}
            onNext={handleNextAlbum}
          />
        )}
      </main>
    </SiteShell>
  );
}
