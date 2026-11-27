import type { ReactNode } from "react";
import type { FieldDiff } from "@/lib/convert";

export const REPO_URL = "https://github.com/chienchuanw/gma2-version-convertor";
/** Absolute on purpose: on the origin hostname a relative "/" would not reach the hub. */
export const HUB_URL = "https://gma2.chienchuanw.com/";

/* ---------- Icons (16px, currentColor) ---------- */

function Svg({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  mark: (s?: number) => (
    <Svg size={s}>
      <path d="M12 5v12m0 0-5-5m5 5 5-5" strokeWidth={2.5} />
    </Svg>
  ),
  download: (s?: number) => (
    <Svg size={s}>
      <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" />
    </Svg>
  ),
  upload: (s?: number) => (
    <Svg size={s}>
      <path d="M12 15V3m0 0L7 8m5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </Svg>
  ),
  check: (s?: number) => (
    <Svg size={s}>
      <path d="m5 12 5 5 9-10" strokeWidth={2.5} />
    </Svg>
  ),
  chevron: (s?: number) => (
    <Svg size={s}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  arrowRight: (s?: number) => (
    <Svg size={s}>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
    </Svg>
  ),
  external: (s?: number) => (
    <Svg size={s}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Svg>
  ),
  file: (s?: number) => (
    <Svg size={s}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </Svg>
  ),
  lock: (s?: number) => (
    <Svg size={s}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  ),
  warning: (s?: number) => (
    <Svg size={s}>
      <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </Svg>
  ),
  info: (s?: number) => (
    <Svg size={s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </Svg>
  ),
  spinner: (s?: number) => (
    <span className="inline-flex animate-spin motion-reduce:animate-none">
      <Svg size={s}>
        <path d="M21 12a9 9 0 1 1-6.2-8.56" />
      </Svg>
    </span>
  ),
  error: (s?: number) => (
    <Svg size={s}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6m0-6 6 6" />
    </Svg>
  ),
};

/* ---------- Page chrome ---------- */

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 w-full max-w-[720px] items-center justify-between px-4">
        <span className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-on-accent">
            {Icon.mark()}
          </span>
          <span className="text-[17px] font-semibold tracking-tight">gma2 converter</span>
        </span>
        <span className="flex items-center gap-4">
          <a href={HUB_URL} className="text-xs font-medium text-fg-muted hover:text-fg">
            gma2 tools
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"
          >
            GitHub {Icon.external(12)}
          </a>
        </span>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line px-4 py-6 text-center text-xs leading-[18px]">
      <p className="flex items-center justify-center gap-1 text-fg-muted">
        {Icon.lock(12)} Runs entirely in your browser. No uploads, no analytics.
      </p>
      <p className="mt-1 text-fg-subtle">
        Not affiliated with or endorsed by MA Lighting. grandMA2 is a trademark of MA Lighting
        Technology GmbH.
      </p>
    </footer>
  );
}

/* ---------- Step card ---------- */

export type StepState = "active" | "done" | "locked";

export function StepCard({
  n,
  title,
  state,
  hint,
  children,
}: {
  n: number;
  title: string;
  state: StepState;
  hint?: string;
  children?: ReactNode;
}) {
  const locked = state === "locked";
  return (
    <section
      aria-label={`Step ${n}: ${title}`}
      className={`flex flex-col gap-4 rounded-xl border px-6 ${
        locked
          ? "border-line bg-surface py-[18px]"
          : state === "active"
            ? "border-accent-border bg-page py-6 shadow-[0_4px_16px_rgb(13_148_136/0.08)]"
            : "border-line bg-page py-6"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
            state === "active"
              ? "bg-accent text-on-accent"
              : state === "done"
                ? "border border-accent-border bg-accent-soft text-accent-strong"
                : "bg-muted text-fg-subtle"
          }`}
        >
          {state === "done" ? Icon.check(14) : n}
        </span>
        <h2
          className={`text-base font-semibold tracking-tight ${locked ? "text-fg-subtle" : ""}`}
        >
          {title}
        </h2>
        {hint && <span className="ml-auto text-xs text-fg-subtle">{hint}</span>}
      </div>
      {!locked && children}
    </section>
  );
}

/* ---------- Callout ---------- */

const CALLOUT = {
  warning: { cls: "border-warning-border bg-warning-bg text-warning", icon: Icon.warning },
  info: { cls: "border-line bg-surface text-fg-muted", icon: Icon.info },
  error: { cls: "border-danger-border bg-danger-bg text-danger", icon: Icon.error },
} as const;

export function Callout({
  tone,
  title,
  children,
}: {
  tone: keyof typeof CALLOUT;
  title: string;
  children: ReactNode;
}) {
  const c = CALLOUT[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-lg border px-4 py-3 text-xs leading-[18px] ${c.cls}`}
    >
      <span className="mt-px">{c.icon()}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ---------- Inputs ---------- */

export function VersionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-mono text-[12.5px] leading-5 transition ${
        selected
          ? "border-accent bg-accent-soft text-accent-strong"
          : "border-line bg-page hover:border-line-strong"
      }`}
    >
      {label}
    </button>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-fg-muted">
      {children}
    </label>
  );
}

