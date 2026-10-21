import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { parseIso8583 } from "@/utils/iso8583";

// 0100 packed by emv-kernel iso8583.Pack() with the fields contactless/accept sends.
const kernel0100 =
  "30313030723c468020e082003136353535353535353535353535343434343030303030303030303030303030313030303130323130383438303230303030303130383438303231303231333031323539393930373230303130303334353535353535353535353535343434343d33303132323031303030303030303030305445524d303030314d45524348414e5430303030303031454d56204b45524e454c2044454d4f202020202020202020202020202020202020202020202020203735323030359f2602aabb";

test("emv-kernel 0100 with DE 18 and DE 23 parses field by field", () => {
  const result = parseIso8583(kernel0100);
  deepStrictEqual(result.errors, []);
  const value = (id: number) => result.fields[id]?.value;
  strictEqual(value(18), "5999");
  strictEqual(value(22), "072");
  strictEqual(value(23), "001");
  strictEqual(value(35), "5555555555554444=30122010000000000");
  strictEqual(value(41), "TERM0001");
  strictEqual(value(49), "752");
  strictEqual(result.fields[55]?.value.toUpperCase().replace(/\s/g, ""), "9F2602AABB");
});

test("field 55 of an emv-kernel 0100 decodes into its EMV tags", async () => {
  const { iccDataRows } = await import("@/components/ui/iso-builder/iso-display");
  const field55 = parseIso8583(kernel0100).fields[55]?.value ?? "";
  const rows = iccDataRows(field55);
  strictEqual(rows.length, 1);
  strictEqual(rows[0]?.element.tag, "9F26");
  strictEqual(rows[0]?.element.value, "AABB");
  deepStrictEqual(iccDataRows("ZZ"), []);
});
