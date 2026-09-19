import { renderCategoryIcon } from "./card.js";
import { renderReferenceList } from "./referenceLink.js";

/**
 * Renders the Tales view: a sidebar listing every prophet and non-prophet
 * figure whose story is recorded with enough detail in the Quran or hadith
 * to tell as a connected narrative (in chronological order for prophets,
 * since that order is already established for the Tree), and a detail pane
 * that shows the selected one's tale as a sequence of cited chapters.
 *
 * Not every prophet has an entry here: several are named in the Quran with
 * no narrative attached (Al-Yasa, Dhul-Kifl), and Muhammad's (SAW) life is
 * already told in full, event by event, in the Timeline, so it isn't
 * duplicated here.
 * @param {HTMLElement} sidebarEl
 * @param {HTMLElement} detailEl
 * @param {object[]} entries - full entry list, filtered internally
 * @param {(entry: object) => void} [onOpenEntry] - optional, opens an
 *   entry's own detail panel (e.g. from a "view full entry" link)
 */
export function renderTales(sidebarEl, detailEl, entries, onOpenEntry) {
  const withTales = entries.filter((e) => e.tale?.chapters?.length);
  const prophetTales = withTales
    .filter((e) => e.category === "prophet")
    .sort((a, b) => (a.generation ?? 0) - (b.generation ?? 0));
  const otherTales = withTales
    .filter((e) => e.category === "tale")
    .sort((a, b) => (a.taleOrder ?? 0) - (b.taleOrder ?? 0));

  sidebarEl.innerHTML = "";

  const caption = document.createElement("p");
  caption.className = "tales-caption";
  caption.textContent = "Every story here is told strictly from what the Quran or hadith records, in the order it happens within the account itself, not padded beyond that.";
  sidebarEl.appendChild(caption);

  if (prophetTales.length) {
    sidebarEl.appendChild(buildSectionLabel("Prophets, in order"));
    for (const entry of prophetTales) {
      sidebarEl.appendChild(buildSidebarItem(entry, select));
    }
  }

  if (otherTales.length) {
    sidebarEl.appendChild(buildSectionLabel("Other Quranic Accounts"));
    for (const entry of otherTales) {
      sidebarEl.appendChild(buildSidebarItem(entry, select));
    }
  }

  function select(entry) {
    sidebarEl.querySelectorAll(".tales-sidebar-item").forEach((btn) => {
      const active = btn.dataset.id === entry.id;
      btn.classList.toggle("active", active);
      if (active) btn.scrollIntoView({ block: "nearest" });
    });
    renderDetail(detailEl, entry, onOpenEntry);
  }

  if (withTales.length) select(withTales[0]);

  // Exposed so other views can cross-link straight to a specific tale
  // (e.g. "View in Tales" from the detail panel) without duplicating the
  // sidebar's selection/rendering logic.
  return { select };
}

function buildSectionLabel(text) {
  const label = document.createElement("p");
  label.className = "tales-sidebar-label";
  label.textContent = text;
  return label;
}

function buildSidebarItem(entry, onSelect) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tales-sidebar-item";
  btn.dataset.id = entry.id;
  btn.addEventListener("click", () => onSelect(entry));

  const name = document.createElement("span");
  name.className = "tales-sidebar-item-name";
  name.textContent = entry.name;
  btn.appendChild(name);

  const era = document.createElement("span");
  era.className = "tales-sidebar-item-era";
  era.textContent = entry.era;
  btn.appendChild(era);

  return btn;
}

function renderDetail(container, entry, onOpenEntry) {
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "tales-header";

  const title = document.createElement("h2");
  title.textContent = entry.name;
  header.appendChild(title);

  const era = document.createElement("p");
  era.className = "tales-era";
  const icon = renderCategoryIcon(entry);
  if (icon) era.appendChild(icon);
  era.appendChild(document.createTextNode(entry.era));
  header.appendChild(era);

  container.appendChild(header);

  if (entry.tale.intro) {
    const intro = document.createElement("p");
    intro.className = "tales-intro";
    intro.textContent = entry.tale.intro;
    container.appendChild(intro);
  }

  if (onOpenEntry) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "tales-open-entry";
    link.textContent = `View ${entry.name}'s full reference entry ›`;
    link.addEventListener("click", () => onOpenEntry(entry));
    container.appendChild(link);
  }

  const chapters = document.createElement("div");
  chapters.className = "tales-chapters";

  entry.tale.chapters.forEach((chapter, i) => {
    const section = document.createElement("article");
    section.className = "tales-chapter";

    const heading = document.createElement("h3");
    heading.textContent = `${i + 1}. ${chapter.heading}`;
    section.appendChild(heading);

    const narrative = document.createElement("p");
    narrative.className = "tales-narrative";
    narrative.textContent = chapter.narrative;
    section.appendChild(narrative);

    if (chapter.references?.length) {
      section.appendChild(renderReferenceList(chapter.references));
    }

    chapters.appendChild(section);
  });

  container.appendChild(chapters);
}
