import type { BatchEntry, BatchResult, EntryStatus } from "@/lib/batch";
import { versionString } from "@/lib/versions";
import type { Version } from "@/lib/convert";
import { Callout, DiffTable, Icon } from "./ui";

const BADGE: Record<EntryStatus, { label: string; cls: string }> = {
  ok: { label: "ok", cls: "border-accent-border bg-accent-soft text-accent-strong" },
  warning: { label: "warning", cls: "border-warning-border bg-warning-bg text-warning" },
  skipped: { label: "skipped", cls: "border-line bg-muted text-fg-subtle" },
};

function StatusBadge({ status }: { status: EntryStatus }) {
  const b = BADGE[status];
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium ${b.cls}`}>
      {b.label}
    </span>
  );
}

/** Step 1 in batch mode: every picked XML file with its detected version and status. */
export function FileList({
  entries,
  ignored,
  onReplace,
}: {
  entries: BatchEntry[];
  /** Non-.xml files that were left out of the batch. */
  ignored: number;
  onReplace: () => void;
}) {
  const skipped = entries.filter((e) => e.status === "skipped").length;
  const warned = entries.filter((e) => e.status === "warning").length;
  return (
    <div className="overflow-hidden rounded-lg border border-accent-border">
      <div className="flex items-center gap-3 bg-accent-soft px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-page text-accent-strong">
          {Icon.file()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {entries.length} XML file{entries.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-fg-muted">
            {[
              `${entries.length - skipped} convertible`,
              warned > 0 && `${warned} with warnings`,
              skipped > 0 && `${skipped} skipped`,
              ignored > 0 && `${ignored} other file${ignored === 1 ? "" : "s"} ignored`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onReplace}
          className="text-xs font-medium text-accent-strong hover:underline"
        >
          Replace
        </button>
      </div>
      <ul className="max-h-[280px] divide-y divide-line overflow-y-auto border-t border-accent-border">
        {entries.map((e, i) => (
          <li key={`${i}:${e.path}`} className="px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] leading-5" title={e.path}>
                {e.path}
              </span>
              {e.status !== "skipped" && e.detect?.sourceVersion && (
                <span className="shrink-0 font-mono text-xs text-fg-muted">
                  {versionString(e.detect.sourceVersion)}
                </span>
              )}
              <StatusBadge status={e.status} />
            </div>
            {e.note && <p className="mt-0.5 text-xs text-fg-subtle">{e.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Step 3 in batch mode: what changes, what is kept or skipped, caveats, per-file diffs. */
export function BatchReview({
  result,
  source,
  target,
}: {
  result: BatchResult;
  source: Version;
  target: Version;
}) {
  // Group content caveats by kind, listing the affected files.
  const caveats = new Map<string, { message: string; paths: string[] }>();
  for (const f of result.files) {
    for (const c of f.caveats) {
      const g = caveats.get(c.id) ?? { message: c.message, paths: [] };
      g.paths.push(f.path);
      caveats.set(c.id, g);
    }
  }
  const changed = result.files.filter((f) => f.changed);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[22px] leading-7 font-medium tracking-tight text-fg-muted">
          {versionString(source)}
        </span>
        <span className="text-accent">{Icon.arrowRight(20)}</span>
        <span className="font-mono text-[22px] leading-7 font-medium tracking-tight text-accent-strong">
          {versionString(target)}
        </span>
        <span className="ml-auto text-xs text-fg-muted">
          {result.changedCount} of {result.files.length + result.skipped.length} files change
        </span>
      </div>
      <p className="text-sm text-fg-muted">
        {[
          `${result.changedCount} file${result.changedCount === 1 ? "" : "s"} converted`,
          result.keptCount > 0 &&
            `${result.keptCount} already at or below ${versionString(target)} (copied as is)`,
          result.skipped.length > 0 && `${result.skipped.length} skipped (not in the zip)`,
        ]
          .filter(Boolean)
          .join(" · ")}
        . The zip keeps the folder structure and file names.
      </p>

      {[...caveats.entries()].map(([id, g]) => (
        <Callout key={id} tone="warning" title="Check before importing">
          {g.message}
          <ul className="mt-1 list-disc pl-4 font-mono break-all">
            {g.paths.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Callout>
      ))}

      {result.skipped.length > 0 && (
        <Callout tone="info" title="Skipped files">
          <ul className="list-disc pl-4">
            {result.skipped.map((s) => (
              <li key={s.path}>
                <span className="font-mono break-all">{s.path}</span> — {s.note}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      {changed.length > 0 && (
        <details className="group text-xs">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-medium text-accent-strong [&::-webkit-details-marker]:hidden">
            Show per-file changes
            <span className="transition group-open:rotate-180">{Icon.chevron(14)}</span>
          </summary>
          <div className="mt-3 space-y-4">
            {changed.map((f) => (
              <div key={f.path} className="space-y-2">
                <p className="font-mono break-all text-fg-muted">
                  {f.path} <span className="text-fg-subtle">({versionString(f.source)})</span>
                </p>
                <DiffTable rows={f.rows} unreadable={f.unreadable} />
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
