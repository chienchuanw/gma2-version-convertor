"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  compareVersions,
  convert,
  detectVersion,
  diffFields,
  NoVersionInfoError,
  NotGma2XmlError,
  type DetectResult,
  type Version,
} from "@/lib/convert";
import {
  CATALOG,
  commonTargets,
  downgradeTargets,
  versionString,
  withVersionSuffix,
} from "@/lib/versions";
import {
  Callout,
  DiffTable,
  FieldLabel,
  FileChip,
  Footer,
  Header,
  Icon,
  RawTag,
  StepCard,
  VersionChip,
  type StepState,
} from "@/components/ui";

interface LoadedFile {
  name: string;
  text: string;
  detect: DetectResult;
}

interface LoadError {
  title: string;
  body: string;
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
  const [error, setError] = useState<LoadError | null>(null);
  const [dragging, setDragging] = useState(false);
  const [choice, setChoice] = useState<string>(""); // catalog label or CUSTOM
  const [custom, setCustom] = useState({ major: "", minor: "", stream: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setFile(null);
    setChoice("");
    if (!f.name.toLowerCase().endsWith(".xml")) {
      setError({
        title: "Not an .xml file",
        body: `${f.name} isn’t an .xml file. Only grandMA2 .xml exports are supported for now.`,
      });
      return;
    }
    try {
      const text = await readFilePreservingBom(f);
      const detect = detectVersion(text); // throws NotGma2XmlError
      if (detect.sourceVersion === null) throw new NoVersionInfoError();
      setFile({ name: f.name, text, detect });
    } catch (e) {
      if (e instanceof NotGma2XmlError) {
        setError({
          title: "Not a grandMA2 file",
          body: `${f.name} has no <MA> root tag. Choose an XML file exported from grandMA2 or grandMA2 onPC.`,
        });
      } else if (e instanceof NoVersionInfoError) {
        setError({
          title: "No version information",
          body: `The <MA> tag in ${f.name} has no schemaLocation path and no *_vers attributes, so there is nothing to convert.`,
        });
      } else {
        setError({ title: "Couldn’t read this file", body: `${f.name} could not be read.` });
      }
    }
  }, []);

  // Accept drops anywhere on the page (also after a file is loaded, to replace it).
  // Without this, a drop outside the dropzone makes the browser open the file and
  // navigate away, losing all state.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) void loadFile(f);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [loadFile]);

  const source = file?.detect.sourceVersion ?? null;
  const targets = useMemo(() => (source ? downgradeTargets(source) : []), [source]);
  const common = useMemo(() => (source ? commonTargets(source) : []), [source]);

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

  const rows = useMemo(
    () => (file && target ? diffFields(file.text, target) : []),
    [file, target],
  );

  const isUpgrade = !!(source && target && compareVersions(target, source) > 0);
  const canDownload = !!(result && result.changed && !isUpgrade);
  const noTargets = !!file && targets.length === 0;

  const step2: StepState = !file ? "locked" : target ? "done" : "active";
  const step3: StepState = !file || !target ? "locked" : "active";
  const step3Hint = noTargets && choice !== CUSTOM ? "No conversion needed" : undefined;

  const pick = () => inputRef.current?.click();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />

      <main className="flex-1 px-4 pt-14 pb-[72px]">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
          <div className="space-y-2 pb-4">
            <h1 className="text-[30px] leading-[38px] font-semibold tracking-tight">
              Downgrade grandMA2 files
              <br />
              for older consoles.
            </h1>
            <p className="text-sm leading-[22px] text-fg-muted">
              Rewrites the version marker so an older grandMA2 or onPC can load a file saved by
              a newer one. Your file never leaves this page.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />

