import { renderTree, setSelectedNode } from "./components/tree.js";
import { renderTimeline } from "./components/timeline.js";
import { renderEntryBody, renderCategoryIcon } from "./components/card.js";
import { renderFamilyIndex, renderFamilyDetail } from "./components/family.js";
import { renderTopicPage } from "./components/topicPage.js";
import { renderJourney, JOURNEY_ENTRY_IDS } from "./components/journey.js";
import { renderTales } from "./components/tales.js";
import { initSearch } from "./components/search.js";
import { createIcon } from "./components/icons.js";

// Topic-page tabs: each renders every entry of one non-chronological
// category in full, as a reference page, rather than a slot in the
// Timeline. Grouped roughly as a widening circle: the source text
// (Quran), core doctrine and the unseen (Beliefs, Angels), evidence in
// creation (Signs), worship in practice (Pillars, Duas), personal and
// interpersonal conduct (Character, Rights, Law), then final destiny
// (End Times). None of these are dated occurrences the way a Seerah
// event is, which is why none of them get a slot in the Timeline either.
const TOPIC_TABS = [
  { category: "quran", contentId: "quran-content" },
  { category: "belief", contentId: "beliefs-content" },
  { category: "angel", contentId: "angels-content" },
  { category: "sign", contentId: "signs-content" },
  { category: "duty", contentId: "pillars-content" },
  { category: "dua", contentId: "duas-content" },
  { category: "character", contentId: "character-content" },
  { category: "right", contentId: "rights-content" },
  { category: "law", contentId: "law-content" },
  { category: "endtimes", contentId: "endtimes-content" },
];

// Derived lookups for the cross-link system: a topic category's view name
// (matches its nav button's data-view and its section id), and the
// reverse, a view name's content container id.
const CATEGORY_TO_TOPIC_VIEW = Object.fromEntries(
  TOPIC_TABS.map((t) => [t.category, t.contentId.replace("-content", "")])
);
const TOPIC_VIEW_TO_CONTENT_ID = Object.fromEntries(
  TOPIC_TABS.map((t) => [t.contentId.replace("-content", ""), t.contentId])
);

const VIEW_LABELS = {
  tree: "Tree",
  timeline: "Timeline",
  family: "Family",
  tales: "Tales",
  journey: "Journey",
  quran: "Quran",
  signs: "Signs",
  angels: "Angels",
  beliefs: "Beliefs",
  pillars: "Pillars",
  duas: "Duas",
  character: "Character",
  rights: "Rights",
  law: "Law",
  endtimes: "End Times",
};

const DATA_URL = "./data/timeline.json";

const state = {
  entries: [],
  activeView: "tree",
  treeHandle: null,
};

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

function initTabs() {
  const tabs = document.querySelectorAll("nav.tabs button[data-view]");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function switchView(viewName) {
  state.activeView = viewName;

  document.querySelectorAll("nav.tabs button[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}-view`);
  });
}

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  const stored = localStorage.getItem("dalil-theme");
  if (stored) document.documentElement.setAttribute("data-theme", stored);
  updateThemeButton(btn);

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentlyDark = current ? current === "dark" : prefersDark;
    const next = currentlyDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("dalil-theme", next);
    updateThemeButton(btn);
  });
}

