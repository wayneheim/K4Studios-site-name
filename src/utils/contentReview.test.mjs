import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { getContentReviewState, getManualCopyPatch, toggleContentReview, isOimImage } from "./contentReview.mjs";

test('chapter OIM badges follow the EditorPro classification for the current gallery', () => {
  const registry = { images: {
    'i-oim:/src/data/Galleries/Test.mjs': { classification: 'oim', scout: true },
    'i-scout:/src/data/Galleries/Test.mjs': { classification: 'scout' },
    'i-oim:/src/data/Galleries/Other.mjs': { classification: 'scout' },
  } };
  assert.equal(isOimImage('i-oim', '/Galleries/Test', registry), true);
  assert.equal(isOimImage('i-oim', '/src/data/Galleries/Test.mjs', registry), true);
  assert.equal(isOimImage('i-oim-sketch', '/Galleries/Test', registry), true);
  assert.equal(isOimImage('i-oim', '/Galleries/Shared', registry), true);
  assert.equal(isOimImage('i-oim', '/Galleries/Other', registry), false);
  assert.equal(isOimImage('i-scout', '/Galleries/Test', registry), false);
  assert.equal(isOimImage('i-untagged', '/Galleries/Test', registry), false);
  assert.equal(isOimImage('', '/Galleries/Test', registry), false);
  assert.equal(isOimImage('i-oim', '/Galleries/Test', null), false);
});

test("manual edits to any copy field mark the record Human", () => {
  for (const field of ["title", "alt", "description", "story", "keywords", "tags", "collectorNotes", "notes"]) {
    assert.deepEqual(getManualCopyPatch([field]), { contentSource: "human" }, field);
  }
});

test("rating, visibility, and other non-copy changes preserve AI provenance", () => {
  assert.deepEqual(getManualCopyPatch(["rating", "visibility", "status", "availableSeries"]), {});
  assert.deepEqual(getManualCopyPatch([]), {});
});

test("Scout can be enabled on an OIM without removing OIM", () => {
  const review = toggleContentReview({ classification: "oim" }, "scout");
  assert.deepEqual(getContentReviewState(review), { isOim: true, isScout: true });
});

test("OIM can be reactivated on an existing Scout record", () => {
  const review = toggleContentReview({ classification: "scout" }, "oim");
  assert.deepEqual(getContentReviewState(review), { isOim: true, isScout: true });
});

test("each review flag can be switched off independently", () => {
  const both = { classification: "oim", scout: true };
  assert.deepEqual(toggleContentReview(both, "scout"), { classification: "oim" });
  assert.deepEqual(toggleContentReview(both, "oim"), { classification: "scout" });
  assert.deepEqual(toggleContentReview({ classification: "scout" }, "scout"), { classification: null });
  assert.deepEqual(toggleContentReview({ classification: "oim" }, "oim"), { classification: null });
});

test("existing records still resolve their original review state", () => {
  assert.deepEqual(getContentReviewState(null), { isOim: false, isScout: false });
  assert.deepEqual(getContentReviewState({ classification: "oim" }), { isOim: true, isScout: false });
  assert.deepEqual(getContentReviewState({ classification: "scout" }), { isOim: false, isScout: true });
});

async function registryFixture() {
  // Run the real endpoint with in-memory storage, leaving the user's registry untouched.
  let saved = JSON.stringify({ images: { "other:/gallery.mjs": { classification: "scout" } } });
  const module = { exports: {} };
  const source = await readFile(new URL("../../netlify/functions/contentClassificationRegistry.cjs", import.meta.url), "utf8");
  vm.runInNewContext(source, {
    exports: module.exports,
    process: { cwd: () => "/fixture" },
    require(name) {
      if (name === "path") return path;
      if (name === "fs/promises") return {
        readFile: async () => saved,
        writeFile: async (_file, contents) => { saved = contents; },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return async (patch) => {
    const result = await module.exports.handler(patch === undefined
      ? { httpMethod: "GET" }
      : { httpMethod: "POST", body: JSON.stringify({ imageId: "test", galleryPath: "/gallery.mjs", ...patch }) });
    return { status: result.statusCode, body: JSON.parse(result.body) };
  };
}

test("combined OIM and Scout survive saving and reloading the registry", async () => {
  const request = await registryFixture();
  assert.equal((await request({ classification: "oim", scout: true })).status, 200);
  const { body } = await request();
  assert.deepEqual(getContentReviewState(body.images["test:/gallery.mjs"]), { isOim: true, isScout: true });
  assert.deepEqual(body.images["other:/gallery.mjs"], { classification: "scout" });
  assert.ok(body.images["test:/gallery.mjs"].updatedAt);
});

test("clearing Scout or the entire review removes the saved adjustment flag", async () => {
  const request = await registryFixture();
  await request({ classification: "oim", scout: true });
  await request({ classification: "oim", scout: false });
  assert.deepEqual(getContentReviewState((await request()).body.images["test:/gallery.mjs"]), { isOim: true, isScout: false });
  await request({ classification: null });
  assert.equal((await request()).body.images["test:/gallery.mjs"], undefined);
});

test("invalid Scout flags are rejected without changing the registry", async () => {
  const request = await registryFixture();
  const before = (await request()).body;
  assert.equal((await request({ classification: "oim", scout: "true" })).status, 400);
  assert.deepEqual((await request()).body, before);
});
