// Minimal RFC 4180 CSV reader for spreadsheet exports: commas, double-quoted
// cells (with "" for a quote), line breaks inside quotes, CRLF or LF rows, and
// a leading UTF-8 byte order mark. Cells are returned as raw strings.

export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        cell += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") endCell();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (input[i + 1] === "\n") i += 1;
      endRow();
    } else cell += ch;
    i += 1;
  }
  // A final line without a trailing newline still counts; an empty input or a
  // trailing newline adds no extra empty row.
  if (cell !== "" || row.length > 0 || quoted) endRow();
  return rows;
}
