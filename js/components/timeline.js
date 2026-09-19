import { renderTimelineCard } from "./card.js";

/**
 * Renders the vertical timeline into the given track element.
 * Entries are shown in the order provided (assumed chronological).
 * @param {HTMLElement} track - container element for timeline entries
 * @param {object[]} entries
 */
export function renderTimeline(track, entries) {
  track.innerHTML = "";
  for (const entry of entries) {
    track.appendChild(renderTimelineCard(entry));
  }
}
