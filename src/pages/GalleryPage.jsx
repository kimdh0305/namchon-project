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
  Quote
} from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/data";

const PREFACE = [
  "남서울평촌교회 30주년을 맞아, 온 성도가 손으로 성경을 옮겨 적었습니다. 이 전시관은 그 필사의 시간을 책의 물성 그대로 보존하고, 다음 세대에 전하기 위해 마련되었습니다.",
  "한 사람의 손끝에서 완성된 한 페이지가 모여 66권이 되었습니다. 종이의 흐름과 잉크의 결, 함께 기도하며 적어 내려간 공동체의 시간을 한 화면에서 만나실 수 있습니다.",
  "이 기록이 단지 과거의 보관이 아니라, 말씀을 사랑하는 마음이 다음 세대로 이어지는 통로가 되기를 바랍니다."
];

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

const DOC_IMAGES = {
  creed: "/assets/history/사도신경.jfif",
  "lords-prayer": "/assets/history/주기도문.jfif",
  commandments: "/assets/history/십계명.jfif"
};

function DocImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="mx-auto max-h-[75vh] w-full rounded-lg border bg-card object-contain shadow-premium"
    />
  );
}

const SECTIONS = [
  { id: "preface", title: "발간사", en: "Preface", icon: BookText },
  { id: "creed", title: "사도신경", en: "Apostles' Creed", icon: ScrollText },
  { id: "lords-prayer", title: "주기도문", en: "The Lord's Prayer", icon: ScrollText },
  { id: "commandments", title: "십계명", en: "Ten Commandments", icon: ScrollText },
  {
    id: "process",
    title: "제작 과정",
    en: "Making Process",
    icon: FileText,
    children: [
      { id: "participants", title: "참여자 명단", en: "Participants", icon: Users },
      { id: "minutes", title: "회의록", en: "Meeting Minutes", icon: NotebookPen },
      { id: "reviews", title: "필사자 후기", en: "Reflections", icon: MessageSquareQuote }
    ]
  }
];

const PROCESS_CHILD_IDS = ["participants", "minutes", "reviews"];

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

export function GalleryPage() {
  const [history, setHistory] = useState({ participants: [], reviews: [], minutes: [] });
  const [gallery, setGallery] = useState({ items: [] });
  const [active, setActive] = useState("preface");
  const [processOpen, setProcessOpen] = useState(true);
  const [activeMinute, setActiveMinute] = useState(null);

  useEffect(() => {
    fetchJson("/data/history.json")
      .then((data) => setHistory(data || {}))
      .catch(() => setHistory({ participants: [], reviews: [], minutes: [] }));
    fetchJson("/data/gallery.json")
      .then(setGallery)
      .catch(() => setGallery({ items: [] }));
  }, []);

  const minutes = history.minutes || [];
  const selectedMinute = useMemo(
    () => minutes.find((m) => m.id === activeMinute) || minutes[0] || null,
    [minutes, activeMinute]
  );

  function selectSection(id) {
    setActive(id);
    if (PROCESS_CHILD_IDS.includes(id) || id === "process") setProcessOpen(true);
  }

  return (
    <SiteShell>
      <main className="container grid gap-6 py-8 lg:py-10">
        <section className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary px-6 py-12 text-primary-foreground shadow-premium sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <Badge variant="secondary" className="txt-en border-transparent bg-secondary/20 text-primary-foreground">History</Badge>
          <h1 className="typo-ko typo-ko-title mt-5 font-serif text-3xl font-semibold sm:text-5xl">제작 스토리</h1>
          <p className="typo-ko typo-ko-body mt-4 max-w-3xl text-sm text-primary-foreground/80 sm:text-base">발간사와 신앙의 고백, 그리고 손글씨 성경이 완성되기까지의 과정을 한곳에 모았습니다.</p>
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
                <SectionShell en="Preface" title="발간사">
                  <div className="grid gap-4">
                    {PREFACE.map((para, idx) => (
                      <p key={idx} className="typo-ko typo-ko-body text-[15px] leading-relaxed text-foreground/90">{para}</p>
                    ))}
                    <p className="typo-ko mt-2 text-sm text-muted-foreground">남서울평촌교회 30주년 기념 성경 전시관</p>
                  </div>
                </SectionShell>
              )}

              {active === "creed" && (
                <SectionShell en="Apostles' Creed" title="사도신경">
                  <DocImage src={DOC_IMAGES.creed} alt="사도신경" />
                  <blockquote className="typo-ko typo-ko-body rounded-lg border-l-4 border-accent bg-muted/40 p-5 text-[15px] leading-loose text-foreground/90">
                    {APOSTLES_CREED}
                  </blockquote>
                </SectionShell>
              )}

              {active === "lords-prayer" && (
                <SectionShell en="The Lord's Prayer" title="주기도문">
                  <DocImage src={DOC_IMAGES["lords-prayer"]} alt="주기도문" />
                  <blockquote className="typo-ko typo-ko-body rounded-lg border-l-4 border-accent bg-muted/40 p-5 text-[15px] leading-loose text-foreground/90">
                    {LORDS_PRAYER}
                  </blockquote>
                </SectionShell>
              )}

              {active === "commandments" && (
                <SectionShell en="Ten Commandments" title="십계명">
                  <DocImage src={DOC_IMAGES.commandments} alt="십계명" />
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
                  <p className="typo-ko typo-ko-body text-[15px] leading-relaxed text-foreground/90">스캔부터 웹 전시까지, 손글씨 성경을 디지털 보존물로 완성한 과정을 기록합니다. 왼쪽 목차에서 참여자 명단, 회의록, 필사자 후기를 살펴보실 수 있습니다.</p>
                  {gallery.items?.length > 0 && (
                    <div className="grid gap-3">
                      {gallery.items.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                          <span className="txt-en text-xs font-semibold text-muted-foreground">Step {String(idx + 1).padStart(2, "0")}</span>
                          <div className="grid">
                            <p className="typo-ko text-sm font-semibold">{item.title}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {item.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionShell>
              )}

              {active === "participants" && (
                <SectionShell en="Participants" title="참여자 명단">
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
                        <p className="typo-ko text-sm text-muted-foreground">회의록 자료가 준비되면 이곳에 표시됩니다.<br />(data/history.json의 해당 항목 <code className="text-xs">pdf</code> 또는 <code className="text-xs">image</code> 경로를 채워주세요.)</p>
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
                        <figcaption className="mt-1 flex items-center justify-between gap-2 border-t pt-3">
                          <span className="typo-ko flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-foreground">{review.name}</span>
                            {review.affiliation && (
                              <span className="text-xs font-medium text-primary">{review.affiliation}</span>
                            )}
                          </span>
                          <span className="typo-ko text-xs text-muted-foreground">{review.team} · {review.date}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </SectionShell>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SiteShell>
  );
}
