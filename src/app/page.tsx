"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  compareVersions,
  convert,
  detectVersion,
  diffFields,
  NotGma2XmlError,
  type DetectResult,
  type Version,
} from "@/lib/convert";
import {
  analyzeBatch,
  batchSourceVersion,
  buildZip,
  convertBatch,
  zipLayout,
  type BatchEntry,
  type BatchInput,
} from "@/lib/batch";
import { downgradeCaveats } from "@/lib/caveats";
import { collectDropped, isXmlPath, type Picked } from "@/lib/drop";
import { decodeUtf8Strict, encodeUtf8, UnsupportedEncodingError } from "@/lib/encoding";
import { createLatestGuard } from "@/lib/latest";
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
import { BatchReview, FileList } from "@/components/batch";

interface LoadedFile {
  name: string;
  text: string;
  detect: DetectResult;
}

interface LoadedBatch {
  entries: BatchEntry[];
  /** Non-.xml files left out (including macOS "._*" metadata files on USB sticks). */
  ignored: number;
}

interface LoadError {
  title: string;
  body: string;
  /** Raw text to show verbatim (e.g. the unreadable <MA> tag). */
  raw?: string;
}

const RAW_MAX = 600;
const truncate = (s: string) => (s.length > RAW_MAX ? `${s.slice(0, RAW_MAX)}…` : s);

