import { deepStrictEqual } from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDeepLink } from "@/utils/deep-link";

describe("deep-link fragment parsing", () => {
  test("reads a valid link for each supported tool", () => {
    deepStrictEqual(parseDeepLink("?tool=tlv", "#input=9F2608AABBCCDDEEFF0011"), {
      kind: "ok",
      link: { toolId: "tlv", input: "9F2608AABBCCDDEEFF0011" },
    });
    deepStrictEqual(parseDeepLink("?tool=iso8583", "#input=30313030%2070"), {
      kind: "ok",
      link: { toolId: "iso8583", input: "30313030 70" },
    });
    deepStrictEqual(parseDeepLink("?tool=apdu&x=1", "#foo=bar&input=00A40400"), {
      kind: "ok",
      link: { toolId: "apdu", input: "00A40400" },
    });
  });

  test("keeps + literal so base64 survives", () => {
    deepStrictEqual(parseDeepLink("?tool=tlv", "#input=nyYI+qu7zA=="), {
      kind: "ok",
      link: { toolId: "tlv", input: "nyYI+qu7zA==" },
    });
  });

  test("returns none when the fragment has no input", () => {
    deepStrictEqual(parseDeepLink("?tool=tlv", ""), { kind: "none" });
    deepStrictEqual(parseDeepLink("?tool=tlv", "#"), { kind: "none" });
    deepStrictEqual(parseDeepLink("?tool=tlv", "#other=1"), { kind: "none" });
    deepStrictEqual(parseDeepLink("", "#inputs=1"), { kind: "none" });
  });

  test("rejects a missing or unknown tool", () => {
    deepStrictEqual(parseDeepLink("", "#input=9F26"), {
      kind: "error",
      error: "unknown-tool",
    });
    deepStrictEqual(parseDeepLink("?tool=emv-config", "#input=9F26"), {
      kind: "error",
      error: "unknown-tool",
    });
  });

  test("rejects malformed percent-encoding", () => {
    deepStrictEqual(parseDeepLink("?tool=tlv", "#input=9F%2"), {
      kind: "error",
      error: "malformed-encoding",
    });
    deepStrictEqual(parseDeepLink("?tool=tlv", "#input=%E0%A4%A"), {
      kind: "error",
      error: "malformed-encoding",
    });
  });

  test("rejects an empty input", () => {
    deepStrictEqual(parseDeepLink("?tool=tlv", "#input="), {
      kind: "error",
      error: "empty-input",
    });
    deepStrictEqual(parseDeepLink("?tool=tlv", "#input=%20%20"), {
      kind: "error",
      error: "empty-input",
    });
  });
});
