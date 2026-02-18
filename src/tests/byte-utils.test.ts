/**
 * Tests for byte-utils module
 */
import { parseHexToBytes, bytesToHex, toggleBit, isBitSet, normalizeHex, isValidHex } from "@/utils/byte-utils";

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function runByteUtilsTests() {
  // Test parseHexToBytes
  const bytes1 = parseHexToBytes("E0F8C8", 3);
  expect(bytes1.length === 3, "parseHexToBytes should return 3 bytes");
  expect(bytes1[0] === 0xE0, "first byte should be 0xE0");
  expect(bytes1[1] === 0xF8, "second byte should be 0xF8");
  expect(bytes1[2] === 0xC8, "third byte should be 0xC8");

  // Test with padding
  const bytes2 = parseHexToBytes("FF", 3);
  expect(bytes2.length === 3, "should pad to 3 bytes");
  expect(bytes2[0] === 0xFF, "first byte should be 0xFF");
  expect(bytes2[1] === 0x00, "second byte should be 0x00 (padded)");
  expect(bytes2[2] === 0x00, "third byte should be 0x00 (padded)");

  // Test bytesToHex
  const hex1 = bytesToHex([0xE0, 0xF8, 0xC8]);
  expect(hex1 === "E0F8C8", "bytesToHex should return E0F8C8");

  const hex2 = bytesToHex([0x00, 0x01, 0x02]);
  expect(hex2 === "000102", "bytesToHex should pad with zeros");

  // Test toggleBit
  const toggled1 = toggleBit(0x00, 0x80);
  expect(toggled1 === 0x80, "toggle bit 7 on 0x00 should give 0x80");

  const toggled2 = toggleBit(0x80, 0x80);
  expect(toggled2 === 0x00, "toggle bit 7 on 0x80 should give 0x00");

  // Test isBitSet
  expect(isBitSet(0x80, 0x80) === true, "bit 7 should be set in 0x80");
  expect(isBitSet(0x00, 0x80) === false, "bit 7 should not be set in 0x00");
  expect(isBitSet(0xE0, 0x20) === true, "bit 5 should be set in 0xE0");

  // Test normalizeHex
  const normalized1 = normalizeHex("e0 f8 c8");
  expect(normalized1 === "E0F8C8", "should remove spaces and uppercase");

  const normalized2 = normalizeHex("  9f33  ");
  expect(normalized2 === "9F33", "should trim and uppercase");

  // Test isValidHex
  expect(isValidHex("E0F8C8") === true, "E0F8C8 is valid hex");
  expect(isValidHex("9F33") === true, "9F33 is valid hex");
  expect(isValidHex("ZZ") === false, "ZZ is not valid hex");
  expect(isValidHex("ABC") === false, "ABC has odd length (invalid)");
  expect(isValidHex("ABCD") === true, "ABCD is valid hex");

  return "All byte-utils tests passed ✅";
}

// Auto-run in dev mode
if (import.meta && (import.meta as any).hot) {
  try {
    console.log(runByteUtilsTests());
  } catch (e) {
    console.error("byte-utils tests failed", e);
  }
}
