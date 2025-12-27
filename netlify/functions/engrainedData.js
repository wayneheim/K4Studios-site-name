// netlify/functions/engrainedData.js
// API for managing Engrained Series data (inventory, linking, metadata sync)
const fs = require("fs/promises");
const path = require("path");
const recast = require("recast");
const babelParser = require("@babel/parser");

const ENGRAINED_PATH = "src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs";

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

function makeStringNode(str) {
  // Use template literal for strings with special chars
  const s = String(str);
  if (s.includes('"') || s.includes("'") || s.includes('\n')) {
    return b.templateLiteral([b.templateElement({ raw: s, cooked: s }, true)], []);
  }
  return b.stringLiteral(s);
}

function makeNumberNode(num) {
  return b.numericLiteral(Number(num) || 0);
}

function makeObjectNode(obj) {
  const props = [];
  for (const [key, value] of Object.entries(obj)) {
    const keyNode = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? b.identifier(key) : b.stringLiteral(key);
    let valueNode;
    if (typeof value === "number") {
      valueNode = makeNumberNode(value);
    } else if (typeof value === "string") {
      valueNode = makeStringNode(value);
    } else if (typeof value === "boolean") {
      valueNode = b.booleanLiteral(value);
    } else if (value === null) {
      valueNode = b.nullLiteral();
    } else if (Array.isArray(value)) {
      valueNode = b.arrayExpression(value.map(v => makeStringNode(String(v))));
    } else if (typeof value === "object") {
      valueNode = makeObjectNode(value);
    } else {
      valueNode = b.stringLiteral(String(value));
    }
    props.push(b.objectProperty(keyNode, valueNode));
  }
  return b.objectExpression(props);
}

function getProp(obj, name) {
  return obj.properties.find((p) => {
    const k = p.key;
    return (k.type === "Identifier" && k.name === name) || (k.type === "StringLiteral" && k.value === name);
  });
}

function setProp(obj, name, valueNode) {
  const existing = getProp(obj, name);
  if (existing) {
    existing.value = valueNode;
  } else {
    const keyNode = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? b.identifier(name) : b.stringLiteral(name);
    obj.properties.push(b.objectProperty(keyNode, valueNode));
  }
}

function parseObjectValue(node) {
  if (!node) return null;
  if (node.type === "StringLiteral" || node.type === "TemplateLiteral") {
    return getStringValue(node);
  }
  if (node.type === "NumericLiteral") {
    return node.value;
  }
  if (node.type === "BooleanLiteral") {
    return node.value;
  }
  if (node.type === "NullLiteral") {
    return null;
  }
  if (node.type === "ArrayExpression") {
    return node.elements.map(e => parseObjectValue(e)).filter(v => v !== null);
  }
  if (node.type === "ObjectExpression") {
    const obj = {};
    for (const prop of node.properties) {
      const key = prop.key.name || prop.key.value;
      obj[key] = parseObjectValue(prop.value);
    }
    return obj;
  }
  return null;
}

