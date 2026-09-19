import { renderCategoryIcon, renderLocationLinks } from "./card.js";
import { renderReferenceList } from "./referenceLink.js";

/**
 * Renders a "topic page" view: every entry of a given category, as a
 * short intro followed by an index of real references, each annotated
 * with a one-sentence gist of what it actually says. Shared by the
 * Beliefs, Pillars, Rights, and Law tabs. This is deliberately a pointer
 * into the Quran and hadith, not a reproduction of their content, so it
 * stays a short intro plus a clean reference list rather than a wall of
 * prose.
 * @param {HTMLElement} container
 * @param {object[]} entries - full entry list, filtered internally
 * @param {string} category - the category to include, e.g. "duty"
 * @param {object} [options]
 * @param {(entry: object) => {view: string, label: string}[]} [options.getLocations]
 * @param {(entry: object, view: string) => void} [options.onNavigate]
 */
// Below this many entries, a flat list is still easy to scan on its own;
// above it, grouping by era turns a long undifferentiated scroll into a
// set of labeled clusters (e.g. Duas grouped by occasion, Beliefs grouped
// by theme).
const GROUPING_THRESHOLD = 10;

export function renderTopicPage(container, entries, category, options = {}) {
  const { getLocations, onNavigate } = options;
  container.innerHTML = "";

  const matching = entries.filter((e) => e.category === category);
  const groups = groupByEra(matching);
  const shouldGroup = matching.length > GROUPING_THRESHOLD && groups.length > 1;

  if (shouldGroup) {
    container.appendChild(buildJumpLinks(groups, category));
  }

  for (const group of groups) {
    if (shouldGroup) {
      const slug = groupSlug(category, group.era);
      const heading = document.createElement("h2");
      heading.className = "topic-group-heading";
      heading.id = slug;
      heading.textContent = group.era;

      const count = document.createElement("span");
      count.className = "topic-group-count";
      count.textContent = group.entries.length;
      heading.appendChild(count);

      container.appendChild(heading);
    }

    for (const entry of group.entries) {
      container.appendChild(buildTopicCard(entry, getLocations, onNavigate));
    }
  }
}

/**
 * A row of small jump links at the top of a grouped topic page, one per
 * section, so a long tab (Duas has 11 groups, 35 entries) can be scanned
 * and jumped into rather than only scrolled through blind, especially on
 * mobile where that scroll is a lot of thumb movement.
 * @param {{era: string, entries: object[]}[]} groups
 * @param {string} category
 */
function buildJumpLinks(groups, category) {
  const nav = document.createElement("nav");
  nav.className = "topic-jumplinks";
  nav.setAttribute("aria-label", "Jump to section");

  for (const group of groups) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "topic-jumplink";
    link.textContent = group.era;
    link.addEventListener("click", () => {
      document.getElementById(groupSlug(category, group.era))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    nav.appendChild(link);
  }

  return nav;
}

/** A stable, collision-free id for a group heading: unique per category, since two tabs could otherwise share an era name (e.g. "Foundational"). */
function groupSlug(category, era) {
  return `topic-group-${category}-${era.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

/**
 * Groups entries by era, preserving each era's first-appearance order
 * (not alphabetical), so the resulting section order still reads as the
 * data was deliberately laid out rather than shuffled by a sort.
 * @param {object[]} matching
 * @returns {{era: string, entries: object[]}[]}
 */
function groupByEra(matching) {
  const groups = [];
  const indexByEra = new Map();
  for (const entry of matching) {
    if (!indexByEra.has(entry.era)) {
      indexByEra.set(entry.era, groups.length);
      groups.push({ era: entry.era, entries: [] });
    }
    groups[indexByEra.get(entry.era)].entries.push(entry);
  }
  return groups;
}

function buildTopicCard(entry, getLocations, onNavigate) {
  const card = document.createElement("article");
  card.className = "topic-card";
  card.dataset.id = entry.id;

  const title = document.createElement("h2");
  title.textContent = entry.name;
  card.appendChild(title);

  const era = document.createElement("p");
  era.className = "topic-era";
  const icon = renderCategoryIcon(entry);
  if (icon) era.appendChild(icon);
  era.appendChild(document.createTextNode(entry.era));
  card.appendChild(era);

  if (entry.summary) {
    const intro = document.createElement("p");
    intro.className = "topic-intro";
    intro.textContent = entry.summary;
    card.appendChild(intro);
  }

  if (getLocations && onNavigate) {
    const locations = getLocations(entry);
    if (locations.length) {
      card.appendChild(renderLocationLinks(locations, (view) => onNavigate(entry, view)));
    }
  }

  if (entry.references?.length) {
    card.appendChild(renderReferenceList(entry.references));
  }

  for (const section of entry.sections ?? []) {
    const heading = document.createElement("h3");
    heading.className = "topic-section-heading";
    heading.textContent = section.heading;
    card.appendChild(heading);

    if (section.intro) {
      const intro = document.createElement("p");
      intro.className = "topic-intro";
      intro.textContent = section.intro;
      card.appendChild(intro);
    }

    if (section.references?.length) {
      card.appendChild(renderReferenceList(section.references));
    }
  }

  return card;
}
