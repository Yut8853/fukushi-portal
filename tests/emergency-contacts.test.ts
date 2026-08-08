import assert from "node:assert/strict";
import test from "node:test";
import { emergencyContacts } from "../lib/emergency-contacts";

test("緊急バナーの主要連絡先はデータのdisplayModeで4件に制御する", () => {
  const primaryIds = emergencyContacts
    .filter((contact) => contact.displayMode === "primary")
    .map((contact) => contact.id);

  assert.deepEqual(primaryIds, [
    "police-emergency",
    "fire-ambulance-emergency",
    "child-abuse",
    "dv-consultation",
  ]);
  assert.equal(emergencyContacts.filter((contact) => contact.displayMode === "detail").length, 5);
});