/** Read a file as strict UTF-8, keeping a leading BOM (throws UnsupportedEncodingError). */
async function readUtf8File(file: File): Promise<string> {
  return decodeUtf8Strict(new Uint8Array(await file.arrayBuffer()));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function download(filename: string, text: string) {
  // encodeUtf8 is the exact inverse of decodeUtf8Strict, so unchanged bytes stay unchanged.
  downloadBlob(filename, new Blob([encodeUtf8(text)], { type: "application/xml;charset=utf-8" }));
}

const CUSTOM = "__custom__";

/** Warning text for missing and/or non-numeric *_vers attributes (one string, so JSX keeps spaces). */
function versAttrWarning(d: DetectResult): string {
  const list = (names: string[]) => names.join(" and ");
  const parts: string[] = [];
  if (d.missingVers.length > 0) {
    parts.push(
      `${list(d.missingVers)} ${d.missingVers.length === 1 ? "is" : "are"} missing from the <MA> tag.`,
    );
  }
  if (d.unreadableVers.length > 0) {
    parts.push(
      `${list(d.unreadableVers)} ${d.unreadableVers.length === 1 ? "has a value that isn’t" : "have values that aren’t"} a whole number.`,
    );
  }
  parts.push("Conversion rewrites only the readable fields and never adds or changes the others.");
  return parts.join(" ");
}

export default function Home() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [batch, setBatch] = useState<LoadedBatch | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [dragging, setDragging] = useState(false);
  const [choice, setChoice] = useState<string>(""); // catalog label or CUSTOM
  const [custom, setCustom] = useState({ major: "", minor: "", stream: "" });
  const [loading, setLoading] = useState<string | null>(null); // name of the file being read
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [guard] = useState(createLatestGuard);

  const loadFile = useCallback(async (f: File) => {
    // A newer selection supersedes any read still in flight.
    const isCurrent = guard.start();
    setError(null);
    setFile(null);
    setBatch(null);
    setChoice("");
    setLoading(null);
    if (!f.name.toLowerCase().endsWith(".xml")) {
      setError({
        title: "Not an .xml file",
        body: `${f.name} isn’t an .xml file. Only grandMA2 .xml exports are supported for now.`,
      });
      return;
    }
    setLoading(f.name);
    try {
      const text = await readUtf8File(f);
      if (!isCurrent()) return;
      const detect = detectVersion(text); // throws NotGma2XmlError
      if (detect.sourceVersion === null) {
        setError({
          title: "No version information",
          body: `The <MA> tag in ${f.name} has no readable version marker (no schemaLocation version path and no complete set of numeric major/minor/stream_vers attributes), so there is nothing to convert. This is what was found:`,
          raw: truncate(detect.rawTag),
        });
        return;
      }
      setFile({ name: f.name, text, detect });
    } catch (e) {
      if (!isCurrent()) return;
      if (e instanceof UnsupportedEncodingError) {
        setError({ title: "Unsupported text encoding", body: `${f.name}: ${e.message}` });
      } else if (e instanceof NotGma2XmlError) {
        setError({
          title: "Not a grandMA2 file",
          body: `${f.name} has no <MA> root tag. Choose an XML file exported from grandMA2 or grandMA2 onPC.`,
        });
      } else {
        setError({ title: "Couldn’t read this file", body: `${f.name} could not be read.` });
      }
    } finally {
      if (isCurrent()) setLoading(null);
    }
  }, [guard]);

  /** Several files or a folder → batch mode. A single picked file keeps the single-file flow. */
  const loadPicked = useCallback(
    async (picked: Picked[], folder: boolean) => {
      if (picked.length === 0) {
        setLoading(null);
        return;
      }
      if (picked.length === 1 && !folder) return loadFile(picked[0].file);
      const isCurrent = guard.start();
      setError(null);
      setFile(null);
      setBatch(null);
      setChoice("");
      const xml = picked.filter((p) => isXmlPath(p.path));
      if (xml.length === 0) {
        setLoading(null);
        setError({
          title: "No .xml files",
          body: `None of the ${picked.length} selected files is an .xml file. Choose grandMA2 .xml exports or the folder that contains them.`,
        });
        return;
      }
      setLoading(`${xml.length} files`);
      try {
        const inputs: BatchInput[] = [];
        for (const p of xml) {
          try {
            inputs.push({ path: p.path, text: decodeUtf8Strict(new Uint8Array(await p.file.arrayBuffer())) });
          } catch (e) {
            inputs.push({
              path: p.path,
              error: e instanceof UnsupportedEncodingError ? e.message : "Couldn’t read this file.",
            });
          }
          if (!isCurrent()) return;
        }
        const entries = analyzeBatch(inputs);
        setBatch({ entries, ignored: picked.length - xml.length });
        if (entries.every((e) => e.status === "skipped")) {
          setError({
            title: "Nothing to convert",
            body: "None of these files is a grandMA2 XML file with a readable version marker.",
          });
        }
      } finally {
        if (isCurrent()) setLoading(null);
      }
    },
    [guard, loadFile],
  );

  useEffect(() => {
    // Not in React's typings; enables picking a whole folder (with relative paths).
    folderRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  // Accept drops anywhere on the page (also after a file is loaded, to replace it).
  // Without this, a drop outside the dropzone makes the browser open the file and
  // navigate away, losing all state.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (!e.dataTransfer) return;
      // Walking a dropped folder can take a while: claim "latest pick" now and show progress,
      // so a file picked during the walk wins and the old walk's result is dropped.
      const isCurrent = guard.start();
      setError(null);
      setFile(null);
      setBatch(null);
      setChoice("");
      setLoading("dropped items");
      collectDropped(e.dataTransfer)
        .then(({ picked, folder }) => {
          if (isCurrent()) return loadPicked(picked, folder);
        })
        .catch(() => {
          if (!isCurrent()) return;
          setLoading(null);
          setError({
            title: "Couldn’t read the dropped folder",
            body: "Some files or folders couldn’t be read (they may have been moved or need permission). Try again, or use “Choose a folder”.",
          });
        });
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [guard, loadPicked]);

  const batchSource = useMemo(() => (batch ? batchSourceVersion(batch.entries) : null), [batch]);
  const source = file?.detect.sourceVersion ?? batchSource;
  const loaded = !!file || !!batchSource;
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

  const caveats = useMemo(
    () => (file && source && target ? downgradeCaveats(file.text, source, target) : []),
    [file, source, target],
  );

  const batchResult = useMemo(
    () =>
      batch && source && target && compareVersions(target, source) < 0
        ? convertBatch(batch.entries, target)
        : null,
    [batch, source, target],
  );
  const zip = useMemo(() => {
    if (!batchResult || !target) return null;
    const { prefix, name } = zipLayout(batchResult.files.map((f) => f.path));
    return { prefix, filename: `${name ?? "grandMA2-xml"}_${versionString(target)}.zip` };
  }, [batchResult, target]);

  const isUpgrade = !!(source && target && compareVersions(target, source) > 0);
  const canDownload = !!(result && result.changed && !isUpgrade);
  const noTargets = loaded && targets.length === 0;

  const step2: StepState = !loaded ? "locked" : target ? "done" : "active";
  const step3: StepState = !loaded || !target ? "locked" : "active";
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
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = [...(e.target.files ?? [])].map((file) => ({ file, path: file.name }));
              void loadPicked(picked, false);
              e.target.value = "";
            }}
          />
          <input
            ref={folderRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const picked = [...(e.target.files ?? [])].map((file) => ({
                file,
                path: file.webkitRelativePath || file.name,
              }));
              void loadPicked(picked, true);
              e.target.value = "";
            }}
          />

          {/* Step 1 — upload */}
          <StepCard n={1} title="Upload files" state={loaded ? "done" : "active"}>
            {batch && !loading ? (
              <FileList entries={batch.entries} ignored={batch.ignored} onReplace={pick} />
            ) : file && source ? (
              <FileChip
                name={file.name}
                meta={`Detected grandMA2 ${versionString(source)}`}
                onReplace={pick}
              />
            ) : loading ? (
              <div
                role="status"
                className="flex h-[168px] w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-accent bg-accent-soft"
              >
                <span className="text-accent-strong">{Icon.spinner(20)}</span>
                <span className="max-w-full px-4 text-sm font-medium break-all">
                  Reading {loading}…
                </span>
                <span className="text-xs text-fg-muted">Large exports can take a moment.</span>
                <button
                  type="button"
                  onClick={pick}
                  className="mt-1 text-xs font-medium text-accent-strong hover:underline"
                >
                  Choose a different file
                </button>
              </div>
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
                  Drop grandMA2 <code className="font-mono">.xml</code> files or an exported folder
                </span>
                <span className="text-xs text-fg-muted">or click to browse</span>
              </button>
            )}
            {!loaded && !loading && (
              <p className="-mt-1 text-center text-xs text-fg-muted">
                Converting a whole show export?{" "}
                <button
                  type="button"
                  onClick={() => folderRef.current?.click()}
                  className="font-medium text-accent-strong hover:underline"
                >
                  Choose a folder
                </button>{" "}
                — every <code className="font-mono">.xml</code> inside is converted into one zip.
              </p>
            )}

            {error && (
              <Callout tone="error" title={error.title}>
                {error.body}
                {error.raw && (
                  <pre className="mt-2 whitespace-pre-wrap break-all rounded-md border border-danger-border bg-page px-3 py-2 font-mono text-fg-muted">
                    {error.raw}
                  </pre>
                )}
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
            {file && (file.detect.partial || file.detect.unreadableVers.length > 0) && (
              <Callout tone="warning" title="Version attributes incomplete">
                {versAttrWarning(file.detect)}
              </Callout>
            )}
          </StepCard>

          {/* Step 2 — target */}
          <StepCard
            n={2}
            title="Choose target version"
            state={step2}
            hint={!loaded ? "Upload a file first" : undefined}
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
            {batch && source && target && (
              <>
                {isUpgrade ? (
                  <Callout tone="warning" title="Target is newer than the source">
                    {versionString(target)} is newer than every file in this batch (newest:{" "}
                    {versionString(source)}), so there is nothing to convert. Pick an older version.
                  </Callout>
                ) : !batchResult ? (
                  <Callout tone="info" title="No conversion needed">
                    The target equals the newest version in this batch.
                  </Callout>
                ) : (
                  <BatchReview result={batchResult} source={source} target={target} />
                )}
                <button
                  type="button"
                  disabled={!batchResult || batchResult.changedCount === 0 || !zip}
                  onClick={() => {
                    if (!batchResult || !zip) return;
                    const bytes = buildZip(batchResult.files, zip.prefix);
                    downloadBlob(zip.filename, new Blob([bytes], { type: "application/zip" }));
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-on-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-subtle"
                >
                  {Icon.download()}
                  {batchResult && batchResult.changedCount > 0 && zip
                    ? `Download ${zip.filename}`
                    : "Download zip"}
                </button>
              </>
            )}
            {!batch && source && target && result && (
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
                    <DiffTable rows={rows} unreadable={file?.detect.unreadableVers ?? []} />
                    {caveats.map((c) => (
                      <Callout key={c.id} tone="warning" title="Check before importing">
                        {c.message}
                      </Callout>
                    ))}
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