exports.handler = async (event) => {
  const absPath = path.join(process.cwd(), ENGRAINED_PATH);
  
  // GET: Fetch all engrained data or list galleries
  if (event.httpMethod === "GET") {
    try {
      const action = event.queryStringParameters?.action;
      const imageId = event.queryStringParameters?.imageId;
      
      // Action: listGalleries - return list of available gallery .mjs files
      if (action === "listGalleries") {
        const galleriesRoot = path.join(process.cwd(), "src/data/Galleries");
        const galleries = [];
        
        async function scanDir(dir, relativePath = "") {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
              
              if (entry.isDirectory()) {
                await scanDir(fullPath, relPath);
              } else if (entry.name.endsWith(".mjs") && !entry.name.includes("copy")) {
                galleries.push({
                  path: `src/data/Galleries/${relPath}`,
                  label: relPath.replace(/\.mjs$/, "").replace(/\//g, " / ").replace(/-/g, " ")
                });
              }
            }
          } catch (err) {
            // Directory doesn't exist or isn't readable
          }
        }
        
        await scanDir(galleriesRoot);
        
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
          body: JSON.stringify({ galleries: galleries.sort((a, b) => a.label.localeCompare(b.label)) })
        };
      }
      
      const code = await fs.readFile(absPath, "utf8");
      const ast = parse(code);
      
      let items = [];
      recast.visit(ast, {
        visitVariableDeclarator(p) {
          if (p.node.id.name === "galleryData" && p.node.init?.type === "ArrayExpression") {
            items = p.node.init.elements.map(elem => {
              if (elem.type !== "ObjectExpression") return null;
              const obj = {};
              for (const prop of elem.properties) {
                const key = prop.key.name || prop.key.value;
                obj[key] = parseObjectValue(prop.value);
              }
              return obj;
            }).filter(Boolean);
            return false;
          }
          this.traverse(p);
        }
      });
      
      // If specific imageId requested, return just that item
      if (imageId) {
        const item = items.find(i => i.id === imageId);
        if (!item) {
          return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
          body: JSON.stringify({ item })
        };
      }
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ items })
      };
    } catch (err) {
      console.error("[engrainedData GET]", err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }
  
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action, imageId, patch } = body;
    
    if (!action) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing action" }) };
    }

    const code = await fs.readFile(absPath, "utf8");
    const ast = parse(code);

    // Find galleryData array
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
    
    if (!arrNode) {
      return { statusCode: 400, body: JSON.stringify({ error: "Could not find galleryData array" }) };
    }

    // Find target item by id
    const items = arrNode.elements || [];
    let target = null;
    for (const el of items) {
      if (el?.type !== "ObjectExpression") continue;
      const idProp = getProp(el, "id");
      const idVal = getStringValue(idProp?.value);
      if (idVal === imageId) {
        target = el;
        break;
      }
    }

    if (action === "updateItem") {
      // Update a single item with patch data
      if (!imageId || !patch) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing imageId or patch" }) };
      }
      
      if (!target) {
        return { statusCode: 404, body: JSON.stringify({ error: `Item ${imageId} not found` }) };
      }

      // Apply patch fields
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue; // Skip undefined
        
        let valueNode;
        if (value === null) {
          // Remove the property
          const propIdx = target.properties.findIndex(p => 
            (p.key.name || p.key.value) === key
          );
          if (propIdx !== -1) {
            target.properties.splice(propIdx, 1);
          }
          continue;
        } else if (typeof value === "number") {
          valueNode = makeNumberNode(value);
        } else if (typeof value === "boolean") {
          valueNode = b.booleanLiteral(value);
        } else if (Array.isArray(value)) {
          valueNode = b.arrayExpression(value.map(v => makeStringNode(String(v))));
        } else if (typeof value === "object") {
          valueNode = makeObjectNode(value);
        } else {
          valueNode = makeStringNode(String(value));
        }
        
        setProp(target, key, valueNode);
      }
      
      // Write back
      const output = recast.print(ast).code;
      await fs.writeFile(absPath, output, "utf8");
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, imageId })
      };
    }
    
    if (action === "setInventory") {
      // Set inventory data for an item
      // inventory: { printed: number, sold: number, inStock: number }
      if (!imageId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing imageId" }) };
      }
      
      if (!target) {
        return { statusCode: 404, body: JSON.stringify({ error: `Item ${imageId} not found` }) };
      }
      
      const { printed = 0, sold = 0 } = body;
      const inStock = Math.max(0, printed - sold);
      
      const inventoryNode = makeObjectNode({
        printed: Number(printed) || 0,
        sold: Number(sold) || 0,
        inStock
      });
      
      setProp(target, "inventory", inventoryNode);
      
      // Write back
      const output = recast.print(ast).code;
      await fs.writeFile(absPath, output, "utf8");
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, imageId, inventory: { printed, sold, inStock } })
      };
    }
    
    if (action === "linkMasterImage") {
      // Link an Engrained image to its master gallery image
      // { linkedImageId: "i-xxx", linkedGalleryPath: "/Galleries/..." }
      if (!imageId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing imageId" }) };
      }
      
      if (!target) {
        return { statusCode: 404, body: JSON.stringify({ error: `Item ${imageId} not found` }) };
      }
      
      const { linkedImageId, linkedGalleryPath } = body;
      
      if (linkedImageId) {
        setProp(target, "linkedImageId", makeStringNode(linkedImageId));
      }
      if (linkedGalleryPath) {
        setProp(target, "linkedGalleryPath", makeStringNode(linkedGalleryPath));
      }
      
      // Write back
      const output = recast.print(ast).code;
      await fs.writeFile(absPath, output, "utf8");
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, imageId, linkedImageId, linkedGalleryPath })
      };
    }
    
    if (action === "unlinkMasterImage") {
      // Remove the link from an Engrained image to its master
      if (!imageId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing imageId" }) };
      }
      
      if (!target) {
        return { statusCode: 404, body: JSON.stringify({ error: `Item ${imageId} not found` }) };
      }
      
      // Set linkedImageId and linkedGalleryPath to null
      setProp(target, "linkedImageId", b.nullLiteral());
      setProp(target, "linkedGalleryPath", b.nullLiteral());
      
      // Write back
      const output = recast.print(ast).code;
      await fs.writeFile(absPath, output, "utf8");
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, imageId, unlinked: true })
      };
    }
    
    if (action === "syncMetadata") {
      // Sync metadata from master image to Engrained image
      // patch contains: title, description, alt, keywords, story, notes
      if (!imageId || !patch) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing imageId or patch" }) };
      }
      
      if (!target) {
        return { statusCode: 404, body: JSON.stringify({ error: `Item ${imageId} not found` }) };
      }
      
      // Apply only allowed metadata fields
      const allowedFields = ["title", "description", "alt", "keywords", "story", "notes"];
      for (const field of allowedFields) {
        if (patch[field] !== undefined) {
          let valueNode;
          if (field === "keywords" && Array.isArray(patch[field])) {
            valueNode = b.arrayExpression(patch[field].map(v => makeStringNode(String(v))));
          } else {
            valueNode = makeStringNode(String(patch[field] || ""));
          }
          setProp(target, field, valueNode);
        }
      }
      
      // Write back
      const output = recast.print(ast).code;
      await fs.writeFile(absPath, output, "utf8");
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, imageId })
      };
    }
    
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    
  } catch (err) {
    console.error("[engrainedData POST]", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
