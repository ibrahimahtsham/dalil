import { PanZoom } from "../lib/panzoom.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;
const H_GAP = 110;
const V_GAP = 110;
const MARGIN_TOP = 60;
const LANE_MARGIN = 90;
const LANE_GAP = 46;

/**
 * Renders the SVG family tree into the given container and wires up
 * pan/zoom and node selection.
 * @param {HTMLElement} container - element with #tree-svg, #tree-viewport, etc inside
 * @param {object[]} entries - flat list of prophet entries
 * @param {(entry: object) => void} onSelect - called when a node is clicked, opens the detail panel
 * @param {(entry: object) => void} onOpenFamily - called when a node's family badge is clicked, opens the Family view
 */
export function renderTree(container, entries, onSelect, onOpenFamily) {
  const svg = container.querySelector("#tree-svg");
  const linksGroup = container.querySelector("#tree-links");
  const nodesGroup = container.querySelector("#tree-nodes");
  const viewport = container.querySelector("#tree-viewport");

  linksGroup.innerHTML = "";
  nodesGroup.innerHTML = "";

  const byId = new Map(entries.map((e) => [e.id, e]));
  const positions = computePositions(entries);
  const routes = computeLinkRoutes(entries, positions);
  const noteTooltip = createNoteTooltip(container);
  const dateTooltip = createDateTooltip(container);

  // Draw links first so they sit behind nodes. A link that skips more than
  // one generation row (this data's lineage often does: Isa's line back to
  // Ishaq spans nine rows) is routed out to a dedicated lane, left or right
  // of the tree, rather than drawn straight through the rows in between.
  // See computeLinkRoutes for why that's enough to guarantee it never
  // visually crosses a node, or another link, it has nothing to do with.
  for (const edge of routes.direct) {
    linksGroup.appendChild(buildDirectLink(edge.from, edge.to));
  }
  for (const edge of routes.skip) {
    linksGroup.appendChild(buildSkipLink(edge));
  }

  for (const entry of entries) {
    const pos = positions.get(entry.id);
    if (!pos) continue;
    const node = buildNode(entry, pos, onSelect, onOpenFamily, noteTooltip, dateTooltip);
    node.querySelector(".tree-node-visual").style.animationDelay = `${(entry.generation ?? 0) * 80}ms`;
    nodesGroup.appendChild(node);
  }

  const bounds = computeBounds(positions, routes);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  const panzoom = new PanZoom(svg, viewport, { minScale: 0.3, maxScale: 2.5 });

  // On a phone-width screen there usually isn't room to show even one row
  // at a readable size while also seeing the tree's overall shape, and
  // panning to find your way around a 25-node genealogy sight unseen is
  // a bad first impression. So there, start zoomed out enough to fit the
  // whole tree, at whatever scale that takes (clamped to what the
  // controls allow); on a wider screen this only ever reduces scale below
  // 1, so desktop's fixed "start at 1, top-aligned" behavior is untouched.
  const isMobileViewport = () => window.matchMedia("(max-width: 640px)").matches;

  const center = () => {
    const containerRect = container.getBoundingClientRect();

    if (isMobileViewport() && bounds.width > 0 && bounds.height > 0) {
      const fitScale = Math.min(
        (containerRect.width - 24) / bounds.width,
        (containerRect.height - 24) / bounds.height
      );
      panzoom.scale = Math.min(1, Math.max(panzoom.minScale, Math.min(panzoom.maxScale, fitScale)));
      panzoom.x = (containerRect.width - bounds.width * panzoom.scale) / 2 - bounds.minX * panzoom.scale;
      panzoom.y = (containerRect.height - bounds.height * panzoom.scale) / 2 - bounds.minY * panzoom.scale;
      panzoom._applyTransform();
      return;
    }

    panzoom.x = Math.max(0, (containerRect.width - bounds.width) / 2) - bounds.minX;
    panzoom.y = 30;
    panzoom._applyTransform();
  };

  // Pan (without changing zoom) so a specific node is centered in the
  // visible container, used by cross-links from other views (e.g. "View
  // in Tree" from the detail panel) so the node is actually on screen
  // when it's selected, not just highlighted somewhere off-canvas.
  const centerOnNode = (id) => {
    const pos = positions.get(id);
    if (!pos) return;
    const containerRect = container.getBoundingClientRect();
    const nodeCenterX = pos.x + NODE_WIDTH / 2;
    const nodeCenterY = pos.y + NODE_HEIGHT / 2;
    panzoom.x = containerRect.width / 2 - nodeCenterX * panzoom.scale;
    panzoom.y = containerRect.height / 2 - nodeCenterY * panzoom.scale;
    panzoom._applyTransform();
  };

  // Center the tree horizontally within the visible container on load.
  center();

  return { panzoom, byId, center, centerOnNode };
}

