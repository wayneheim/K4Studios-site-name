import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTurboPatch,
  buildTurboText,
  getChangedTurboFields,
  parseTurboText,
} from "./galleryEditorTurbo.mjs";

const record = {
  title: "War Color",
  story: "Saved story",
  description: "Saved description",
  alt: "Hand-written alt, kept verbatim.",
  tags: ["war art", "history"],
  collectorNotes: "Saved collector notes",
};

test("an untouched synchronized block has no changed fields", () => {
  const block = buildTurboText(record);
  assert.deepEqual([...getChangedTurboFields(block, block)], []);
});

test("only the field edited in the Turbo block is marked changed", () => {
  const baseline = buildTurboText(record);
  const edited = baseline.replace("Saved story", "A new story");
  assert.deepEqual([...getChangedTurboFields(baseline, edited)], ["story"]);
});

test("a Story-only save payload cannot overwrite untouched fields", () => {
  const edited = { ...record, story: "A main-form Story edit" };
  assert.deepEqual(buildTurboPatch(edited, new Set(["story"])), {
    story: "A main-form Story edit",
  });
});

test("an explicit empty section is a change but a missing section is skipped", () => {
  const baseline = buildTurboText(record);
  const explicitClear = baseline.replace("Hand-written alt, kept verbatim.", "");
  assert.deepEqual([...getChangedTurboFields(baseline, explicitClear)], ["alt"]);
  assert.deepEqual([...getChangedTurboFields(baseline, "")], []);
});

test("a rebuilt block reflects the supplied record rather than earlier text", () => {
  const recordB = { ...record, alt: "Record B alt", story: "Record B story" };
  const parsed = parseTurboText(buildTurboText(recordB));
  assert.equal(parsed.alt, "Record B alt");
  assert.equal(parsed.story, "Record B story");
});
