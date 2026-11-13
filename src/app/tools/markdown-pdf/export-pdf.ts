// Paginate before rasterizing: each canvas is only one paper page tall.
export async function exportPdf(element: HTMLElement, format: "a4" | "letter", onProgress: (page: number, total: number) => void) {
  const [{ default: html2pdf }, { default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2pdf.js"), import("html2canvas"), import("jspdf"),
  ]);
  const options = {
    margin: 15,
    enableLinks: false,
    jsPDF: { unit: "mm" as const, format, orientation: "portrait" as const },
    pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "img", ".katex-display", ".md-diagram"] },
  };
  const worker = html2pdf().set(options).from(element).toContainer();
  let overlay: HTMLElement | undefined;
  try {
    const container: HTMLElement = await worker.get("container");
    overlay = await worker.get("overlay");
    const size: { inner: { width: number; height: number; px: { height: number } } } = await worker.get("pageSize");
    const pageHeight = size.inner.px.height;
    const bounds = container.getBoundingClientRect();
    const total = Math.max(1, Math.ceil(container.scrollHeight / pageHeight));
    const pdf = new jsPDF(options.jsPDF);
    for (let page = 0; page < total; page++) {
      onProgress(page + 1, total);
      // Yield between pages so status updates remain visible on large exports.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(container, {
        scale: 2, backgroundColor: "#ffffff", useCORS: false, logging: false,
        width: bounds.width, height: pageHeight, y: page * pageHeight,
      });
      try {
        if (page > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 15, 15, size.inner.width, size.inner.height);
      } finally {
        // Release the backing bitmap before allocating the next page.
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    // Keep links usable even though the page content is rasterized.
    const scaleX = size.inner.width / bounds.width;
    const scaleY = size.inner.height / pageHeight;
    for (const link of container.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href")!;
      let destination: { url: string } | { pageNumber: number; top: number };
      if (href.startsWith("#")) {
        const target = container.querySelector(`[id="${CSS.escape(href.slice(1))}"]`);
        if (!target) continue;
        const top = target.getBoundingClientRect().top - bounds.top;
        destination = { pageNumber: Math.floor(top / pageHeight) + 1, top: 15 + (top % pageHeight) * scaleY };
      } else {
        destination = { url: (link as HTMLAnchorElement).href };
      }
      for (const rect of link.getClientRects()) {
        const top = rect.top - bounds.top;
        const page = Math.floor(top / pageHeight);
        if (page < 0 || page >= total) continue;
        pdf.setPage(page + 1);
        pdf.link(15 + (rect.left - bounds.left) * scaleX, 15 + (top % pageHeight) * scaleY, rect.width * scaleX, rect.height * scaleY, destination);
      }
    }
    return pdf.output("blob");
  } finally {
    overlay?.remove();
  }
}
