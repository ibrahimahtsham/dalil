import { renderCategoryIcon } from "./card.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// The stages of "the flowchart of human life": where every soul comes from,
// what happens across this life, and how it plays out depending on deeds.
// Every stage points at a real entry in the data, so the flowchart is a
// visual index into already-cited content rather than a new set of claims
// of its own. A "fork" stage marks the two ways the same next entry is
// reached, shown as two labeled paths that both open that entry.
const JOURNEY_STAGES = [
  { type: "node", id: "primordial-covenant" },
  {
    type: "node",
    id: "kiraman-katibin",
    annotation: "deeds-and-outcomes",
  },
  { type: "node", id: "malak-al-mawt" },
  { type: "node", id: "barzakh" },
  { type: "node", id: "trial-and-punishment-of-the-grave" },
  { type: "node", id: "trumpet" },
  { type: "node", id: "resurrection-gathering" },
  { type: "node", id: "al-mizan" },
  {
    type: "fork",
    id: "judgment-day-categories",
    left: "Record in the right hand: the Foremost and Companions of the Right",
    right: "Record in the left hand: Companions of the Left",
  },
  { type: "node", id: "wall-of-light" },
  { type: "node", id: "sirat-bridge" },
  { type: "fork", id: "jannah-jahannam", left: "Jannah", right: "Jahannam" },
];

/**
 * Every entry id that appears somewhere in the Journey flowchart, either
 * as a stage itself or as a stage's side annotation. Used elsewhere on the
 * site (the "also see this in" cross-links) to know whether "Journey" is
 * one of the views a given entry can be found in.
 */
export const JOURNEY_ENTRY_IDS = new Set(
  JOURNEY_STAGES.flatMap((stage) => [stage.id, stage.annotation]).filter(Boolean)
);

/**
 * Renders the "journey" flowchart: a single vertical sequence, forking
 * briefly at two points where the outcome depends on deeds, before
 * converging again. Every box is a pointer into a real, cited entry.
 * @param {HTMLElement} container
 * @param {object[]} entries - full entry list, looked up by id
 * @param {(entry: object) => void} onSelect - opens the detail panel
 */
export function renderJourney(container, entries, onSelect) {
  container.innerHTML = "";

  const byId = new Map(entries.map((e) => [e.id, e]));
  const track = document.createElement("div");
  track.className = "journey-track";

  let prevWasFork = false;

  JOURNEY_STAGES.forEach((stage, i) => {
    if (i > 0) {
      track.appendChild(buildConnector(prevWasFork, stage.type === "fork"));
    }

    if (stage.type === "fork") {
      track.appendChild(buildForkRow(stage, byId, onSelect));
      prevWasFork = true;
    } else {
      const entry = byId.get(stage.id);
      if (!entry) return;
      track.appendChild(buildStage(entry, onSelect, stage.annotation, byId));
      prevWasFork = false;
    }
  });

  container.appendChild(track);
}

function buildConnector(fromFork, toFork) {
  const wrap = document.createElement("div");
  wrap.className = "journey-connector";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 36");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("journey-connector-svg");

  if (fromFork && !toFork) {
    // Two paths merging back into one.
    addPath(svg, "M 20 0 L 50 36 M 80 0 L 50 36");
  } else if (!fromFork && toFork) {
    // One path splitting into two.
    addPath(svg, "M 50 0 L 20 36 M 50 0 L 80 36");
  } else {
    addPath(svg, "M 50 0 L 50 36");
  }

  wrap.appendChild(svg);
  return wrap;
}

function addPath(svg, d, className = "journey-connector-path") {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("class", className);
  svg.appendChild(path);
}

function buildStage(entry, onSelect, annotationId, byId) {
  const card = buildStageCard(entry, onSelect);
  if (!annotationId) return card;

  const annotationEntry = byId.get(annotationId);
  if (!annotationEntry) return card;

  // A side note, not a step in the sequence itself: connected by a dashed
  // line rather than the main track's solid connector, and rendered as its
  // own small card (not just a text link) so it reads as a real part of
  // the journey rather than a footnote easy to miss.
  const wrapper = document.createElement("div");
  wrapper.className = "journey-annotation-wrap";
  wrapper.appendChild(card);

  const dash = document.createElementNS(SVG_NS, "svg");
  dash.setAttribute("viewBox", "0 0 40 20");
  dash.setAttribute("preserveAspectRatio", "none");
  dash.classList.add("journey-annotation-dash");
  addPath(dash, "M 0 10 L 40 10", "journey-annotation-dash-path");
  wrapper.appendChild(dash);

  const sideCard = buildStageCard(annotationEntry, onSelect, true);
  wrapper.appendChild(sideCard);

  return wrapper;
}

function buildStageCard(entry, onSelect, small = false) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = small ? "journey-stage journey-stage-small" : "journey-stage";
  card.dataset.id = entry.id;
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(entry);
  });

  const icon = renderCategoryIcon(entry);
  if (icon) card.appendChild(icon);

  const text = document.createElement("span");
  text.className = "journey-stage-text";

  const name = document.createElement("span");
  name.className = "journey-stage-name";
  name.textContent = entry.name;
  text.appendChild(name);

  const era = document.createElement("span");
  era.className = "journey-stage-era";
  era.textContent = entry.era;
  text.appendChild(era);

  card.appendChild(text);
  return card;
}

function buildForkRow(stage, byId, onSelect) {
  const row = document.createElement("div");
  row.className = "journey-fork-row";
  row.dataset.id = stage.id;

  const entry = byId.get(stage.id);

  for (const [side, label] of [["left", stage.left], ["right", stage.right]]) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `journey-fork-option journey-fork-${side}`;
    option.textContent = label;
    option.addEventListener("click", () => entry && onSelect(entry));
    row.appendChild(option);
  }

  return row;
}
