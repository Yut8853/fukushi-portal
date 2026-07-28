import { readFile } from "node:fs/promises";

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (quoted) throw new Error("CSVの引用符が閉じられていません。");
  const [headers, ...values] = rows;
  if (!headers) return [];
  values.forEach((valuesRow, index) => {
    if (valuesRow.length !== headers.length) {
      throw new Error(`${index + 2}行目: 列数が${headers.length}ではなく${valuesRow.length}です。`);
    }
  });
  return values.map((valuesRow) =>
    Object.fromEntries(
      headers.map((header, index) => [header.trim(), (valuesRow[index] ?? "").trim()]),
    ),
  );
}

export async function readCsvFile(path: string): Promise<CsvRow[]> {
  try {
    return parseCsv((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path} を読み込めませんでした: ${message}`);
  }
}

export function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
