// netlify/functions/updateGalleryItem.js
const fs = require("fs/promises");
const path = require("path");
const recast = require("recast");
const babelParser = require("@babel/parser");
const visualIndex = require("./visualIndex");

/* ===== new: path guards & helpers ===== */
const ALLOWED_ROOTS = ["src/data/Galleries", "src/pages/Other", "src/data/Other"]; // support all trees used by editors
const toPosix = (p = "") => String(p).replace(/\\/g, "/");
const hasTraversal = (p = "") => p.split(/[\\/]+/).some(seg => seg === "..");

function resolveDatasetAbsolute(datasetPath) {
  const rel = toPosix(String(datasetPath || "").replace(/^\//, "")); // strip leading "/"
  if (!rel || hasTraversal(rel) || !rel.endsWith(".mjs")) {
    throw new Error("Invalid datasetPath");
  }
  const ok = ALLOWED_ROOTS.some(root => rel.startsWith(toPosix(root) + "/"));
  if (!ok) throw new Error("Dataset must be under src/data/Galleries, src/pages/Other, or src/data/Other");
  return path.join(process.cwd(), rel);
}
/* ====================================== */

function parse(code) {
  return recast.parse(code, {
    parser: {
      parse: (src) =>
        babelParser.parse(src, {
          sourceType: "module",
          plugins: ["jsx", "importMeta"],
        }),
    },
  });
}

function getStringValue(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral") {
    const raw = node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
    return raw;
  }
  return null;
}
const b = recast.types.builders;

function makeStringNode(str, preferTemplateLiteral) {
  return preferTemplateLiteral
    ? b.templateLiteral([b.templateElement({ raw: String(str), cooked: String(str) }, true)], [])
    : b.stringLiteral(String(str));
}
function makeArrayStringLiterals(arr) {
  return b.arrayExpression(arr.map((s) => b.stringLiteral(String(s))));
}
function getProp(obj, name) {
  return obj.properties.find((p) => {
    const k = p.key;
    return (k.type === "Identifier" && k.name === name) || (k.type === "StringLiteral" && k.value === name);
  });
}
function setProp(obj, name, valueNode) {
  const existing = getProp(obj, name);
  if (existing) existing.value = valueNode;
  else {
    const keyNode = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? b.identifier(name) : b.stringLiteral(name);
    obj.properties.push(b.objectProperty(keyNode, valueNode));
  }
}

exports.handler = async (event) => {
  // GET: Fetch gallery data for reading
  if (event.httpMethod === "GET") {
    try {
      const datasetPath = event.queryStringParameters?.datasetPath;
      if (!datasetPath) return { statusCode: 400, body: "Missing datasetPath query param" };
      
      let absPath;
      try {
        absPath = resolveDatasetAbsolute(datasetPath);
      } catch (e) {
        return { statusCode: 400, body: e.message };
      }
      
      const code = await fs.readFile(absPath, "utf8");
      const ast = parse(code);
      
      // Find the galleryData array
      let items = [];
      recast.visit(ast, {
        visitVariableDeclarator(path) {
          if (path.node.id.name === "galleryData" && path.node.init?.type === "ArrayExpression") {
            items = path.node.init.elements.map(elem => {
              if (elem.type !== "ObjectExpression") return null;
              const obj = {};
              for (const prop of elem.properties) {
                const key = prop.key.name || prop.key.value;
                const val = getStringValue(prop.value);
                if (val !== null) obj[key] = val;
                else if (prop.value.type === "ArrayExpression") {
                  obj[key] = prop.value.elements.map(e => getStringValue(e)).filter(Boolean);
                } else if (prop.value.type === "BooleanLiteral") {
                  obj[key] = prop.value.value;
                } else if (prop.value.type === "NumericLiteral") {
                  obj[key] = prop.value.value;
                }
              }
              return obj;
            }).filter(Boolean);
            return false;
          }
          this.traverse(path);
        }
      });
      
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify({ items })
      };
    } catch (err) {
      console.error("[updateGalleryItem GET]", err);
      return { statusCode: 500, body: String(err.message) };
    }
  }
  
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { datasetPath, id, patch } = JSON.parse(event.body || "{}");
    if (!datasetPath || !id || !patch) return { statusCode: 400, body: "Missing datasetPath, id, or patch" };

    // safe resolve (accepts Galleries + Other, normalizes slashes, blocks traversal)
    let absPath;
    try {
      absPath = resolveDatasetAbsolute(datasetPath);
    } catch (e) {
      return { statusCode: 400, body: e.message };
    }

    const code = await fs.readFile(absPath, "utf8");
    const ast = parse(code);

    // find: export const galleryData = [ ... ]
    let arrNode = null;
    recast.types.visit(ast, {
      visitExportNamedDeclaration(p) {
        const decl = p.node.declaration;
        if (
          decl?.type === "VariableDeclaration" &&
          decl.declarations[0]?.id?.type === "Identifier" &&
          decl.declarations[0].id.name === "galleryData" &&
          decl.declarations[0].init?.type === "ArrayExpression"
        ) {
          arrNode = decl.declarations[0].init;
          return false;
        }
        this.traverse(p);
      },
    });
    if (!arrNode) return { statusCode: 400, body: "Could not find export const galleryData = []" };

    // find object with matching id (case-insensitive to handle URL normalization)
    const items = arrNode.elements || [];
    let target = null;
    let targetIndex = -1;
    const idLower = id.toLowerCase();
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      if (el?.type !== "ObjectExpression") continue;
      const idProp = getProp(el, "id");
      const idVal = getStringValue(idProp?.value);
      if (idVal && idVal.toLowerCase() === idLower) { 
        target = el;
        targetIndex = i;
        break; 
      }
    }
    if (!target) return { statusCode: 404, body: `Item id ${id} not found in ${datasetPath}` };

    // Check if this is a delete operation (status === "removed")
    if (patch.status === "removed") {
      // Remove from series registry first
      try {
        const seriesRegistry = require("./seriesRegistry");
        const mockEvent = {
          httpMethod: "POST",
          body: JSON.stringify({
            action: "removeOccurrence",
            imageId: id,
            galleryPath: datasetPath
          })
        };
        await seriesRegistry.handler(mockEvent);
        console.log(`[updateGalleryItem] Removed ${id} from series registry`);
      } catch (regErr) {
        console.warn("[updateGalleryItem] Failed to remove from series registry:", regErr.message);
      }
      
      // Remove from visual index
      try {
        await visualIndex.removeImage(id, datasetPath);
        console.log(`[updateGalleryItem] Removed ${id} from visual index`);
      } catch (vizErr) {
        console.warn("[updateGalleryItem] Failed to remove from visual index:", vizErr.message);
      }
      
      // Remove the entire entry from the array
      arrNode.elements.splice(targetIndex, 1);
      
      // Write back
      const output = recast.print(ast, { quote: "double" }).code;
      await fs.writeFile(absPath, output, "utf8");
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, deleted: true, datasetPath, id }),
      };
    }

    // whether file uses 'notes' or 'collectorNotes'
    const hasNotes = !!getProp(target, "notes");
    const notesKey = hasNotes ? "notes" : "collectorNotes";

    // prefer template literals if file already uses them
    const usesTemplate =
      /String\.raw`/.test(code) ||
      (getProp(target, "title") && getProp(target, "title").value.type === "TemplateLiteral");

    // apply patches
    if (patch.title != null) setProp(target, "title", makeStringNode(patch.title, usesTemplate));
    if (patch.alt != null) setProp(target, "alt", makeStringNode(patch.alt, usesTemplate));
    if (patch.description != null) setProp(target, "description", makeStringNode(patch.description, usesTemplate));
    if (patch.story != null) setProp(target, "story", makeStringNode(patch.story, usesTemplate));

    if (patch.collectorNotes != null || patch.notes != null) {
      const noteVal = patch[notesKey] ?? patch.collectorNotes ?? patch.notes;
      setProp(target, notesKey, makeStringNode(noteVal, usesTemplate));
    }

    if (Array.isArray(patch.keywords)) {
      if (getProp(target, "keywords") || !getProp(target, "tags")) {
        setProp(target, "keywords", makeArrayStringLiterals(patch.keywords));
      }
      if (getProp(target, "tags")) {
        setProp(target, "tags", makeArrayStringLiterals(patch.keywords));
      }
    }

    // autoGenerated flag (boolean)
    if (typeof patch.autoGenerated === "boolean") {
      setProp(target, "autoGenerated", b.booleanLiteral(patch.autoGenerated));
    }

    // autoTitle flag (boolean)
    if (typeof patch.autoTitle === "boolean") {
      setProp(target, "autoTitle", b.booleanLiteral(patch.autoTitle));
    }

    // contentSource ("ai" or "human")
    if (patch.contentSource != null && (patch.contentSource === "ai" || patch.contentSource === "human")) {
      setProp(target, "contentSource", makeStringNode(patch.contentSource, usesTemplate));
    }

    // rating (number)
    if (typeof patch.rating === "number") {
      const n = Number.isFinite(patch.rating) ? patch.rating : undefined;
      if (n != null) setProp(target, "rating", b.numericLiteral(n));
    }

    // audioSrc (string - for picture show audio, stored in gallery for future use)
    if (patch.audioSrc != null) {
      if (patch.audioSrc === "" || patch.audioSrc === null) {
        // Remove audioSrc if cleared
        const existing = getProp(target, "audioSrc");
        if (existing) {
          target.properties = target.properties.filter((p) => p !== existing);
        }
      } else {
        setProp(target, "audioSrc", makeStringNode(patch.audioSrc, usesTemplate));
      }
    }

    // visibility ("hidden" to hide; falsy/empty -> remove prop to show)
    if (Object.prototype.hasOwnProperty.call(patch, "visibility")) {
      const v = patch.visibility;
      const existing = getProp(target, "visibility");
      if (!v) {
        if (existing) {
          target.properties = target.properties.filter((p) => p !== existing);
        }
      } else {
        setProp(target, "visibility", makeStringNode(String(v), usesTemplate));
      }
    }

    // NOTE: availableSeries is NOT stored in .mjs files.
    // Edition tier assignments (Chronicle/Legend) are stored in seriesRegistry.json via the seriesRegistry function.
    // This separation ensures edition assignments are protected from accidental overwrites.

    // noSketch (boolean - explicitly exclude from default sketch tier)
    if (Object.prototype.hasOwnProperty.call(patch, "noSketch")) {
      const existing = getProp(target, "noSketch");
      if (!patch.noSketch) {
        // Remove noSketch prop if false/undefined
        if (existing) {
          target.properties = target.properties.filter((p) => p !== existing);
        }
      } else {
        setProp(target, "noSketch", b.booleanLiteral(true));
      }
    }

    // status ("active" | "retired" - archival lifecycle)
    // Note: "removed" is handled earlier with full entry deletion
    if (Object.prototype.hasOwnProperty.call(patch, "status")) {
      const v = patch.status;
      const existing = getProp(target, "status");
      if (!v || v === "active") {
        // Remove status prop if active (default)
        if (existing) {
          target.properties = target.properties.filter((p) => p !== existing);
        }
      } else if (v === "retired") {
        setProp(target, "status", makeStringNode(v, usesTemplate));
      }
    }

    // NOTE: editionsSold is NOT stored in .mjs files.
    // Edition state is stored in editionState.json via the editionState Netlify function.
    // This separation protects transactional state from accidental overwrites.

    // write back
    const output = recast.print(ast, { quote: "double" }).code;
    console.log('[updateGalleryItem] Writing to', absPath, 'for id:', id);
    console.log('[updateGalleryItem] Patch applied:', JSON.stringify(patch));
    await fs.writeFile(absPath, output, "utf8");
    console.log('[updateGalleryItem] File written successfully');

    // Generate visual fingerprint for similarity detection
    try {
      const srcProp = getProp(target, "src");
      const imageUrl = getStringValue(srcProp?.value);
      if (imageUrl && imageUrl.startsWith("http")) {
        // Run visual indexing in background (don't block response)
        visualIndex.indexImage(id, imageUrl, datasetPath)
          .then(result => {
            if (result.success) {
              console.log(`[updateGalleryItem] Indexed visual hash for ${id}`);
            } else {
              console.warn(`[updateGalleryItem] Failed to index ${id}:`, result.error);
            }
          })
          .catch(err => console.warn("[updateGalleryItem] Visual index error:", err.message));
      }
    } catch (vizErr) {
      console.warn("[updateGalleryItem] Visual indexing setup error:", vizErr.message);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, datasetPath, id }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: String((err && err.stack) || err) };
  }
};
