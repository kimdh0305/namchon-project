import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

function menuClass({ isActive }) {
  return cn(
    "txt-en rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
    isActive && "bg-accent text-accent-foreground"
  );
}

export function SiteShell({ children }) {
  return (
    <div className="min-h-screen bg-grid-fade">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="typo-ko font-serif text-sm font-semibold leading-tight tracking-tight text-primary sm:text-base">
            <span className="block sm:inline">창립 30주년 기념</span>{" "}
            <span className="block sm:inline">전교인 성경이어쓰기</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/reader/genesis" className={menuClass}>Reader</NavLink>
            <NavLink to="/gallery" className={menuClass}>History</NavLink>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
