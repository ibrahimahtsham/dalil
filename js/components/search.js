import { createIcon } from "./icons.js";
import { renderCategoryIcon } from "./card.js";

const MAX_RESULTS = 20;

/**
 * Wires up a site-wide search box: typing filters across every entry's
 * name, era, category, summary, and reference labels/gists, and a result
 * opens straight into the detail panel regardless of which tab is active.
 * @param {HTMLElement} root - the search widget's root element
 * @param {object[]} entries - the full entry list to search across
 * @param {(entry: object) => void} onSelect - opens an entry (the detail panel)
 */
export function initSearch(root, entries, onSelect) {
  const input = root.querySelector("#search-input");
  const results = root.querySelector("#search-results");
  const toggle = root.querySelector("#search-toggle");

  toggle.appendChild(createIcon("search", { size: 15 }));

  const index = entries.map((entry) => ({
    entry,
    haystack: buildHaystack(entry).toLowerCase(),
  }));

  // Tracks which result the keyboard has moved to, so arrow keys can walk
  // the list without the mouse; -1 means nothing is highlighted yet.
  let activeIndex = -1;
  let currentMatches = [];

  function openSearch() {
    root.classList.add("open");
    input.focus();
  }

  function closeSearch() {
    root.classList.remove("open");
    input.value = "";
    renderResults([]);
  }

  function renderResults(matches) {
    currentMatches = matches;
    activeIndex = -1;
    results.innerHTML = "";

    if (!matches.length) {
      if (input.value.trim()) {
        const empty = document.createElement("p");
        empty.className = "search-empty";
        empty.textContent = "No matches. Try a different word.";
        results.appendChild(empty);
        results.classList.add("open");
      } else {
        results.classList.remove("open");
      }
      return;
    }
    results.classList.add("open");

    for (const entry of matches) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "search-result";
      item.addEventListener("click", () => {
        onSelect(entry);
        closeSearch();
      });
      item.addEventListener("mouseenter", () => setActive(matches.indexOf(entry)));

      const name = document.createElement("span");
      name.className = "search-result-name";
      name.textContent = entry.name;
      item.appendChild(name);

      const meta = document.createElement("span");
      meta.className = "search-result-meta";
      const icon = renderCategoryIcon(entry);
      if (icon) meta.appendChild(icon);
      meta.appendChild(document.createTextNode(entry.era));
      item.appendChild(meta);

      results.appendChild(item);
    }
  }

  function setActive(index) {
    const items = results.querySelectorAll(".search-result");
    items.forEach((item, i) => item.classList.toggle("active", i === index));
    if (index >= 0) items[index]?.scrollIntoView({ block: "nearest" });
    activeIndex = index;
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      renderResults([]);
      return;
    }
    const matches = index
      .filter((row) => row.haystack.includes(q))
      .sort((a, b) => rank(a, q) - rank(b, q))
      .slice(0, MAX_RESULTS)
      .map((row) => row.entry);
    renderResults(matches);
  }

  toggle.addEventListener("click", () => {
    if (root.classList.contains("open")) closeSearch();
    else openSearch();
  });

  input.addEventListener("input", () => search(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (!currentMatches.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIndex + 1) % currentMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIndex - 1 + currentMatches.length) % currentMatches.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelect(currentMatches[activeIndex]);
      closeSearch();
    }
  });

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) closeSearch();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && document.activeElement !== input) {
      e.preventDefault();
      openSearch();
    }
  });
}

function buildHaystack(entry) {
  const parts = [entry.name, entry.era, entry.category, entry.summary ?? "", entry.lineage ?? ""];
  for (const ref of entry.references ?? []) {
    parts.push(ref.label, ref.gist ?? "");
  }
  for (const member of entry.family ?? []) {
    parts.push(member.name, member.role, member.note ?? "");
    for (const ref of member.references ?? []) parts.push(ref.label, ref.gist ?? "");
  }
  for (const chapter of entry.tale?.chapters ?? []) {
    parts.push(chapter.heading, chapter.narrative);
    for (const ref of chapter.references ?? []) parts.push(ref.label, ref.gist ?? "");
  }
  for (const dated of entry.provenDates ?? []) {
    parts.push(dated.label);
    for (const ref of dated.references ?? []) parts.push(ref.label, ref.gist ?? "");
  }
  if (entry.placementNote) {
    parts.push(entry.placementNote.text ?? "");
    for (const ref of entry.placementNote.references ?? []) parts.push(ref.label, ref.gist ?? "");
  }
  for (const section of entry.sections ?? []) {
    parts.push(section.heading ?? "", section.intro ?? "");
    for (const ref of section.references ?? []) parts.push(ref.label, ref.gist ?? "");
  }
  return parts.join("   ");
}

/** Lower rank sorts first: a match in the name beats a match buried elsewhere. */
function rank(row, query) {
  if (row.entry.name.toLowerCase().includes(query)) return 0;
  if (row.entry.era.toLowerCase().includes(query)) return 1;
  return 2;
}
