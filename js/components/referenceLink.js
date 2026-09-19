import { createIcon, hasIcon } from "./icons.js";

/**
 * Renders a list of reference objects as a styled <ul> of links.
 * @param {{type: string, label: string, url: string}[]} references
 * @returns {HTMLUListElement}
 */
export function renderReferenceList(references = []) {
  const list = document.createElement("ul");
  list.className = "ref-list";

  for (const ref of references) {
    const item = document.createElement("li");
    item.appendChild(renderReferenceLink(ref));
    list.appendChild(item);
  }

  return list;
}

/**
 * Renders a single reference as a styled anchor tag, with a Quran or
 * hadith icon in front of it when the reference type has one. When the
 * reference has a `gist` (a one-sentence description of what that specific
 * verse or hadith says), it renders as a small line beneath the citation,
 * so a reference list can serve as a real index into the source rather
 * than just a bare citation.
 * @param {{type: string, label: string, url: string, gist?: string}} reference
 * @returns {HTMLAnchorElement}
 */
export function renderReferenceLink(reference) {
  const { type, label, url, gist } = reference;

  const link = document.createElement("a");
  link.className = "ref-link";
  if (gist) link.classList.add("ref-link-annotated");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const head = document.createElement("span");
  head.className = "ref-link-head";

  const tag = document.createElement("span");
  tag.className = "ref-tag";
  if (hasIcon(type)) tag.appendChild(createIcon(type, { size: 12 }));
  const tagText = document.createElement("span");
  tagText.textContent = type;
  tag.appendChild(tagText);

  const text = document.createElement("span");
  text.textContent = label;

  head.appendChild(tag);
  head.appendChild(text);
  link.appendChild(head);

  if (gist) {
    const gistEl = document.createElement("span");
    gistEl.className = "ref-gist";
    gistEl.textContent = gist;
    link.appendChild(gistEl);
  }

  return link;
}
