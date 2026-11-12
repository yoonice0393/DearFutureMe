import { test } from "node:test";
import assert from "node:assert/strict";

import { stampLabel } from "../src/lib/stamp.ts";

test("envelope stamp counts months, not calendar years", () => {
  const written = new Date(2026, 10, 13); // Nov 13, 2026
  assert.equal(stampLabel(written, new Date(2027, 4, 13)), "6 MO"); // was "1 YR"
  assert.equal(stampLabel(written, new Date(2026, 11, 13)), "1 MO");
  assert.equal(stampLabel(written, new Date(2027, 10, 13)), "1 YR");
  assert.equal(stampLabel(written, new Date(2036, 10, 13)), "10 YR");
  assert.equal(stampLabel(written, new Date(2026, 10, 20)), "SOON");
  assert.equal(stampLabel(new Date(2026, 11, 31), new Date(2027, 0, 1)), "SOON"); // was "1 YR"
});