function computePositions(entries) {
  const generations = new Map();
  for (const entry of entries) {
    const gen = entry.generation ?? 0;
    if (!generations.has(gen)) generations.set(gen, []);
    generations.get(gen).push(entry);
  }

  // Generations must be laid out in ascending order so that, by the time a
  // row is positioned, every earlier row (including any parent a node in
  // this row points back to, however many generations up) already has a
  // final x. Some lineages in this data skip several generations between a
  // recorded parent and child (e.g. Isa's line back to Ishaq), so "parent"
  // here means the actual recorded parent, not just the row above.
  const sortedGens = [...generations.keys()].sort((a, b) => a - b);

  const positions = new Map();
  for (const gen of sortedGens) {
    const nodesInGen = generations.get(gen);

    // Order this row so a node with a recorded parent sits beneath (i.e.
    // in the same left-to-right position as) that parent, rather than in
    // whatever order the data happened to list siblings. This keeps a
    // lineage's line running roughly straight down instead of crossing
    // other lineages' lines. Nodes with no recorded parent in this tree
    // (no established descent) carry no line to align to, so they keep
    // their original relative order and sort after any anchored siblings.
    const anchored = [];
    const unanchored = [];
    for (const entry of nodesInGen) {
      const parentPos = positions.get(entry.parents?.[0]);
      if (parentPos) anchored.push({ entry, anchorX: parentPos.x });
      else unanchored.push({ entry });
    }
    anchored.sort((a, b) => a.anchorX - b.anchorX);
    const ordered = [...anchored.map((n) => n.entry), ...unanchored.map((n) => n.entry)];

    const totalWidth = ordered.length * NODE_WIDTH + (ordered.length - 1) * H_GAP;
    const startX = -totalWidth / 2;
    ordered.forEach((entry, i) => {
      const x = startX + i * (NODE_WIDTH + H_GAP);
      const y = MARGIN_TOP + gen * (NODE_HEIGHT + V_GAP);
      positions.set(entry.id, { x, y, entry });
    });
  }
  return positions;
}