export function FileChip({
  name,
  meta,
  onReplace,
}: {
  name: string;
  meta: string;
  onReplace: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent-border bg-accent-soft px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-page text-accent-strong">
        {Icon.file()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-fg-muted">{meta}</p>
      </div>
      <button
        type="button"
        onClick={onReplace}
        className="text-xs font-medium text-accent-strong hover:underline"
      >
        Replace
      </button>
    </div>
  );
}

/* ---------- Review ---------- */

export function DiffTable({
  rows,
  unreadable = [],
}: {
  rows: FieldDiff[];
  /** Fields present in the tag but not numeric — shown as left unchanged, not "not added". */
  unreadable?: string[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="bg-surface text-xs font-medium text-fg-subtle">
          <tr>
            <th className="w-[44%] px-4 py-2 font-medium">&lt;MA&gt; field</th>
            <th className="w-[22%] px-2 py-2 font-medium">Before</th>
            <th className="w-6 py-2" aria-hidden="true" />
            <th className="px-2 py-2 font-medium">After</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[12.5px] leading-5">
          {rows.map((r) => (
            <tr key={r.field} className="border-t border-line">
              <td className="px-4 py-2.5 text-fg-muted">{r.field}</td>
              <td className="px-2 py-2.5">
                {r.before === null ? (
                  <span className="text-fg-subtle">—</span>
                ) : (
                  <span className={r.changed ? "text-fg-subtle line-through" : ""}>
                    {r.before}
                  </span>
                )}
              </td>
              <td
                className={`py-2.5 ${r.changed ? "text-accent" : "text-fg-subtle"}`}
                aria-hidden="true"
              >
                {Icon.arrowRight(14)}
              </td>
              <td className="px-2 py-2.5">
                {r.after === null ? (
                  <span className="text-fg-subtle">
                    {unreadable.includes(r.field) ? "— (unreadable, left as is)" : "— (not added)"}
                  </span>
                ) : r.changed ? (
                  <span className="rounded bg-accent-highlight px-2 py-0.5 text-sm font-medium text-accent-strong">
                    {r.after}
                  </span>
                ) : (
                  <span className="px-2">{r.after}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RawTag({ before, after }: { before: string; after: string }) {
  return (
    <details className="group text-xs">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-medium text-accent-strong [&::-webkit-details-marker]:hidden">
        Show raw &lt;MA&gt; tag
        <span className="transition group-open:rotate-180">{Icon.chevron(14)}</span>
      </summary>
      <div className="mt-3 space-y-2">
        {[
          ["Before", before],
          ["After", after],
        ].map(([label, line]) => (
          <div key={label}>
            <span className="text-fg-subtle">{label}</span>
            <pre className="mt-1 whitespace-pre-wrap break-all rounded-md border border-line bg-surface px-3 py-2 font-mono text-fg-muted">
              {line}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}
