export type KeepTogether = { top: number; bottom: number };
export type PageSlice = { top: number; bottom: number };

/** Choose boundaries in the original layout without inserting spacer elements. */
export function paginate(height: number, pageHeight: number, regions: KeepTogether[]): PageSlice[] {
  if (!Number.isFinite(height) || height < 0 || !Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new Error("Invalid page dimensions.");
  }
  const protectedRegions = regions.filter(region => region.bottom > region.top && region.bottom - region.top <= pageHeight);
  const pages: PageSlice[] = [];
  let top = 0;
  while (top < height) {
    let bottom = Math.min(top + pageHeight, height);
    if (bottom < height) {
      // A block can overlap several line boxes, so repeat until the cut is safe.
      let previous;
      do {
        previous = bottom;
        for (const region of protectedRegions) {
          if (region.top > top && region.top < bottom && region.bottom > bottom) {
            bottom = region.top;
          }
        }
      } while (bottom < previous);
    }
    pages.push({ top, bottom });
    top = bottom;
  }
  return pages.length ? pages : [{ top: 0, bottom: 0 }];
}

export function measurePagination(element: HTMLElement, pageHeight: number): PageSlice[] {
  const origin = element.getBoundingClientRect().top;
  const regions: KeepTogether[] = [];
  const protect = (top: number, bottom: number) => {
    // A little breathing room also keeps antialiased glyph edges off the cut.
    regions.push({ top: Math.max(0, Math.floor(top - origin - 2)), bottom: Math.ceil(bottom - origin + 2) });
  };
  for (const block of element.querySelectorAll("p, blockquote, pre, li, tr, img, h1, h2, h3, h4, h5, h6, .katex-display, .md-diagram")) {
    const rect = block.getBoundingClientRect();
    protect(rect.top, rect.bottom);
    if (/^H[1-6]$/.test(block.tagName) && block.nextElementSibling) {
      const next = block.nextElementSibling;
      const range = document.createRange();
      range.selectNodeContents(next);
      const first = Array.from(range.getClientRects()).find(r => r.height > 0);
      if (first) protect(rect.top, first.bottom);
    }
  }
  // Oversized paragraphs, quotes, code blocks and table rows may span pages,
  // but each rendered text line remains intact, including inline formatting.
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    if (!walker.currentNode.textContent?.trim()) continue;
    range.selectNodeContents(walker.currentNode);
    for (const rect of range.getClientRects()) {
      if (rect.width && rect.height) protect(rect.top, rect.bottom);
    }
  }
  return paginate(Math.ceil(element.getBoundingClientRect().height), pageHeight, regions);
}
