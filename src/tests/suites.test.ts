import { strictEqual } from "node:assert/strict";
import { describe, test } from "node:test";
import { runByteUtilsTests } from "./byte-utils.test";
import { runCryptoTests, runTagBuilderTests } from "./crypto.test";
import { runTlvEditTests } from "./tlv-edit.test";

describe("payment tool domain suites", () => {
  test("TLV editing, decoding, EMV checks, and configuration parsing", () => {
    strictEqual(runTlvEditTests(), "All tlv-edit tests passed");
  });

  test("cryptography, PIN, converters, registry, and calculator behavior", () => {
    strictEqual(runCryptoTests(), "All crypto and registry tests passed");
  });

  test("custom bitfield decoder builder behavior", () => {
    strictEqual(runTagBuilderTests(), "All tag builder tests passed");
  });

  test("byte conversion primitives", () => {
    strictEqual(runByteUtilsTests(), "All byte-utils tests passed ✅");
  });
});