function updateThemeButton(btn) {
  const current = document.documentElement.getAttribute("data-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = current ? current === "dark" : prefersDark;

  const iconSlot = document.getElementById("theme-toggle-icon");
  iconSlot.innerHTML = "";
  iconSlot.appendChild(createIcon(isDark ? "sun" : "moon", { size: 14 }));

  document.getElementById("theme-toggle-label").textContent = isDark ? "Light mode" : "Dark mode";
}

/**
 * @param {(entry: object) => {view: string, label: string}[]} getLocations
 * @param {(entry: object, view: string) => void} onNavigate
 */
function initDetailPanel(getLocations, onNavigate) {
  const panel = document.getElementById("detail-panel");
  const backdrop = document.getElementById("panel-backdrop");
  const closeBtn = document.getElementById("panel-close");

  const close = () => {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
    if (state.treeHandle) {
      setSelectedNode(document.getElementById("tree-view"), null);
    }
  };

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return {
    open(entry) {
      document.getElementById("panel-name").textContent = entry.name;

      const eraEl = document.getElementById("panel-era");
      eraEl.innerHTML = "";
      const categoryIcon = renderCategoryIcon(entry);
      if (categoryIcon) eraEl.appendChild(categoryIcon);
      eraEl.appendChild(document.createTextNode(entry.era));

      const body = document.getElementById("panel-body");
      body.innerHTML = "";
      body.appendChild(
        renderEntryBody(entry, {
          locations: getLocations(entry),
          onNavigate: (view) => onNavigate(entry, view),
        })
      );

      panel.classList.add("open");
      backdrop.classList.add("open");
    },
    close,
  };
}

function initTreeControls(panzoom, center) {
  document.getElementById("zoom-in").addEventListener("click", () => panzoom.zoomBy(1.2));
  document.getElementById("zoom-out").addEventListener("click", () => panzoom.zoomBy(0.8));
  document.getElementById("zoom-reset").addEventListener("click", () => {
    panzoom.scale = 1;
    center();
  });

  // Below 640px the legend collapses behind this "?" toggle (see the
  // media query in tree.css); above that width the toggle stays hidden
  // and the caption is always visible, so this wiring is harmless dead
  // weight on desktop rather than something that needs its own branch.
  const toggle = document.getElementById("tree-caption-toggle");
  const caption = document.getElementById("tree-caption");
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = caption.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!caption.contains(e.target) && e.target !== toggle) {
      caption.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // The joystick (mobile only, see tree.css): each button pans steadily
  // in its direction for as long as it's held, rather than one nudge per
  // tap, since it exists specifically as a more reliable stand-in for a
  // touch drag on a screen where that drag has to compete with the
  // browser's own scroll and pull-to-refresh gestures.
  const PAN_STEP = 10;
  const PAN_DIRECTIONS = { up: [0, PAN_STEP], down: [0, -PAN_STEP], left: [PAN_STEP, 0], right: [-PAN_STEP, 0] };
  let panRafId = null;

  const startPanning = (dir) => {
    const [dx, dy] = PAN_DIRECTIONS[dir];
    const tick = () => {
      panzoom.panBy(dx, dy);
      panRafId = requestAnimationFrame(tick);
    };
    panRafId = requestAnimationFrame(tick);
  };
  const stopPanning = () => {
    if (panRafId !== null) {
      cancelAnimationFrame(panRafId);
      panRafId = null;
    }
  };

  document.querySelectorAll("#tree-joystick button[data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startPanning(dir);
    });
    btn.addEventListener("pointerup", stopPanning);
    btn.addEventListener("pointerleave", stopPanning);
    btn.addEventListener("pointercancel", stopPanning);
  });
}

/**
 * Briefly highlights an element after a cross-link jump lands on it, so
 * "View in Timeline" (etc.) doesn't just scroll somewhere and leave the
 * person guessing which card it meant.
 */
function revealElement(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("cross-link-target");
  setTimeout(() => el.classList.remove("cross-link-target"), 1500);
}