          {/* Step 1 — upload */}
          <StepCard n={1} title="Upload file" state={file ? "done" : "active"}>
            {file && source ? (
              <FileChip
                name={file.name}
                meta={`Detected grandMA2 ${versionString(source)}`}
                onReplace={pick}
              />
            ) : (
              <button
                type="button"
                onClick={pick}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                className={`flex h-[168px] w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed transition ${
                  dragging
                    ? "border-accent bg-accent-soft"
                    : "border-line-strong bg-surface hover:border-accent"
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  {Icon.upload(18)}
                </span>
                <span className="text-sm font-medium">
                  Drop a grandMA2 <code className="font-mono">.xml</code> file here
                </span>
                <span className="text-xs text-fg-muted">or click to browse</span>
              </button>
            )}

            {error && (
              <Callout tone="error" title={error.title}>
                {error.body}
              </Callout>
            )}
            {file?.detect.mismatch && file.detect.schemaVersion && file.detect.attrVersion && (
              <Callout tone="warning" title="Version fields disagree">
                The schemaLocation path says {versionString(file.detect.schemaVersion)} but the
                version attributes say {versionString(file.detect.attrVersion)}, so this file was
                likely hand-edited. The higher version ({versionString(source!)}) is used as the
                source, and conversion sets both to the same target.
              </Callout>
            )}
            {file?.detect.partial && (
              <Callout tone="warning" title="Version attributes incomplete">
                Not all of major_vers / minor_vers / stream_vers are present in the &lt;MA&gt;
                tag. Conversion rewrites the fields that exist and never adds new ones.
              </Callout>
            )}
          </StepCard>

          {/* Step 2 — target */}
          <StepCard
            n={2}
            title="Choose target version"
            state={step2}
            hint={!file ? "Upload a file first" : undefined}
          >
            {noTargets && choice !== CUSTOM && source && (
              <Callout tone="info" title="Already the oldest known version">
                {versionString(source)} is the oldest release in our list, so there is nothing
                older to pick. If you need an unlisted build, choose “Custom version…”.
              </Callout>
            )}

            {common.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-fg-muted">Common targets</p>
                <div className="flex flex-wrap gap-2">
                  {common.map((c) => (
                    <VersionChip
                      key={c.label}
                      label={c.label}
                      selected={choice === c.label}
                      onClick={() => setChoice(c.label)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <FieldLabel htmlFor="target">All versions</FieldLabel>
              <div className="relative">
                <select
                  id="target"
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-line-strong bg-page pr-9 pl-3 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">Select a target version…</option>
                  {targets.map((t) => (
                    <option key={t.label} value={t.label}>
                      {t.label}
                      {t.priority ? "  ★" : ""}
                      {t.year ? `  (${t.year})` : ""}
                      {t.confidence === "inferred" ? "  — inferred" : ""}
                    </option>
                  ))}
                  <option value={CUSTOM}>Custom version…</option>
                </select>
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-muted">
                  {Icon.chevron()}
                </span>
              </div>
            </div>

            {choice === CUSTOM && (
              <div className="flex flex-wrap items-end gap-3">
                {(["major", "minor", "stream"] as const).map((k) => (
                  <label key={k} className="flex flex-col gap-1 text-xs text-fg-muted">
                    {k}
                    <input
                      type="number"
                      min={0}
                      value={custom[k]}
                      onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                      className="h-9 w-24 rounded-lg border border-line-strong bg-page px-3 font-mono text-sm font-medium text-fg focus:border-accent focus:outline-none"
                    />
                  </label>
                ))}
                <span className="pb-2 text-xs text-fg-subtle">
                  Use for beta or unlisted builds.
                </span>
              </div>
            )}
          </StepCard>

          {/* Step 3 — review & download */}
          <StepCard n={3} title="Review & download" state={step3} hint={step3Hint}>
            {source && target && result && (
              <>
                {isUpgrade ? (
                  <Callout tone="warning" title="Target is newer than the source">
                    {versionString(target)} is newer than {versionString(source)}. A newer
                    console already loads this file, so there is nothing to convert. Pick an
                    older version.
                  </Callout>
                ) : !result.changed ? (
                  <Callout tone="info" title="No conversion needed">
                    The target equals the file’s current version marker.
                  </Callout>
                ) : (
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
                        {rows.filter((r) => r.changed).length} of{" "}
                        {rows.filter((r) => r.before !== null).length} fields change
                      </span>
                    </div>
                    <DiffTable rows={rows} />
                    <RawTag before={result.before} after={result.after} />
                  </>
                )}
                <button
                  type="button"
                  disabled={!canDownload}
                  onClick={() => {
                    if (!file || !result || !target) return;
                    download(withVersionSuffix(file.name, target), result.output);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-on-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-subtle"
                >
                  {Icon.download()}
                  {canDownload && file
                    ? `Download ${withVersionSuffix(file.name, target)}`
                    : "Download converted file"}
                </button>
              </>
            )}
          </StepCard>
        </div>
      </main>

      <Footer />
    </div>
  );
}