function computeBounds(positions, routes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { x, y } of positions.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + NODE_WIDTH);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + NODE_HEIGHT);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
    minY = 0;
    maxY = 0;
  }
  if (routes?.rightLaneCount) {
    maxX = Math.max(maxX, maxX + LANE_MARGIN + (routes.rightLaneCount - 1) * LANE_GAP + LANE_MARGIN);
  }
  if (routes?.leftLaneCount) {
    minX = Math.min(minX, minX - LANE_MARGIN - (routes.leftLaneCount - 1) * LANE_GAP - LANE_MARGIN);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Splits every recorded parent-child edge into "direct" (child is exactly
 * one generation row below the parent) and "skip" (several rows below,
 * which this lineage data does often: Isa's line back to Ishaq spans nine
 * rows). Skip edges are routed through side lanes, left or right of the
 * whole tree, rather than straight through the rows they pass over.
 *
 * Two things have to be true for that to actually guarantee no crossings:
 *  1. A skip edge exits toward whichever side of its own row its source
 *     node already sits on, so its exit sweep moves away from any siblings
 *     in that row instead of past them.
 *  2. Two skip edges whose row ranges genuinely interleave (partially
 *     overlap without either containing the other) can never share a
 *     side: an edge's entry/exit sweep always has to cross every lane
 *     between its own and the tree, so two interleaving edges on the same
 *     side are guaranteed to cross no matter which lanes they get. Edges
 *     that are nested or disjoint in row range don't have this problem and
 *     can safely share a side, packed into lanes by a standard greedy
 *     interval-scheduling pass (reuse the first lane whose previous edge's
 *     row range has already ended).
 */
function computeLinkRoutes(entries, positions) {
  const direct = [];
  const skip = [];

  for (const entry of entries) {
    const from = positions.get(entry.id);
    for (const childId of entry.children ?? []) {
      const to = positions.get(childId);
      if (!from || !to) continue;
      const startRow = entry.generation ?? 0;
      const endRow = to.entry.generation ?? 0;
      if (endRow - startRow > 1) {
        const fromCenterX = from.x + NODE_WIDTH / 2;
        skip.push({ from, to, startRow, endRow, side: fromCenterX < 0 ? "left" : "right" });
      } else {
        direct.push({ from, to });
      }
    }
  }

  const interleaves = (a, b) =>
    (a.startRow < b.startRow && b.startRow < a.endRow && a.endRow < b.endRow) ||
    (b.startRow < a.startRow && a.startRow < b.endRow && b.endRow < a.endRow);

  // When two edges on the same side interleave, flip whichever of the two
  // spans more rows: a wider edge has more room in its own row range to
  // still avoid a fresh conflict on the other side, where a narrower edge
  // moved the same way is more likely to land in the path of something
  // else (a direct edge included) it now shares a row range with.
  for (let i = 0; i < skip.length; i++) {
    for (let j = 0; j < i; j++) {
      if (skip[i].side === skip[j].side && interleaves(skip[i], skip[j])) {
        const spanI = skip[i].endRow - skip[i].startRow;
        const spanJ = skip[j].endRow - skip[j].startRow;
        const target = spanI >= spanJ ? skip[i] : skip[j];
        target.side = target.side === "left" ? "right" : "left";
      }
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  for (const { x } of positions.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + NODE_WIDTH);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
  }

  // Pack narrowest spans first, so a short edge nested inside a longer
  // one's row range claims a low (near) lane before the longer edge is
  // even considered, leaving the longer edge to fall through to a higher
  // (farther) lane. That ordering is what keeps a wide edge's own entry
  // and exit sweeps from having to cross a narrower edge nested inside its
  // row range: the narrow edge is always closer to the tree than anything
  // whose range contains it. A lane is only reused when the new edge's row
  // range is disjoint from every edge already holding that lane, not just
  // the most recently added one, since processing narrowest-first means a
  // lane's edges are no longer added in row order.
  const disjoint = (a, b) => a.endRow <= b.startRow || b.endRow <= a.startRow;

  let leftLaneCount = 0;
  let rightLaneCount = 0;
  for (const side of ["left", "right"]) {
    const sideEdges = skip
      .filter((e) => e.side === side)
      .sort((a, b) => a.endRow - a.startRow - (b.endRow - b.startRow) || a.startRow - b.startRow);
    const lanes = [];
    for (const edge of sideEdges) {
      let lane = lanes.findIndex((laneEdges) => laneEdges.every((e) => disjoint(e, edge)));
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push(edge);
      edge.lane = lane;
      edge.laneX = side === "right" ? maxX + LANE_MARGIN + lane * LANE_GAP : minX - LANE_MARGIN - lane * LANE_GAP;
    }
    if (side === "left") leftLaneCount = lanes.length;
    else rightLaneCount = lanes.length;
  }

  return { direct, skip, leftLaneCount, rightLaneCount };
}

function buildDirectLink(from, to) {
  const fromX = from.x + NODE_WIDTH / 2;
  const fromY = from.y + NODE_HEIGHT;
  const toX = to.x + NODE_WIDTH / 2;
  const toY = to.y;
  const midY = (fromY + toY) / 2;

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", "tree-link");
  path.setAttribute(
    "d",
    `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`
  );
  return path;
}

/**
 * A skip link drops straight down from the parent, same as a direct link,
 * but as soon as it clears the parent's row it turns out to its reserved
 * lane, travels down that lane, then turns back in to enter the child from
 * directly above. The two horizontal turns both happen inside the empty
 * gap between rows, never across a row itself, so this can never cross a
 * node in a row it has nothing to do with, no matter where that node
 * sits, including one in the very row it exits or enters from.
 */
function buildSkipLink(edge) {
  const { from, to, laneX: x } = edge;
  const fromX = from.x + NODE_WIDTH / 2;
  const fromY = from.y + NODE_HEIGHT;
  const toX = to.x + NODE_WIDTH / 2;
  const toY = to.y;
  const gapExitY = fromY + V_GAP * 0.4;
  const gapEnterY = toY - V_GAP * 0.4;

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", "tree-link tree-link-skip");
  path.setAttribute(
    "d",
    `M ${fromX} ${fromY} L ${fromX} ${gapExitY} L ${x} ${gapExitY} L ${x} ${gapEnterY} L ${toX} ${gapEnterY} L ${toX} ${toY}`
  );
  return path;
}

function buildNode(entry, pos, onSelect, onOpenFamily, noteTooltip, dateTooltip) {
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "tree-node");
  group.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
  group.setAttribute("data-id", entry.id);
  group.setAttribute("tabindex", "0");
  group.setAttribute("role", "button");
  group.setAttribute("aria-label", entry.name);

  // Positioning lives on `group` via the transform attribute above; the
  // entrance animation and hover lift live on this nested wrapper instead,
  // since a CSS transform on the same element would replace that attribute
  // outright instead of composing with it.
  const visual = document.createElementNS(SVG_NS, "g");
  visual.setAttribute("class", "tree-node-visual");
  group.appendChild(visual);

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("width", NODE_WIDTH);
  rect.setAttribute("height", NODE_HEIGHT);
  rect.setAttribute("rx", 3);
  visual.appendChild(rect);

  const name = document.createElementNS(SVG_NS, "text");
  name.setAttribute("x", NODE_WIDTH / 2);
  name.setAttribute("y", 28);
  name.setAttribute("text-anchor", "middle");
  name.textContent = entry.name;
  visual.appendChild(name);

  const era = document.createElementNS(SVG_NS, "text");
  era.setAttribute("class", "tree-node-era");
  era.setAttribute("x", NODE_WIDTH / 2);
  era.setAttribute("y", 46);
  era.setAttribute("text-anchor", "middle");
  era.textContent = entry.era;
  visual.appendChild(era);

  const activate = () => onSelect(entry);
  group.addEventListener("click", activate);
  group.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  });

  if (entry.family?.length) {
    visual.appendChild(buildFamilyBadge(entry, onOpenFamily));
  }

  if (entry.placementNote) {
    visual.appendChild(buildNoteBadge(entry, noteTooltip));
  }

  if (entry.provenDates?.length) {
    visual.appendChild(buildDateBadge(entry, dateTooltip));
  }

  return group;
}

