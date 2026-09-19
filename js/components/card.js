import { renderReferenceList } from "./referenceLink.js";
import { createIcon, hasIcon } from "./icons.js";

/**
 * Builds the inner content (lineage, summary, cross-links, family,
 * references) shared by the detail panel and the timeline cards.
 * @param {object} entry
 * @param {object} [options]
 * @param {{view: string, label: string}[]} [options.locations] - other
 *   views this same entry can be found in, for the "Also in" cross-links
 * @param {(view: string) => void} [options.onNavigate] - jumps to one of
 *   those views and reveals this entry there
 * @returns {DocumentFragment}
 */
export function renderEntryBody(entry, options = {}) {
  const { locations = [], onNavigate } = options;
  const fragment = document.createDocumentFragment();

  if (entry.lineage) {
    const lineage = document.createElement("p");
    lineage.className = "lineage-note";
    lineage.textContent = entry.lineage;
    fragment.appendChild(lineage);
  }

  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = entry.summary;
  fragment.appendChild(summary);

  if (entry.provenDates?.length) {
    fragment.appendChild(sectionLabel("Text-Attested Dates"));
    fragment.appendChild(renderProvenDates(entry.provenDates));
  }

  if (locations.length && onNavigate) {
    fragment.appendChild(renderLocationLinks(locations, onNavigate));
  }

  if (entry.family?.length) {
    fragment.appendChild(sectionLabel("Family"));
    fragment.appendChild(renderFamilyList(entry.family));
  }

  if (entry.references?.length) {
    fragment.appendChild(sectionLabel("References"));
    fragment.appendChild(renderReferenceList(entry.references));
  }

  return fragment;
}

/**
 * Small row of chip buttons pointing to every other view this same entry
 * appears in (e.g. a prophet who's in the Tree, Timeline, Family, and
 * Tales), so the site's separate views read as one connected reference
 * rather than four disconnected ones. Exported so views with their own
 * custom detail layout (Family) can drop it in too, not just the shared
 * detail panel.
 * @param {{view: string, label: string}[]} locations
 * @param {(view: string) => void} onNavigate
 */
export function renderLocationLinks(locations, onNavigate) {
  const wrap = document.createElement("div");
  wrap.className = "entry-locations";

  const label = document.createElement("span");
  label.className = "entry-locations-label";
  label.textContent = "Also in";
  wrap.appendChild(label);

  for (const { view, label: viewLabel } of locations) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "entry-location-link";
    btn.textContent = viewLabel;
    btn.addEventListener("click", () => onNavigate(view));
    wrap.appendChild(btn);
  }

  return wrap;
}

/**
 * A small "Text-Attested Dates" block: the handful of numeric durations
 * or ages the Quran or an authentic hadith states outright (Nuh's 950
 * years, the Prophet's age at death), kept deliberately separate from an
 * entry's loose `era` label, which is often just a period name or, for
 * Seerah events, an approximate historical date that isn't itself quoted
 * from a verse or hadith the way these are.
 * @param {{label: string, references: object[]}[]} provenDates
 * @returns {HTMLDivElement}
 */
export function renderProvenDates(provenDates) {
  const list = document.createElement("div");
  list.className = "proven-dates";

  for (const { label, references } of provenDates) {
    const item = document.createElement("div");
    item.className = "proven-date";

    const labelEl = document.createElement("p");
    labelEl.className = "proven-date-label";
    labelEl.textContent = label;
    item.appendChild(labelEl);

    if (references?.length) {
      item.appendChild(renderReferenceList(references));
    }

    list.appendChild(item);
  }

  return list;
}

function sectionLabel(text) {
  const heading = document.createElement("h4");
  heading.className = "section-label";
  heading.textContent = text;
  return heading;
}

/**
 * Builds the family member list (role, name, sourcing note, references)
 * shared by the detail panel and the Family view.
 * @param {object[]} family
 * @returns {HTMLDivElement}
 */
export function renderFamilyList(family) {
  const list = document.createElement("div");
  list.className = "family-list";

  for (const member of family) {
    const item = document.createElement("div");
    item.className = "family-item";

    const role = document.createElement("p");
    role.className = "family-role";
    role.textContent = member.role;
    item.appendChild(role);

    const name = document.createElement("p");
    name.className = "family-name";
    name.textContent = member.name;
    item.appendChild(name);

    if (member.note) {
      const note = document.createElement("p");
      note.className = "family-note";
      note.textContent = member.note;
      item.appendChild(note);
    }

    if (member.references?.length) {
      item.appendChild(renderReferenceList(member.references));
    }

    list.appendChild(item);
  }

  return list;
}

/**
 * Renders the small category icon shown next to an entry's era label.
 * Returns null when there is no icon for the category.
 * @param {object} entry
 * @returns {SVGSVGElement | null}
 */
export function renderCategoryIcon(entry) {
  if (!hasIcon(entry.category)) return null;
  const icon = createIcon(entry.category, { size: 13 });
  icon.classList.add("entry-icon");
  return icon;
}

/**
 * Builds a single timeline card element for an entry.
 * @param {object} entry
 * @returns {HTMLElement}
 */
export function renderTimelineCard(entry) {
  const wrapper = document.createElement("div");
  wrapper.className = "timeline-entry";
  wrapper.dataset.id = entry.id;

  const dot = document.createElement("span");
  dot.className = "timeline-dot";
  wrapper.appendChild(dot);

  const card = document.createElement("div");
  card.className = "timeline-card";

  const title = document.createElement("h3");
  title.textContent = entry.name;
  card.appendChild(title);

  const era = document.createElement("p");
  era.className = "timeline-era";
  const categoryIcon = renderCategoryIcon(entry);
  if (categoryIcon) era.appendChild(categoryIcon);
  era.appendChild(document.createTextNode(entry.era));
  card.appendChild(era);

  card.appendChild(renderEntryBody(entry));

  wrapper.appendChild(card);
  return wrapper;
}
