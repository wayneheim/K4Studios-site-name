// netlify/functions/updateGalleryItem.js
const fs = require("fs/promises");
const path = require("path");
const recast = require("recast");
const babelParser = require("@babel/parser");

/* ===== new: path guards & helpers ===== */
const ALLOWED_ROOTS = ["src/data/Galleries", "src/pages/Other"]; // support both trees
const toPosix = (p = "") => String(p).replace(/\\/g, "/");
const hasTraversal = (p = "") => p.split(/[\\/]+/).some(seg => seg === "..");

function resolveDatasetAbsolute(datasetPath) {
  const rel = toPosix(String(datasetPath || "").replace(/^\//, "")); // strip leading "/"
  if (!rel || hasTraversal(rel) || !rel.endsWith(".mjs")) {
    throw new Error("Invalid datasetPath");
  }
  const ok = ALLOWED_ROOTS.some(root => rel.startsWith(toPosix(root) + "/"));
  if (!ok) throw new Error("Dataset must be under src/data/Galleries or src/pages/Other");
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

    // find object with matching id
    const items = arrNode.elements || [];
    let target = null;
    for (const el of items) {
      if (el?.type !== "ObjectExpression") continue;
      const idProp = getProp(el, "id");
      const idVal = getStringValue(idProp?.value);
      if (idVal === id) { target = el; break; }
    }
    if (!target) return { statusCode: 404, body: `Item id ${id} not found in ${datasetPath}` };

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

    // rating (number)
    if (typeof patch.rating === "number") {
      const n = Number.isFinite(patch.rating) ? patch.rating : undefined;
      if (n != null) setProp(target, "rating", b.numericLiteral(n));
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

    // write back
    const output = recast.print(ast, { quote: "double" }).code;
    await fs.writeFile(absPath, output, "utf8");

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