/**
 * Small badge on a prophet's node indicating recorded family. Rather than
 * cramming wives, children, and their references into the tiny space this
 * SVG node allows, clicking it opens the full-width Family view for that
 * prophet, where every reference has room to render as a real link.
 */
function buildFamilyBadge(entry, onOpenFamily) {
  const cx = NODE_WIDTH - 15;
  const cy = NODE_HEIGHT - 15;

  const badge = document.createElementNS(SVG_NS, "g");
  badge.setAttribute("class", "tree-family-badge");
  badge.setAttribute("role", "button");
  badge.setAttribute("tabindex", "0");
  badge.setAttribute("aria-label", `View ${entry.name}'s family`);

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", 9);
  badge.appendChild(circle);

  const horizontal = document.createElementNS(SVG_NS, "line");
  horizontal.setAttribute("x1", cx - 4);
  horizontal.setAttribute("y1", cy);
  horizontal.setAttribute("x2", cx + 4);
  horizontal.setAttribute("y2", cy);
  badge.appendChild(horizontal);

  const vertical = document.createElementNS(SVG_NS, "line");
  vertical.setAttribute("x1", cx);
  vertical.setAttribute("y1", cy - 4);
  vertical.setAttribute("x2", cx);
  vertical.setAttribute("y2", cy + 4);
  badge.appendChild(vertical);

  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = `View family (${entry.family.length})`;
  badge.appendChild(title);

  const activate = (e) => {
    e.stopPropagation();
    onOpenFamily(entry);
  };
  badge.addEventListener("click", activate);
  badge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(e);
    }
  });

  return badge;
}

