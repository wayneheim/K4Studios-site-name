import { useEffect, useMemo, useState } from "react";

/* ===== helpers ===== */
function pickImage(d = {}) {
  return (
    d.url || d.src || d.imageUrl || d.cover || d.hero?.src || d.preview?.src ||
    d.images?.[0]?.url || d.images?.[0]?.src || ""
  );
}
function isGhost(d) { return d && d.id === "i-k4studios"; }
function isReal(d)  { return d && !isGhost(d); }

function getParam(name) {
  try { return new URL(window.location.href).searchParams.get(name) || ""; }
  catch { return ""; }
}
function cleanPath(p) {
  if (!p) return "";
  const s = p.startsWith("/") ? p.slice(1) : p;
  return s.startsWith("src/") ? s : `src/${s}`;
}
function prettyFromPath(p) {
  const rel = (p || "").replace(/^\/?src\//, "").replace(/\.mjs$/i, "");
  return rel
    .split("/")
    .map(s => s.replace(/-/g, " ").replace(/\b\w/g, m => m.toUpperCase()))
    .join(" / ");
}

/* Simple buttons like Orderer */
const btn = "px-3 py-1 rounded-md border inline-flex items-center transition-colors duration-150";
const hover = "hover:opacity-90";

export default function GalleryImporter({ showTitle = true }) {
  /* discover all datasets under both roots */
  const modules = useMemo(() => {
    const maps = [
      import.meta.glob("/src/data/Galleries/**/*.mjs", { eager: false, import: "galleryData" }),
      import.meta.glob("/src/pages/Other/**/*.mjs",    { eager: false, import: "galleryData" }),
    ];
    return Object.assign({}, ...maps);
  }, []);

  const options = useMemo(() => {
    return Object.keys(modules)
      .sort((a,b) => a.replace(/^\/?src\//,"").localeCompare(b.replace(/^\/?src\//,"")))
      .map(path => ({ path, label: prettyFromPath(path) }));
  }, [modules]);

  /* destination (to=...) and source selection */
  const [destPath, setDestPath] = useState(() => {
    const q = getParam("to");
    return q ? (q.startsWith("/") ? q : `/${q}`) : (options[0]?.path || "");
  });
  const [sourcePath, setSourcePath] = useState("");

  const [destFull, setDestFull] = useState([]);      // full array (incl. ghost)
  const [sourceItems, setSourceItems] = useState([]); // visibles from source

  const [filter, setFilter] = useState("");
  const [showTitles, setShowTitles] = useState(false);
  const [thumb, setThumb] = useState(180);

  /* selection */
  const [selected, setSelected] = useState(() => new Set());

  /* load destination once path ready */
  useEffect(() => {
    let stop = false;
    async function load() {
      if (!destPath) return;
      const mod = await modules[destPath]?.();
      if (stop) return;
      const arr = Array.isArray(mod) ? mod : [];
      setDestFull(arr);
    }
    load();
    return () => { stop = true; };
  }, [destPath, modules]);

  /* choose a default source (not equal to dest) once options exist */
  useEffect(() => {
    if (!options.length) return;
    if (sourcePath) return;
    const firstOther = options.find(o => o.path !== destPath) || options[0];
    setSourcePath(firstOther.path);
  }, [options, destPath, sourcePath]);

 // load source items
useEffect(() => {
  let stop = false;
  async function load() {
    if (!sourcePath) return;
    const mod = await modules[sourcePath]?.();
    if (stop) return;

    // ✅ FIX: filter the module result directly (don’t reference `arr` before it exists)
    const arr = Array.isArray(mod) ? mod.filter(isReal) : [];
    setSourceItems(arr);
    setSelected(new Set()); // reset selection when switching source
  }
  load();
  return () => { stop = true; };
}, [sourcePath, modules]);


  /* derived sets */
  const destIds = useMemo(() => {
    const m = new Set();
    destFull.filter(isReal).forEach(it => { if (it?.id) m.add(it.id); });
    return m;
  }, [destFull]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sourceItems;
    return sourceItems.filter(d =>
      [d.id, d.title, d.alt, d.description, d.story]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [sourceItems, filter]);

  function toggle(id, disabled) {
    if (disabled) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllNew() {
    const s = new Set();
    filtered.forEach(it => { if (!destIds.has(it.id)) s.add(it.id); });
    setSelected(s);
  }
  function deselectAll() { setSelected(new Set()); }

  async function importSelected() {
    // prevent self-import confusion
    if (cleanPath(sourcePath) === cleanPath(destPath)) {
      alert("Source and destination are the same gallery. Choose a different source.");
      return;
    }

    const chosen = sourceItems.filter(it => selected.has(it.id));
    if (!chosen.length) { alert("Select one or more images to import."); return; }

    const toAppend = chosen.filter(it => !destIds.has(it.id));
    const dupCount = chosen.length - toAppend.length;

    if (!toAppend.length) {
      alert(`0 of ${chosen.length} images imported — ${dupCount} already in this gallery.`);
      return;
    }

    // Build final full array: keep ghosts + current visibles, then append new
    const ghosts = destFull.filter(isGhost);
    const visibles = destFull.filter(isReal);
    const finalVis = visibles.concat(toAppend);
    const finalFull = ghosts.concat(finalVis);

    try {
      const res = await fetch("/.netlify/functions/updateGalleryOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetPath: cleanPath(destPath), // e.g. src/data/.../Color.mjs or src/pages/Other/...
          fullArray: finalFull,             // server normalizes & resequences sortOrder
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      setDestFull(finalFull);
      setSelected(new Set());
      alert(`${toAppend.length} of ${chosen.length} images imported — ${dupCount} already in this gallery.`);
    } catch (err) {
      alert("Import failed.\n\n" + (err?.message || err));
    }
  }

  const total = filtered.length;
  const selectedCount = [...selected].length;
  const dupInView = filtered.filter(it => destIds.has(it.id)).length;

  return (
    <div className="p-6 max-w-7xl mx-auto text-sm">
      {showTitle && <h1 className="text-2xl font-semibold mb-3">Image-Gallery Importer</h1>}

      {/* selectors with clear labels */}
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <div className="flex flex-col min-w-[22rem]">
          <label className="text-xs opacity-70 mb-1">To:</label>
          <div
            className="px-2 py-1 rounded-md border bg-gray-50 text-gray-700"
            aria-label="Destination gallery"
            title={prettyFromPath(destPath)}
          >
            <span className="font-medium">{prettyFromPath(destPath)}</span>
          </div>
        </div>

        <div className="flex flex-col min-w-[22rem]">
          <label htmlFor="import-from" className="text-xs opacity-70 mb-1">Import from:</label>
          <select
            id="import-from"
            className="border rounded-md px-2 py-1"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            aria-label="Source gallery to import from"
          >
            {options.map(o => (
              <option key={o.path} value={o.path}>
                {prettyFromPath(o.path)}
              </option>
            ))}
          </select>
        </div>

        {/* search + view toggles */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search id/title/text…"
            className="w-72 border rounded-md px-2 py-1"
            aria-label="Search within source gallery"
          />
          <label className="flex items-center gap-1 px-2 py-1 border rounded-md">
            <input type="checkbox" checked={showTitles} onChange={() => setShowTitles(v => !v)} />
            Titles
          </label>
          <div className="flex items-center gap-2 border rounded-md px-2 py-1">
            <span className="opacity-70">Thumb</span>
            <input type="range" min={90} max={320} value={thumb} onChange={(e) => setThumb(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={selectAllNew} className={`${btn} bg-white ${hover}`}>Select All (new only)</button>
        <button onClick={deselectAll} className={`${btn} bg-white ${hover}`}>Deselect All</button>
        <button onClick={importSelected} className={`${btn} bg-orange-100 border-orange-300 text-orange-900 ${hover}`}>
          Import Selected
        </button>

        {/* legend + counters */}
        <span className="ml-auto text-xs flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full ring-2 ring-emerald-400 bg-emerald-50"></span>
            Already in gallery
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full ring-2 ring-blue-400 bg-blue-50"></span>
            Selected
          </span>
          <span className="opacity-70">
            · {selectedCount} selected — {dupInView} duplicates in view — {total}/{sourceItems.length}
          </span>
        </span>
      </div>

      {/* grid */}
      <div
        style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: `repeat(auto-fill, minmax(${thumb}px, 1fr))` }}
      >
        {filtered.map((it) => {
          const img = pickImage(it);
          const dup = destIds.has(it.id);
          const isSel = selected.has(it.id);
          const ring = dup ? "ring-2 ring-emerald-400" : (isSel ? "ring-2 ring-blue-400" : "ring-1 ring-gray-200");
          const dim  = dup ? "opacity-60" : (isSel ? "" : "opacity-100");

          return (
            <div
              key={it.id}
              className={`border rounded-md bg-white overflow-hidden shadow-sm ${ring} ${dup ? "cursor-not-allowed" : "cursor-pointer"}`}
              onClick={() => toggle(it.id, dup)}
              title={`${it.id}${dup ? " — already in destination" : ""}`}
            >
              {img ? (
                <img
                  src={img}
                  alt=""
                  className={`block w-full ${dim}`}
                  style={{ height: thumb, objectFit: "cover" }}
                />
              ) : (
                <div className="w-full grid place-items-center" style={{ height: thumb }}>
                  No image
                </div>
              )}
              <div className="flex items-center justify-between px-2 py-1 text-xs border-t bg-gray-50">
                {dup ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                    In gallery
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    checked={isSel}
                    readOnly
                    className="accent-blue-600"
                    onClick={(e) => { e.preventDefault(); toggle(it.id, false); }}
                  />
                )}
                {showTitles ? (
                  <span className="truncate ml-2" title={it.title || ""}>
                    {it.title || it.id}
                  </span>
                ) : (
                  <span className="opacity-60 truncate ml-2">{it.id}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
