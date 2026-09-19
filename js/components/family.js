import { renderCategoryIcon, renderLocationLinks, renderProvenDates } from "./card.js";
import { renderReferenceList } from "./referenceLink.js";

/**
 * Renders the Family index: one card per prophet who has recorded family
 * members, showing name, era, and how many are recorded. Clicking a card
 * opens that prophet's full family detail.
 * @param {HTMLElement} container
 * @param {object[]} entries - full entry list, filtered internally
 * @param {(entry: object) => void} onSelect
 */
export function renderFamilyIndex(container, entries, onSelect) {
  container.innerHTML = "";

  const caption = document.createElement("p");
  caption.className = "family-caption";
  caption.textContent =
    "Wives, children, and other close family, each with a note on how solidly the name is sourced. Select a prophet to see their family diagram in full, with references.";
  container.appendChild(caption);

  const grid = document.createElement("div");
  grid.className = "family-index-grid";

  const withFamily = entries.filter((e) => e.family?.length);
  for (const entry of withFamily) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "family-index-card";
    card.addEventListener("click", () => onSelect(entry));

    const title = document.createElement("h3");
    title.textContent = entry.name;
    card.appendChild(title);

    const era = document.createElement("p");
    era.className = "family-index-era";
    const icon = renderCategoryIcon(entry);
    if (icon) era.appendChild(icon);
    era.appendChild(document.createTextNode(entry.era));
    card.appendChild(era);

    const count = document.createElement("p");
    count.className = "family-index-count";
    count.textContent = `${entry.family.length} family member${entry.family.length === 1 ? "" : "s"} recorded`;
    card.appendChild(count);

    grid.appendChild(card);
  }

  container.appendChild(grid);
}

/**
 * Renders the Family detail view for a single prophet: a back link, a
 * header, the prophet's own lineage/summary/references, and a graphical
 * family diagram, a root card connected by a trunk line to a grid of
 * family member cards, each with room for real, clickable references.
 * @param {HTMLElement} container
 * @param {object} entry
 * @param {() => void} onBack
 * @param {object} [options]
 * @param {{view: string, label: string}[]} [options.locations] - other
 *   views this entry can also be found in, for the "Also in" cross-links
 * @param {(view: string) => void} [options.onNavigate]
 */
export function renderFamilyDetail(container, entry, onBack, options = {}) {
  const { locations = [], onNavigate } = options;
  container.innerHTML = "";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "family-back";
  back.textContent = "‹ All families";
  back.addEventListener("click", onBack);
  container.appendChild(back);

  if (entry.lineage) {
    const lineage = document.createElement("p");
    lineage.className = "lineage-note";
    lineage.textContent = entry.lineage;
    container.appendChild(lineage);
  }

  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = entry.summary;
  container.appendChild(summary);

  if (entry.provenDates?.length) {
    const label = document.createElement("h4");
    label.className = "section-label";
    label.textContent = "Text-Attested Dates";
    container.appendChild(label);
    container.appendChild(renderProvenDates(entry.provenDates));
  }

  if (locations.length && onNavigate) {
    container.appendChild(renderLocationLinks(locations, onNavigate));
  }

  container.appendChild(buildDiagram(entry));

  if (entry.references?.length) {
    const label = document.createElement("h4");
    label.className = "section-label";
    label.textContent = `References for ${entry.name}`;
    container.appendChild(label);
    container.appendChild(renderReferenceList(entry.references));
  }
}

function buildDiagram(entry) {
  const diagram = document.createElement("div");
  diagram.className = "family-diagram";

  const root = document.createElement("div");
  root.className = "family-diagram-root";

  const rootName = document.createElement("p");
  rootName.className = "family-diagram-root-name";
  rootName.textContent = entry.name;
  root.appendChild(rootName);

  const rootEra = document.createElement("p");
  rootEra.className = "family-diagram-root-era";
  const icon = renderCategoryIcon(entry);
  if (icon) rootEra.appendChild(icon);
  rootEra.appendChild(document.createTextNode(entry.era));
  root.appendChild(rootEra);

  diagram.appendChild(root);

  const trunk = document.createElement("div");
  trunk.className = "family-diagram-trunk";
  diagram.appendChild(trunk);

  const branches = document.createElement("div");
  branches.className = "family-diagram-branches";

  for (const member of entry.family) {
    branches.appendChild(buildMemberCard(member));
  }

  diagram.appendChild(branches);
  return diagram;
}

function buildMemberCard(member) {
  const card = document.createElement("div");
  card.className = "family-diagram-card";

  const role = document.createElement("p");
  role.className = "family-diagram-role";
  role.textContent = member.role;
  card.appendChild(role);

  const name = document.createElement("p");
  name.className = "family-diagram-name";
  name.textContent = member.name;
  card.appendChild(name);

  if (member.note) {
    const note = document.createElement("p");
    note.className = "family-diagram-note";
    note.textContent = member.note;
    card.appendChild(note);
  }

  if (member.references?.length) {
    card.appendChild(renderReferenceList(member.references));
  }

  return card;
}