/**
 * Small "i" badge on a node whose row placement in this tree needed real
 * reasoning to justify (a chronology drawn from a specific verse, or a tied
 * row where the text doesn't fix an order), not just "next chronological
 * entry." Opens a short floating note in place, right on the tree, rather
 * than sending the person to the detail panel for something this specific.
 * Positioned opposite the family badge (top-left, not bottom-right) so the
 * two never collide on a node that has both.
 */
function buildNoteBadge(entry, noteTooltip) {
  const cx = 15;
  const cy = 15;

  const badge = document.createElementNS(SVG_NS, "g");
  badge.setAttribute("class", "tree-note-badge");
  badge.setAttribute("role", "button");
  badge.setAttribute("tabindex", "0");
  badge.setAttribute("aria-label", `Why ${entry.name} is placed here`);

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", 9);
  badge.appendChild(circle);

  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("cx", cx);
  dot.setAttribute("cy", cy - 3.5);
  dot.setAttribute("r", 0.75);
  dot.setAttribute("fill", "currentColor");
  dot.setAttribute("stroke", "none");
  badge.appendChild(dot);

  const stem = document.createElementNS(SVG_NS, "line");
  stem.setAttribute("x1", cx);
  stem.setAttribute("y1", cy - 1);
  stem.setAttribute("x2", cx);
  stem.setAttribute("y2", cy + 4);
  badge.appendChild(stem);

  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = `Why ${entry.name} is placed here`;
  badge.appendChild(title);

  const activate = (e) => {
    e.stopPropagation();
    noteTooltip.toggle(badge, entry.placementNote);
  };
  badge.addEventListener("click", activate);
  badge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(e);
    }
  });

  return badge;
}

/**
 * A single floating tooltip element, reused for every note badge in the
 * tree (only one can be open at a time), positioned from the clicked
 * badge's actual screen position so it works correctly under the tree's
 * own pan and zoom.
 */
