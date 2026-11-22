/**
 * Turning a drop or a picker selection into a flat list of files with relative paths.
 * Kept out of the React component so the folder walk can be unit-tested with fake entries.
 */

/** A picked file and its path relative to the picked/dropped folder (or just its name). */
export interface Picked {
  file: File;
  path: string;
}

/** True for *.xml files, except macOS "._*" metadata files (common on USB sticks). */
export const isXmlPath = (path: string) => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name.toLowerCase().endsWith(".xml") && !name.startsWith("._");
};

/** Every file in the dropped items, walking dropped folders recursively. */
export function collectDropped(dt: DataTransfer): Promise<{ picked: Picked[]; folder: boolean }> {
  // DataTransfer is only readable during the event, so grab entries and files synchronously.
  const files = [...dt.files].map((file) => ({ file, path: file.name }));
  const entries = [...dt.items]
    .filter((i) => i.kind === "file")
    .map((i) => i.webkitGetAsEntry?.() ?? null);
  if (entries.length === 0 || entries.some((e) => e === null) || !entries.some((e) => e!.isDirectory)) {
    return Promise.resolve({ picked: files, folder: false });
  }
  return walkEntries(entries as FileSystemEntry[]).then((picked) => ({ picked, folder: true }));
}

export async function walkEntries(entries: FileSystemEntry[]): Promise<Picked[]> {
  const out: Picked[] = [];
  const visit = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file, path: entry.fullPath.replace(/^\//, "") });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns results in chunks; an empty chunk means done.
      for (;;) {
        const chunk = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (chunk.length === 0) break;
        for (const child of chunk) await visit(child);
      }
    }
  };
  for (const e of entries) await visit(e);
  return out;
}
