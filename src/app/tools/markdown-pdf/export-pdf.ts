import { measurePagination } from "./pagination";

// Paginate before rasterizing: each canvas is only one paper page tall.
export async function exportPdf(element: HTMLElement, format: "a4" | "letter", onProgress: (page: number, total: number) => void) {
  const [{ default: html2pdf }, { default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2pdf.js"), import("html2canvas"), import("jspdf"),
  ]);
  const options = {
    margin: 15,
    enableLinks: false,
    jsPDF: { unit: "mm" as const, format, orientation: "portrait" as const },
    // Use measured boundaries, not spacer divs inserted inside document blocks.
    pagebreak: { mode: [] },
  };
  const worker = html2pdf().set(options).from(element).toContainer();
  let overlay: HTMLElement | undefined;
  // FontMetrics uses the live document, not html2canvas's cloned document.
  // Restore inline layout specifically for its hidden 1px measurement image.
  const metricStyle = document.createElement("style");
  metricStyle.textContent = 'body > div[style*="visibility: hidden"] > img { display: inline-block; }';
  document.head.append(metricStyle);
  try {
    const container: HTMLElement = await worker.get("container");
    overlay = await worker.get("overlay");
    const size: { inner: { width: number; height: number; px: { height: number } } } = await worker.get("pageSize");
    const pageHeight = size.inner.px.height;
    const bounds = container.getBoundingClientRect();
    await document.fonts.ready;
    await Promise.all(Array.from(container.querySelectorAll("img"), image => image.decode()));
    const pages = measurePagination(container, pageHeight);
    const total = pages.length;
    const pdf = new jsPDF(options.jsPDF);
    for (let page = 0; page < total; page++) {
      onProgress(page + 1, total);
      // Yield between pages so status updates remain visible on large exports.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(container, {
        scale: 2, backgroundColor: "#ffffff", useCORS: false, logging: false,
        width: bounds.width, height: Math.max(1, pages[page].bottom - pages[page].top), y: pages[page].top,
      });
      try {
        if (page > 0) pdf.addPage();
        const renderedHeight = Math.max(1, pages[page].bottom - pages[page].top);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 15, 15, size.inner.width, renderedHeight * size.inner.height / pageHeight);
      } finally {
        // Release the backing bitmap before allocating the next page.
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    // Keep links usable even though the page content is rasterized.
    const scaleX = size.inner.width / bounds.width;
    const scaleY = size.inner.height / pageHeight;
    const pageAt = (top: number) => pages.findIndex(page => top >= page.top && top < page.bottom);
    for (const link of container.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href")!;
      let destination: { url: string } | { pageNumber: number; top: number };
      if (href.startsWith("#")) {
        const target = container.querySelector(`[id="${CSS.escape(href.slice(1))}"]`);
        if (!target) continue;
        const top = target.getBoundingClientRect().top - bounds.top;
        const targetPage = pageAt(top);
        if (targetPage < 0) continue;
        destination = { pageNumber: targetPage + 1, top: 15 + (top - pages[targetPage].top) * scaleY };
      } else {
        destination = { url: (link as HTMLAnchorElement).href };
      }
      for (const rect of link.getClientRects()) {
        const top = rect.top - bounds.top;
        const page = pageAt(top);
        if (page < 0 || page >= total) continue;
        pdf.setPage(page + 1);
        pdf.link(15 + (rect.left - bounds.left) * scaleX, 15 + (top - pages[page].top) * scaleY, rect.width * scaleX, rect.height * scaleY, destination);
      }
    }
    return pdf.output("blob");
  } finally {
    overlay?.remove();
    metricStyle.remove();
  }
}
