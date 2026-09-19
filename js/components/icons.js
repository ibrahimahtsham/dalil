const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Icon definitions as {viewBox, shapes}. Shapes are drawn with currentColor
 * stroke (or fill, per shape) so icons follow the surrounding text color in
 * both themes without any extra styling. Paths are taken from or closely
 * follow the Feather icon set (MIT licensed, ISC-style permissive), chosen
 * where possible over hand-drawn paths to avoid malformed geometry.
 */
const ICONS = {
  // Quran reference marker: an open book.
  quran: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" },
      { tag: "path", d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
    ],
  },
  // Hadith reference marker: a chain link, for the isnad (chain of narration).
  hadith: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" },
      { tag: "path", d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
    ],
  },
  sun: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "circle", cx: 12, cy: 12, r: 5 },
      { tag: "line", x1: 12, y1: 1, x2: 12, y2: 3 },
      { tag: "line", x1: 12, y1: 21, x2: 12, y2: 23 },
      { tag: "line", x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 },
      { tag: "line", x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 },
      { tag: "line", x1: 1, y1: 12, x2: 3, y2: 12 },
      { tag: "line", x1: 21, y1: 12, x2: 23, y2: 12 },
      { tag: "line", x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 },
      { tag: "line", x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 },
    ],
  },
  moon: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [{ tag: "path", d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" }],
  },
  search: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "circle", cx: 11, cy: 11, r: 8 },
      { tag: "line", x1: 21, y1: 21, x2: 16.65, y2: 16.65 },
    ],
  },
  // Category icons, one per timeline entry category.
  cosmology: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M12 20h9" },
      { tag: "path", d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" },
    ],
  },
  angel: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5Z" },
      { tag: "path", d: "M16 8 2 22" },
      { tag: "path", d: "M17.5 15H9" },
    ],
  },
  jinn: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M9.59 4.59A2 2 0 1 1 11 8H2" },
      { tag: "path", d: "M12.59 11.59A2 2 0 1 1 14 15H2" },
      { tag: "path", d: "M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2" },
    ],
  },
  prophet: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "circle", cx: 12, cy: 12, r: 10 },
      { tag: "polygon", points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" },
    ],
  },
  event: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [{ tag: "path", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" }],
  },
  family: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
      { tag: "circle", cx: 9, cy: 7, r: 4 },
      { tag: "path", d: "M23 21v-2a4 4 0 0 0-3-3.87" },
      { tag: "path", d: "M16 3.13a4 4 0 0 1 0 7.75" },
    ],
  },
  endtimes: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "circle", cx: 12, cy: 12, r: 10 },
      { tag: "polyline", points: "12 6 12 12 16 14" },
    ],
  },
  duty: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" },
      { tag: "polyline", points: "22 4 12 14.01 9 11.01" },
    ],
  },
  // Belief (Aqeedah) category icon.
  belief: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      {
        tag: "path",
        d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z",
      },
    ],
  },
  // Rights & Duties (Huquq) category icon: a single person, for individual dignity.
  right: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" },
      { tag: "circle", cx: 12, cy: 7, r: 4 },
    ],
  },
  // Basic Law category icon: a balance scale.
  law: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M16 16 19 8 22 16c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" },
      { tag: "path", d: "M2 16 5 8 8 16c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" },
      { tag: "path", d: "M7 21h10" },
      { tag: "path", d: "M12 3v18" },
      { tag: "path", d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" },
    ],
  },
  // Duas and Adhkar category icon: two open, raised hands.
  dua: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M4 16c0-4.5 2-8 4-10.5" },
      { tag: "path", d: "M4 16c0 3 2 5 3.5 5" },
      { tag: "path", d: "M20 16c0-4.5-2-8-4-10.5" },
      { tag: "path", d: "M20 16c0 3-2 5-3.5 5" },
      { tag: "circle", cx: 12, cy: 4, r: 1.3 },
    ],
  },
  // Signs in creation category icon: an eye, for what the Quran asks the
  // reader to look at and reason from.
  sign: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" },
      { tag: "circle", cx: 12, cy: 12, r: 3 },
    ],
  },
  // Character category icon: a heart, for the inward disposition these
  // entries describe.
  character: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      {
        tag: "path",
        d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
      },
    ],
  },
  // Non-prophet Quranic accounts category icon (used in Tales): a scroll.
  tale: {
    viewBox: "0 0 24 24",
    stroke: true,
    shapes: [
      { tag: "path", d: "M6 3h11a2 2 0 0 1 2 2v15l-3-2-3 2-3-2-3 2V6a3 3 0 0 0-3-3Z" },
      { tag: "path", d: "M6 3a3 3 0 0 0-3 3v1h3" },
      { tag: "path", d: "M9 9h6" },
      { tag: "path", d: "M9 12h6" },
    ],
  },
};

/**
 * Builds an inline SVG icon element.
 * @param {keyof typeof ICONS} name
 * @param {{size?: number, className?: string}} [options]
 * @returns {SVGSVGElement}
 */
export function createIcon(name, options = {}) {
  const def = ICONS[name];
  if (!def) throw new Error(`Unknown icon: ${name}`);

  const size = options.size ?? 16;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", def.viewBox);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icon", `icon-${name}`);
  if (options.className) svg.classList.add(options.className);

  if (def.stroke) {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }

  for (const shape of def.shapes) {
    const el = document.createElementNS(SVG_NS, shape.tag);
    for (const [key, value] of Object.entries(shape)) {
      if (key === "tag") continue;
      el.setAttribute(key, value);
    }
    svg.appendChild(el);
  }

  return svg;
}

/** True if an icon definition exists for `name`. */
export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}
