export function downloadSVG(svgEl: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  triggerDownload(blob, filename);
}

export function downloadAI(svgEl: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: "application/postscript" });
  triggerDownload(blob, filename);
}

export async function downloadPDF(svgEl: SVGSVGElement, filename: string) {
  const { jsPDF } = await import("jspdf");
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const vb = svgEl.viewBox.baseVal;
  const wPt = vb.width  > 0 ? vb.width  : svgEl.clientWidth;
  const hPt = vb.height > 0 ? vb.height : svgEl.clientHeight;
  const pxToMm = 0.264583;
  const wMm = wPt * pxToMm;
  const hMm = hPt * pxToMm;
  const orientation = wMm > hMm ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: [wMm, hMm] });
  const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
  doc.addImage(svgDataUrl, "SVG", 0, 0, wMm, hMm);
  doc.save(filename);
}

export function downloadDXF(svgEl: SVGSVGElement, filename: string) {
  const paths = Array.from(svgEl.querySelectorAll("path, line, rect, circle, polyline, polygon"));
  const vb = svgEl.viewBox.baseVal;
  const scale = 1 / 96; // px → inch

  let entities = "";

  for (const el of paths) {
    const tag = el.tagName.toLowerCase();
    const stroke = el.getAttribute("stroke") ?? "#000000";
    const color = strokeToDXFColor(stroke);

    if (tag === "line") {
      const x1 = parseFloat(el.getAttribute("x1") ?? "0") * scale;
      const y1 = parseFloat(el.getAttribute("y1") ?? "0") * scale;
      const x2 = parseFloat(el.getAttribute("x2") ?? "0") * scale;
      const y2 = parseFloat(el.getAttribute("y2") ?? "0") * scale;
      entities += dxfLine(x1, flipY(y1, vb.height * scale), x2, flipY(y2, vb.height * scale), color);
    } else if (tag === "rect") {
      const x = parseFloat(el.getAttribute("x") ?? "0") * scale;
      const y = parseFloat(el.getAttribute("y") ?? "0") * scale;
      const w = parseFloat(el.getAttribute("width") ?? "0") * scale;
      const h = parseFloat(el.getAttribute("height") ?? "0") * scale;
      const H = vb.height * scale;
      entities += dxfLine(x, flipY(y, H), x + w, flipY(y, H), color);
      entities += dxfLine(x + w, flipY(y, H), x + w, flipY(y + h, H), color);
      entities += dxfLine(x + w, flipY(y + h, H), x, flipY(y + h, H), color);
      entities += dxfLine(x, flipY(y + h, H), x, flipY(y, H), color);
    }
  }

  const dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
  const blob = new Blob([dxf], { type: "application/dxf" });
  triggerDownload(blob, filename);
}

function flipY(y: number, totalH: number) { return totalH - y; }

function dxfLine(x1: number, y1: number, x2: number, y2: number, color: number) {
  return `0\nLINE\n8\n0\n62\n${color}\n10\n${x1.toFixed(6)}\n20\n${y1.toFixed(6)}\n30\n0.0\n11\n${x2.toFixed(6)}\n21\n${y2.toFixed(6)}\n31\n0.0\n`;
}

function strokeToDXFColor(stroke: string): number {
  if (stroke.includes("22c55e") || stroke === "green") return 3;   // green = bleed
  if (stroke.includes("ef4444") || stroke === "red")   return 1;   // red = crease
  if (stroke.includes("2563eb") || stroke === "blue")  return 5;   // blue = trim
  return 7; // white/black
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
