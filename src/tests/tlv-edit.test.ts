import { encodeLength, editTlvValue } from "@/utils/tlv/tlv-edit";
import { parseTlv } from "@/utils/tlv/tlv-parser";

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// A super light ad-hoc test harness (since no formal runner is configured yet)
export function runTlvEditTests() {
  // encodeLength tests
  expect(encodeLength(0) === "00", "encodeLength(0)");
  expect(encodeLength(0x7f) === "7F", "encodeLength(0x7f)");
  expect(encodeLength(0x80) === "8180", "encodeLength(0x80)");
  expect(encodeLength(0x1234) === "821234", "encodeLength(0x1234)");

  // Primitive edit simple
  const raw = "9F3303E0F8C8"; // tag 9F33 len 03 value E0F8C8
  const updated = editTlvValue(raw, "9F33", "010203");
  expect(updated === "9F3303010203", "edit primitive same size");
  const parsed = parseTlv(updated);
  expect(parsed.elements[0].value === "010203", "parsed updated value");

  // Constructed nesting: E0 (constructed) containing 9F33 - we simulate by manual build
  // E0 with child 9F33 len 03 value AABBCC -> child raw 9F3303AABBCC
  // E0 length = 1 (tag) + 1(length) + 3(value) = 5 bytes child raw actually 1+1+3=5 bytes => hex len 0x05
  const constructed = "E0059F3303AABBCC"; // E0 05 <child>
  const updatedNested = editTlvValue(constructed, "E0:9F33", "010203");
  // new child raw 9F3303010203 (same length) so parent length should remain 0x05
  expect(
    updatedNested === "E0059F3303010203",
    "constructed parent unchanged length when child size same"
  );

  // Change size to force parent length change
  const updatedNestedGrow = editTlvValue(constructed, "E0:9F33", "01020304");
  // child now len 04 -> child raw 9F330401020304 (tag 2 + len 2 + value 8 = 12 hex chars => 6 bytes)
  // parent now length 6 bytes -> 0x06 so raw should be E006 + child raw
  expect(
    updatedNestedGrow === "E0069F330401020304",
    "constructed parent length recalculated after growth"
  );

  // Validate re-parsing updatedNestedGrow
  const reparsed = parseTlv(updatedNestedGrow);
  expect(reparsed.elements[0].length === 6, "parent new length");
  expect(
    reparsed.elements[0].children &&
      reparsed.elements[0].children[0].value === "01020304",
    "child new value after growth"
  );

  return "All tlv-edit tests passed";
}

// Auto-run when imported in dev (optional)
if (import.meta && (import.meta as any).hot) {
  try {
    console.log(runTlvEditTests());
  } catch (e) {
    console.error("tlv-edit tests failed", e);
  }
}