async function init() {
  initTabs();
  initThemeToggle();

  // These two are filled in for real once every view has been built below;
  // the detail panel is constructed first (renderTree needs its .open to
  // wire up node selection), so it's handed stable wrapper functions that
  // simply delegate to whatever these are reassigned to by the time a
  // person actually clicks something.
  let getEntryLocations = () => [];
  let navigateToEntry = () => {};

  const detailPanel = initDetailPanel(
    (entry) => getEntryLocations(entry, state.activeView),
    (entry, view) => navigateToEntry(entry, view)
  );

  try {
    state.entries = await loadJson(DATA_URL);
  } catch (err) {
    console.error(err);
    document.getElementById("app").innerHTML =
      '<p style="padding: 24px;">Failed to load timeline data. Check the console for details.</p>';
    return;
  }

  const familyContent = document.getElementById("family-content");
  const showFamilyIndex = () => renderFamilyIndex(familyContent, state.entries, showFamilyDetail);
  const showFamilyDetail = (entry) =>
    renderFamilyDetail(familyContent, entry, showFamilyIndex, {
      locations: getEntryLocations(entry, "family"),
      onNavigate: (view) => navigateToEntry(entry, view),
    });

  const openFamilyFor = (entry) => {
    switchView("family");
    showFamilyDetail(entry);
  };

  const treeContainer = document.getElementById("tree-view");
  const onSelect = (entry) => {
    setSelectedNode(treeContainer, entry.id);
    detailPanel.open(entry);
  };

  // A search result opens straight into the detail panel from wherever the
  // user currently is; if it's a prophet, also mark it selected in the
  // tree so the two stay consistent.
  initSearch(document.getElementById("search-widget"), state.entries, (entry) => {
    if (entry.category === "prophet") setSelectedNode(treeContainer, entry.id);
    detailPanel.open(entry);
  });

  // The tree is a genealogical view, so it only ever shows prophets; every
  // other category (cosmology, angels, jinn, events, end times) has no
  // family-tree position and belongs in the timeline instead.
  const prophetEntries = state.entries.filter((e) => e.category === "prophet");
  const { panzoom, center, centerOnNode } = renderTree(treeContainer, prophetEntries, onSelect, openFamilyFor);
  state.treeHandle = { panzoom, centerOnNode };
  initTreeControls(panzoom, center);

  const timelineTrack = document.getElementById("timeline-track");
  // Topic-page categories (beliefs, pillars, rights, law) are timeless
  // teachings, not chronological events, so they get their own tabs
  // instead of a slot in this sequence. Non-prophet Quranic accounts
  // ("tale" category, used only by the Tales view) have no fixed date the
  // Quran or hadith establishes either, so they're excluded the same way.
  const topicCategories = new Set([...TOPIC_TABS.map((t) => t.category), "tale"]);
  const timelineEntries = state.entries
    .filter((e) => !topicCategories.has(e.category))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderTimeline(timelineTrack, timelineEntries);

  // Cross-linking: every place a single entry can appear across the site
  // (Tree, Timeline, Family, Tales, Journey, and its topic tab), and a way
  // to jump straight there and land on the right spot, not just the tab.
  // Defined here, before the views below are built, since the topic pages
  // call getEntryLocations eagerly while building each card (unlike the
  // detail panel and Family, which only call it lazily on click).
  //
  // excludeView is required, not read from state.activeView internally:
  // the topic pages below render every card once up front, while
  // state.activeView is still stuck at its initial "tree" value, so a
  // reference to the live view would never exclude a topic entry's own
  // tab from its own cards. Each call site passes what's actually true
  // for it instead: the detail panel passes the live state.activeView
  // (it opens interactively, from wherever the person currently is),
  // Family passes the fixed "family", and each topic page's render loop
  // passes that page's own fixed view.
  getEntryLocations = (entry, excludeView) => {
    const views = [];
    if (entry.category === "prophet") views.push("tree");
    if (!topicCategories.has(entry.category)) views.push("timeline");
    if (entry.family?.length) views.push("family");
    if (entry.tale?.chapters?.length) views.push("tales");
    if (JOURNEY_ENTRY_IDS.has(entry.id)) views.push("journey");
    if (CATEGORY_TO_TOPIC_VIEW[entry.category]) views.push(CATEGORY_TO_TOPIC_VIEW[entry.category]);
    return views.filter((view) => view !== excludeView).map((view) => ({ view, label: VIEW_LABELS[view] }));
  };

  navigateToEntry = (entry, view) => {
    detailPanel.close();
    switchView(view);

    if (view === "tree") {
      setSelectedNode(treeContainer, entry.id);
      state.treeHandle.centerOnNode(entry.id);
    } else if (view === "timeline") {
      revealElement(timelineTrack.querySelector(`[data-id="${entry.id}"]`));
    } else if (view === "family") {
      showFamilyDetail(entry);
    } else if (view === "tales") {
      talesHandle.select(entry);
    } else if (view === "journey") {
      revealElement(document.getElementById("journey-content").querySelector(`[data-id="${entry.id}"]`));
    } else {
      const contentId = TOPIC_VIEW_TO_CONTENT_ID[view];
      if (contentId) revealElement(document.getElementById(contentId).querySelector(`[data-id="${entry.id}"]`));
    }
  };

  const timelineCards = document.querySelectorAll(".timeline-entry");
  timelineCards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const entry = state.entries.find((e) => e.id === card.dataset.id);
      if (entry) detailPanel.open(entry);
    });
  });

  showFamilyIndex();

  renderJourney(document.getElementById("journey-content"), state.entries, detailPanel.open);

  const talesHandle = renderTales(
    document.getElementById("tales-sidebar"),
    document.getElementById("tales-detail"),
    state.entries,
    detailPanel.open
  );

  for (const { category, contentId } of TOPIC_TABS) {
    const ownView = CATEGORY_TO_TOPIC_VIEW[category];
    renderTopicPage(document.getElementById(contentId), state.entries, category, {
      getLocations: (entry) => getEntryLocations(entry, ownView),
      onNavigate: navigateToEntry,
    });
  }
}

init();
