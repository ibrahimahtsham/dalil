# Dalil

Dalil (Arabic: دليل, "evidence" or "guide") is a static reference site covering Islamic history, belief, and practice, built on one rule: **every claim on the site is backed by a real, verifiable citation to the Quran or an authentic hadith.** Nothing is sourced to folklore, weak narrations, or popular tradition without saying so plainly. Where a name, date, or detail is commonly repeated but isn't actually in the text, the site either leaves it out or says explicitly that it isn't backed.

No build step, no framework, no dependencies. Vanilla HTML, CSS, and JS, served as static files.

## Running it locally

```
python -m http.server
```

or open `index.html` with any static file server / Live Server extension. There is nothing to install or compile.

## Structure

```
index.html              Single-page shell; every view lives inside it
data/timeline.json       The single source of truth: every entry on the site
js/main.js                App entry point: routing, cross-linking, search wiring
js/components/            One renderer per view (tree, timeline, family, tales, journey,
                           topic pages, search, reference lists, icons)
js/lib/panzoom.js         Small pan/zoom implementation used by the Tree view
css/                      One stylesheet per view, plus variables.css (the whole
                           color system, strictly grayscale) and components.css
                           (shared elements: reference links, cross-link chips, etc.)
```

## Data model

Every entry in `data/timeline.json` shares a common shape:

```json
{
  "id": "unique-slug",
  "name": "Display Name",
  "category": "prophet | event | tale | angel | jinn | cosmology | quran |
               sign | belief | duty | dua | character | right | law | endtimes",
  "era": "A period label, or a group label on topic pages",
  "summary": "What the entry says, in plain prose",
  "references": [
    { "type": "quran" | "hadith", "label": "Surah X:Y or Book N", "url": "...", "gist": "one-sentence description of what that specific citation actually says" }
  ]
}
```

Some categories carry extra structure: `prophet` entries can have `family`, `lineage`, `placementNote` (why a prophet sits where it does in the family tree), and `provenDates` (a duration or age the text states outright, like Nuh's 950 years). `tale` and some `prophet` entries have a `tale.chapters` array for a longer narrative broken into cited sections.

`category` drives everything: which of the fifteen tabs an entry appears on, whether it shows up in the Tree (prophets only) or the Timeline (dated events only), and which other views it cross-links to.

## Views

- **Tree** — a genealogical diagram of the 25 prophets named in the Quran, with pan/zoom, family and placement-reasoning badges, and text-attested date badges.
- **Timeline** — dated history in order, from creation through the death of the Prophet.
- **Family** — every prophet's recorded family members, each with its own sourcing note.
- **Tales** — non-prophet Quranic accounts (Ashab al-Kahf, Dhul-Qarnayn, Qarun, and others).
- **Journey** — the individual soul's path from the primordial covenant through the afterlife, as a single flowchart pointing into already-cited entries.
- **Quran, Beliefs, Angels, Signs, Pillars, Duas, Character, Rights, Law, End Times** — ten subject-reference tabs, each a scannable index of real citations rather than a reproduction of their content. Long tabs group into labeled sections with jump links.

A site-wide search (press `/` or `Ctrl/Cmd+K`) indexes every field across every entry, and every entry shows an "Also in" row linking to every other view it appears in.

## Editorial rules

- Quran and authentic hadith only. A popular name, date, or detail without real textual backing is either omitted or explicitly flagged as unconfirmed, never presented as fact.
- No em dashes anywhere in the codebase.
- Strict grayscale: no hue anywhere in the color system, light or dark theme.
- The site title stays simply "Dalil."