function createNoteTooltip(container) {
  const el = document.createElement("div");
  el.className = "tree-note-tooltip";
  el.hidden = true;
  container.appendChild(el);

  let openBadge = null;

  function hide() {
    el.hidden = true;
    openBadge = null;
  }

  function show(badge, note) {
    el.innerHTML = "";

    const text = document.createElement("p");
    text.className = "tree-note-tooltip-text";
    text.textContent = note.text;
    el.appendChild(text);

    for (const ref of note.references ?? []) {
      const link = document.createElement("a");
      link.className = "tree-note-tooltip-ref";
      link.href = ref.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = ref.label;
      el.appendChild(link);
    }

    el.hidden = false;
    openBadge = badge;

    const badgeRect = badge.getBoundingClientRect();
    const tooltipRect = el.getBoundingClientRect();
    let left = badgeRect.left;
    let top = badgeRect.bottom + 8;
    left = Math.min(left, window.innerWidth - tooltipRect.width - 12);
    left = Math.max(left, 12);
    if (top + tooltipRect.height > window.innerHeight - 12) {
      top = badgeRect.top - tooltipRect.height - 8;
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  function toggle(badge, note) {
    if (openBadge === badge) hide();
    else show(badge, note);
  }

  document.addEventListener("click", (e) => {
    if (!el.hidden && !el.contains(e.target)) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });

  return { toggle, hide };
}

/**
 * Small clock-face badge on a node whose entry has at least one
 * `provenDates` fact (a number a Quran verse or hadith states outright,
 * like Nuh's 950 years), distinct from the note badge: this is about a
 * specific text-stated duration or age, not why the row placement is
 * what it is. Positioned top-right, the one corner the family (bottom-
 * right) and note (top-left) badges don't use.
 */
function buildDateBadge(entry, dateTooltip) {
  const cx = NODE_WIDTH - 15;
  const cy = 15;

  const badge = document.createElementNS(SVG_NS, "g");
  badge.setAttribute("class", "tree-date-badge");
  badge.setAttribute("role", "button");
  badge.setAttribute("tabindex", "0");
  badge.setAttribute("aria-label", `Text-attested dates for ${entry.name}`);

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", 9);
  badge.appendChild(circle);

  const hourHand = document.createElementNS(SVG_NS, "line");
  hourHand.setAttribute("x1", cx);
  hourHand.setAttribute("y1", cy);
  hourHand.setAttribute("x2", cx);
  hourHand.setAttribute("y2", cy - 4.5);
  badge.appendChild(hourHand);

  const minuteHand = document.createElementNS(SVG_NS, "line");
  minuteHand.setAttribute("x1", cx);
  minuteHand.setAttribute("y1", cy);
  minuteHand.setAttribute("x2", cx + 3.5);
  minuteHand.setAttribute("y2", cy);
  badge.appendChild(minuteHand);

  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = `Text-attested dates for ${entry.name}`;
  badge.appendChild(title);

  const activate = (e) => {
    e.stopPropagation();
    dateTooltip.toggle(badge, entry.provenDates);
  };
  badge.addEventListener("click", activate);
  badge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(e);
    }
  });

  return badge;
}

/**
 * A single floating tooltip element, reused for every date badge in the
 * tree, listing each `provenDates` item (label plus its own reference
 * links) for that node. Mirrors createNoteTooltip's positioning logic,
 * kept separate since the two show differently-shaped data (one note vs
 * a list of dated facts) and can never both be open at once.
 */
function createDateTooltip(container) {
  const el = document.createElement("div");
  el.className = "tree-note-tooltip";
  el.hidden = true;
  container.appendChild(el);

  let openBadge = null;

  function hide() {
    el.hidden = true;
    openBadge = null;
  }

  function show(badge, provenDates) {
    el.innerHTML = "";

    for (const { label, references } of provenDates) {
      const text = document.createElement("p");
      text.className = "tree-note-tooltip-text";
      text.textContent = label;
      el.appendChild(text);

      for (const ref of references ?? []) {
        const link = document.createElement("a");
        link.className = "tree-note-tooltip-ref";
        link.href = ref.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = ref.label;
        el.appendChild(link);
      }
    }

    el.hidden = false;
    openBadge = badge;

    const badgeRect = badge.getBoundingClientRect();
    const tooltipRect = el.getBoundingClientRect();
    let left = badgeRect.left;
    let top = badgeRect.bottom + 8;
    left = Math.min(left, window.innerWidth - tooltipRect.width - 12);
    left = Math.max(left, 12);
    if (top + tooltipRect.height > window.innerHeight - 12) {
      top = badgeRect.top - tooltipRect.height - 8;
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  function toggle(badge, provenDates) {
    if (openBadge === badge) hide();
    else show(badge, provenDates);
  }

  document.addEventListener("click", (e) => {
    if (!el.hidden && !el.contains(e.target)) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });

  return { toggle, hide };
}

/**
 * Toggles the `.selected` class on the node matching id, clearing others.
 */
export function setSelectedNode(container, id) {
  const nodesGroup = container.querySelector("#tree-nodes");
  for (const node of nodesGroup.children) {
    node.classList.toggle("selected", node.dataset.id === id);
  }
}
