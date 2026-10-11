export interface PageText {
  page: number;
  text: string;
}

export interface Chunk {
  page: number;
  content: string;
}

// Split page text into overlapping chunks of approx target size
export function splitIntoChunks(
  pages: PageText[],
  chunkSize = 800,
  overlap = 100
): Chunk[] {
  const chunks: Chunk[] = [];
  const minStep = Math.max(1, chunkSize - overlap);

  for (const { page, text } of pages) {
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (!cleaned) continue;

    if (cleaned.length <= chunkSize) {
      chunks.push({ page, content: cleaned });
      continue;
    }

    let start = 0;
    while (start < cleaned.length) {
      let end = Math.min(start + chunkSize, cleaned.length);

      // Snap to last whitespace or newline if possible
      if (end < cleaned.length) {
        const lastSpace = cleaned.lastIndexOf(' ', end);
        const lastNewline = cleaned.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastSpace, lastNewline);
        if (breakPoint > start + minStep / 2) {
          end = breakPoint;
        }
      }

      const slice = cleaned.slice(start, end).trim();
      if (slice) {
        chunks.push({ page, content: slice });
      }

      if (end >= cleaned.length) break;
      start = Math.max(start + 1, end - overlap);
    }
  }

  return chunks;
}
