"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  compareVersions,
  convert,
  detectVersion,
  NoVersionInfoError,
  NotGma2XmlError,
  type DetectResult,
  type Version,
} from "@/lib/convert";
import {
  CATALOG,
  downgradeTargets,
  versionString,
  withVersionSuffix,
} from "@/lib/versions";

interface LoadedFile {
  name: string;
  text: string;
  detect: DetectResult;
}

/** Read a file preserving a leading UTF-8 BOM (TextDecoder ignoreBOM keeps it). */
async function readFilePreservingBom(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const CUSTOM = "__custom__";

export default function Home() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [choice, setChoice] = useState<string>(""); // catalog label or CUSTOM
  const [custom, setCustom] = useState({ major: "", minor: "", stream: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setFile(null);
    setChoice("");
    if (!f.name.toLowerCase().endsWith(".xml")) {
      setError(`"${f.name}" is not an .xml file. V1 accepts grandMA2 .xml files only.`);
      return;
    }
    try {
      const text = await readFilePreservingBom(f);
      const detect = detectVersion(text); // throws NotGma2XmlError
      if (detect.sourceVersion === null) throw new NoVersionInfoError();
      setFile({ name: f.name, text, detect });
    } catch (e) {
      if (e instanceof NotGma2XmlError || e instanceof NoVersionInfoError) {
        setError(e.message);
      } else {
        setError("Could not read this file.");
      }
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void loadFile(f);
    },
    [loadFile],
  );

  const source = file?.detect.sourceVersion ?? null;
  const targets = useMemo(() => (source ? downgradeTargets(source) : []), [source]);

  const target: Version | null = useMemo(() => {
    if (choice === CUSTOM) {
      const major = Number(custom.major);
      const minor = Number(custom.minor);
      const stream = Number(custom.stream);
      if (
        custom.major === "" ||
        custom.minor === "" ||
        custom.stream === "" ||
        [major, minor, stream].some((n) => !Number.isInteger(n) || n < 0)
      ) {
        return null;
      }
      return { major, minor, stream };
    }
    const entry = CATALOG.find((c) => c.label === choice);
    return entry ? entry.version : null;
  }, [choice, custom]);

  const result = useMemo(() => {
    if (!file || !target) return null;
    try {
      return convert(file.text, target);
    } catch {
      return null;
    }
  }, [file, target]);

  const isUpgrade = !!(source && target && compareVersions(target, source) > 0);
  const canDownload = !!(result && result.changed && !isUpgrade);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          grandMA2 Version Convertor
        </h1>
        <p className="text-sm text-foreground/70">
          Downgrade a grandMA2 XML file&rsquo;s version marker so an older console can load
          it. Everything runs in your browser &mdash; your file never leaves this page.
        </p>
      </header>

      {/* Dropzone */}
      <section>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
            dragging
              ? "border-foreground/60 bg-foreground/5"
              : "border-foreground/20 hover:border-foreground/40"
          }`}
        >
          <p className="text-sm font-medium">
            Drop a grandMA2 <code className="font-mono">.xml</code> file here
          </p>
          <p className="text-xs text-foreground/50">or click to choose a file</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {file && (
          <p className="mt-2 text-xs text-foreground/60">
            Loaded: <span className="font-mono">{file.name}</span>
          </p>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {file && source && (
        <section className="space-y-6">
          {/* Detected source */}
          <div className="rounded-lg border border-foreground/15 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-foreground/60">Detected version</span>
              <span className="font-mono font-medium">{versionString(source)}</span>
            </div>
            {file.detect.mismatch && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Note: the schemaLocation path and the version attributes disagree
                (path&nbsp;
                {file.detect.schemaVersion && versionString(file.detect.schemaVersion)},
                attrs&nbsp;
                {file.detect.attrVersion && versionString(file.detect.attrVersion)}). This
                file was likely hand-edited; conversion will set both consistently.
              </p>
            )}
            {file.detect.partial && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Note: this file&rsquo;s version attributes are incomplete (not all of
                major/minor/stream are present). Conversion rewrites the fields that exist
                without adding new ones.
              </p>
            )}
          </div>

          {/* Target selector */}
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="target">
              Convert down to
            </label>
            {targets.length === 0 && choice !== CUSTOM ? (
              <p className="text-sm text-foreground/60">
                This is already the oldest version in our list. You can still enter a
                custom version below.
              </p>
            ) : null}
            <select
              id="target"
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Select a target version&hellip;</option>
              {targets.map((t) => (
                <option key={t.label} value={t.label}>
                  {t.label}
                  {t.priority ? "  ★" : ""}
                  {t.year ? `  (${t.year})` : ""}
                  {t.confidence === "inferred" ? "  — inferred" : ""}
                </option>
              ))}
              <option value={CUSTOM}>Custom version&hellip;</option>
            </select>

            {choice === CUSTOM && (
              <div className="flex items-end gap-2">
                {(["major", "minor", "stream"] as const).map((k) => (
                  <label
                    key={k}
                    className="flex flex-col gap-1 text-xs text-foreground/60"
                  >
                    {k}
                    <input
                      type="number"
                      min={0}
                      value={custom[k]}
                      onChange={(e) =>
                        setCustom((c) => ({ ...c, [k]: e.target.value }))
                      }
                      className="w-24 rounded-lg border border-foreground/20 bg-transparent px-2 py-1.5 font-mono text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Summary + before/after */}
          {target && (
            <div className="space-y-3">
              {isUpgrade ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {versionString(target)} is newer than the source. Upgrading the marker
                  is pointless &mdash; a higher console already loads this file. Pick an
                  older version.
                </p>
              ) : !result?.changed ? (
                <p className="text-sm text-foreground/60">
                  Target equals the source &mdash; no conversion needed.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    <span className="font-mono">{versionString(source)}</span>
                    <span className="mx-2 text-foreground/40">&rarr;</span>
                    <span className="font-mono font-medium">{versionString(target)}</span>
                  </p>
                  <div className="space-y-2 text-xs">
                    <BeforeAfter label="Before" line={result!.before} tone="muted" />
                    <BeforeAfter label="After" line={result!.after} tone="accent" />
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!canDownload}
            onClick={() => {
              if (!result || !target) return;
              download(withVersionSuffix(file.name, target), result.output);
            }}
            className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {target && canDownload
              ? `Download ${withVersionSuffix(file.name, target)}`
              : "Download converted file"}
          </button>
        </section>
      )}
    </main>
  );
}

function BeforeAfter({
  label,
  line,
  tone,
}: {
  label: string;
  line: string;
  tone: "muted" | "accent";
}) {
  return (
    <div>
      <span className="text-foreground/50">{label}</span>
      <pre
        className={`mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md border px-3 py-2 font-mono ${
          tone === "accent"
            ? "border-foreground/30 bg-foreground/5"
            : "border-foreground/10 text-foreground/60"
        }`}
      >
        {line}
      </pre>
    </div>
  );
}
