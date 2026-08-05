import {
  encodeLength,
  editTlvValue,
  deleteTlvElement,
  insertTlvElement,
} from "@/utils/tlv/tlv-edit";
import { parseTlv } from "@/utils/tlv/tlv-parser";
import { bitfieldSpecs, describeBitfield } from "@/utils/tlv/bitfield-specs";
import {
  decodeCvmList,
  decodeDol,
  decodeTrack2,
  luhnCheck,
  maskPan,
} from "@/utils/tlv/payment-decoders";
import { decodeApdu, decodeStatusWord } from "@/utils/apdu/apdu-decoder";
import { computeCapkChecksum, validateCapk } from "@/utils/emv/capk-validator";
import { getCountryByNumeric } from "@/utils/emv/country-codes";
import { lintTlv } from "@/utils/emv/tlv-lint";
import {
  collectConfigTags,
  lintEmvConfig,
  parseEmvConfig,
} from "@/utils/emv/config-parser";

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, message: string) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`Expected to throw: ${message}`);
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

  // Constructed nesting: E0 (constructed) containing 9F33.
  // Child raw = 9F33 03 AABBCC -> 2 (tag) + 1 (length) + 3 (value) = 6 bytes,
  // so the E0 length field is 0x06. (It is 0x06 and not 0x05 because 9F33 is a
  // two-byte tag.)
  const constructed = "E0069F3303AABBCC"; // E0 06 <child>
  const preflight = parseTlv(constructed);
  expect(
    preflight.errors.length === 0 &&
      preflight.elements[0].children?.length === 1,
    "constructed fixture parses with one child"
  );

  const updatedNested = editTlvValue(constructed, "E0:9F33", "010203");
  // new child raw 9F3303010203 (same length) so parent length should remain 0x06
  expect(
    updatedNested === "E0069F3303010203",
    "constructed parent unchanged length when child size same"
  );

  // Change size to force parent length change
  const updatedNestedGrow = editTlvValue(constructed, "E0:9F33", "01020304");
  // child now len 04 -> child raw 9F330401020304 (tag 2 + len 1 + value 4 = 7 bytes)
  // parent now length 7 bytes -> 0x07 so raw should be E007 + child raw
  expect(
    updatedNestedGrow === "E0079F330401020304",
    "constructed parent length recalculated after growth"
  );

  // Validate re-parsing updatedNestedGrow
  const reparsed = parseTlv(updatedNestedGrow);
  expect(reparsed.elements[0].length === 7, "parent new length");
  expect(
    reparsed.elements[0].children &&
      reparsed.elements[0].children[0].value === "01020304",
    "child new value after growth"
  );

  // --- delete ---------------------------------------------------------------
  const twoTop = "9F3303E0F8C89C0100";
  expect(
    deleteTlvElement(twoTop, "9C") === "9F3303E0F8C8",
    "delete top-level element"
  );
  expect(
    deleteTlvElement(twoTop, "9F33") === "9C0100",
    "delete first top-level element"
  );

  // Deleting a child must shrink the parent's length field.
  // Children: 9F3303AABBCC (6 bytes) + 9C0100 (3 bytes) = 9 -> E0 09.
  const parentTwoKids = "E0099F3303AABBCC9C0100";
  expect(
    deleteTlvElement(parentTwoKids, "E0:9C") === "E0069F3303AABBCC",
    "delete nested child recalculates parent length"
  );
  const afterDelete = parseTlv(deleteTlvElement(parentTwoKids, "E0:9C"));
  expect(afterDelete.elements[0].length === 6, "parent length after delete");
  expectThrows(
    () => deleteTlvElement(twoTop, "9F99"),
    "delete of a missing path"
  );

  // --- insert ---------------------------------------------------------------
  expect(
    insertTlvElement("9F3303E0F8C8", undefined, "9C", "00") ===
      "9F3303E0F8C89C0100",
    "insert at top level appends"
  );
  expect(
    insertTlvElement("", undefined, "9F66", "24804000") === "9F660424804000",
    "insert into an empty payload"
  );
  expect(
    insertTlvElement("E0069F3303AABBCC", "E0", "9C", "00") ===
      "E0099F3303AABBCC9C0100",
    "insert into constructed tag recalculates parent length"
  );
  const afterInsert = parseTlv(
    insertTlvElement("E0069F3303AABBCC", "E0", "9C", "00")
  );
  expect(afterInsert.elements[0].length === 9, "parent length after insert");
  expect(
    afterInsert.elements[0].children?.length === 2,
    "parent has two children after insert"
  );
  expectThrows(
    () => insertTlvElement("9C0100", undefined, "9C", "00"),
    "duplicate tag in the same container"
  );
  expectThrows(
    () => insertTlvElement("9C0100", undefined, "9F", "0"),
    "odd-length value"
  );
  expectThrows(
    () => insertTlvElement("9C0100", "9C", "9F66", "00"),
    "insert into a primitive tag"
  );

  // Round trip: insert then delete returns the original payload.
  const original = "9F3303E0F8C8";
  expect(
    deleteTlvElement(
      insertTlvElement(original, undefined, "9C", "00"),
      "9C"
    ) === original,
    "insert then delete round trips"
  );

  // --- bitfield specs -------------------------------------------------------
  for (const [tag, spec] of Object.entries(bitfieldSpecs)) {
    expect(spec.tag === tag, `spec key matches spec.tag for ${tag}`);
    expect(spec.bytes.length > 0, `${tag} declares at least one byte`);

    for (const byteDef of spec.bytes) {
      const seen = new Set<number>();
      for (const bit of byteDef.bits || []) {
        expect(
          bit.mask > 0 && bit.mask <= 0xff && (bit.mask & (bit.mask - 1)) === 0,
          `${tag} "${byteDef.name}" bit mask 0x${bit.mask.toString(16)} is a single bit`
        );
        expect(
          !seen.has(bit.mask),
          `${tag} "${byteDef.name}" reuses mask 0x${bit.mask.toString(16)}`
        );
        seen.add(bit.mask);
      }
      for (const enumDef of byteDef.enums || []) {
        for (const raw of Object.keys(enumDef.values)) {
          const numeric = Number(raw);
          expect(
            (numeric & enumDef.mask) === numeric,
            `${tag} "${enumDef.label}" value 0x${numeric.toString(
              16
            )} lies outside mask 0x${enumDef.mask.toString(16)}`
          );
        }
      }
    }

    // Presets must match the declared length, or the editor silently pads them.
    for (const preset of spec.presets || []) {
      expect(
        preset.value.length === spec.bytes.length * 2,
        `${tag} preset "${preset.name}" is ${
          preset.value.length / 2
        } bytes, expected ${spec.bytes.length}`
      );
    }
  }

  // TTQ decode: the value that ships in the UK prod config.
  const ttq = describeBitfield(bitfieldSpecs["9F66"], "24804000");
  expect(
    ttq.includes("Online PIN supported"),
    "TTQ 24804000 decodes online PIN"
  );
  expect(
    !ttq.includes("Signature supported"),
    "TTQ 24804000 does not advertise signature"
  );
  expect(
    describeBitfield(bitfieldSpecs["9F66"], "26804000").includes(
      "Signature supported"
    ),
    "TTQ 26804000 does advertise signature"
  );
  expect(
    describeBitfield(bitfieldSpecs["9F27"], "80").some((d) =>
      d.includes("ARQC")
    ),
    "CID 80 decodes as ARQC"
  );

  // --- payment decoders -----------------------------------------------------
  expect(luhnCheck("4111111111111111") === true, "Luhn accepts a valid PAN");
  expect(luhnCheck("4111111111111112") === false, "Luhn rejects a bad PAN");
  expect(
    maskPan("4111111111111111") === "411111******1111",
    "maskPan keeps first 6 and last 4"
  );
  expect(maskPan("41111111") === "********", "maskPan masks short values whole");

  const track = decodeTrack2("4111111111111111D25122011234567890F");
  expect(track.pan === "4111111111111111", "track 2 PAN");
  expect(track.expiry === "2512", "track 2 expiry");
  expect(track.serviceCode === "201", "track 2 service code");
  expect(track.panValid === true, "track 2 PAN passes Luhn");
  expect(track.errors.length === 0, "track 2 decodes without errors");
  expect(
    decodeTrack2("4111111111111111").errors.length > 0,
    "track 2 without separator reports an error"
  );

  // X = 0, Y = 0, then two CV Rules: 42/00 and 1F/03.
  const cvm = decodeCvmList("00000000000000004200" + "1F03");
  expect(cvm.rules.length === 2, "CVM list rule count");
  expect(
    cvm.rules[0].method === "Enciphered PIN verified online",
    "CVM rule 1 method"
  );
  expect(cvm.rules[0].continueOnFailure === true, "CVM rule 1 continues on fail");
  expect(cvm.rules[0].condition === "Always", "CVM rule 1 condition");
  expect(cvm.rules[1].method === "No CVM required", "CVM rule 2 method");
  expect(
    cvm.rules[1].condition === "If terminal supports the CVM",
    "CVM rule 2 condition"
  );

  // PDOL requesting 9F66 (4 bytes) and 9F02 (6 bytes).
  const dol = decodeDol("9F66049F0206");
  expect(dol.entries.length === 2, "DOL entry count");
  expect(dol.entries[0].tag === "9F66", "DOL multi-byte tag parsed");
  expect(dol.entries[0].length === 4, "DOL first length");
  expect(dol.entries[1].dataOffset === 4, "DOL running offset");
  expect(dol.totalBytes === 10, "DOL total bytes");

  // --- APDU decoding --------------------------------------------------------
  const select = decodeApdu("00A4040007A000000003101000", "command");
  expect(select.kind === "command", "SELECT decodes as a command");
  if (select.kind === "command") {
    expect(select.name === "SELECT", "SELECT is recognised");
    expect(select.lc === 7, "SELECT Lc");
    expect(select.data === "A0000000031010", "SELECT data field");
    expect(select.le === 0, "SELECT Le");
    expect(select.errors.length === 0, "SELECT decodes cleanly");
    expect(
      select.parameterNotes.some((n) => n.includes("Select by name")),
      "SELECT P1 decoded"
    );
  }

  const genAc = decodeApdu("80AE900002ABCD", "command");
  if (genAc.kind === "command") {
    expect(
      genAc.name === "GENERATE APPLICATION CRYPTOGRAM",
      "GENERATE AC recognised"
    );
    expect(
      genAc.parameterNotes.some((n) => n.includes("ARQC")),
      "GENERATE AC P1 requests ARQC"
    );
    expect(
      genAc.parameterNotes.some((n) => n.includes("CDA")),
      "GENERATE AC P1 requests CDA"
    );
  }

  const lcMismatch = decodeApdu("00A404000700", "command");
  expect(lcMismatch.errors.length > 0, "Lc longer than the data is reported");

  const ok = decodeApdu("9F3303E0F8C89000", "response");
  expect(ok.kind === "response", "response decodes as a response");
  if (ok.kind === "response") {
    expect(ok.statusWord.sw === "9000", "status word extracted");
    expect(ok.statusWord.severity === "success", "9000 is a success");
    expect(ok.data === "9F3303E0F8C8", "response data excludes the SW");
  }

  expect(
    decodeStatusWord("63C2").meaning.includes("2 PIN tries"),
    "63C2 reports the remaining PIN tries"
  );
  expect(
    decodeStatusWord("6115").meaning.includes("21 more bytes"),
    "61XX reports the available byte count"
  );
  expect(decodeStatusWord("6A82").severity === "error", "6A82 is an error");
  expect(
    decodeStatusWord("6283").severity === "warning",
    "62XX is a warning"
  );

  // --- CAPK validation ------------------------------------------------------
  // Checksum recomputation must be self-consistent: a key carrying its own
  // computed checksum validates, and a single mutated nibble breaks it.
  const capkRid = "A000000025";
  const capkIndex = "03";
  const capkModulus = "B0".repeat(128); // 1024 bits
  const capkExponent = "03";
  const goodChecksum = computeCapkChecksum(
    capkRid,
    capkIndex,
    capkModulus,
    capkExponent
  );
  expect(goodChecksum.length === 40, "SHA-1 checksum is 20 bytes");

  const goodCapk = validateCapk({
    rid: capkRid,
    index: capkIndex,
    modulus: capkModulus,
    exponent: capkExponent,
    checksum: goodChecksum,
  });
  expect(goodCapk.checksumMatches === true, "matching checksum validates");
  expect(
    goodCapk.issues.filter((i) => i.severity === "error").length === 0,
    "valid CAPK has no errors"
  );
  expect(goodCapk.modulusBits === 1024, "modulus bit length");
  expect(goodCapk.schemeName === "American Express", "RID maps to a scheme");

  const tamperedCapk = validateCapk({
    rid: capkRid,
    index: capkIndex,
    modulus: "B1" + capkModulus.slice(2),
    exponent: capkExponent,
    checksum: goodChecksum,
  });
  expect(
    tamperedCapk.checksumMatches === false,
    "a mutated modulus fails the checksum"
  );

  // The v30 defect class: a character inserted mid-modulus makes the hex odd.
  const oddCapk = validateCapk({
    rid: capkRid,
    index: capkIndex,
    modulus: capkModulus + "A",
    exponent: capkExponent,
  });
  expect(
    oddCapk.issues.some(
      (i) => i.field === "modulus" && i.message.includes("odd")
    ),
    "odd-length modulus is reported"
  );

  expect(
    validateCapk({
      rid: "A00000",
      index: "03",
      modulus: capkModulus,
      exponent: "03",
    }).issues.some((i) => i.field === "rid"),
    "short RID is reported"
  );
  expect(
    validateCapk({
      rid: capkRid,
      index: capkIndex,
      modulus: capkModulus,
      exponent: "03",
      expiry: "9912",
    }).issues.some((i) => i.field === "expiry"),
    "expiry is validated as MMYY, so month 99 is rejected"
  );

  // --- country codes --------------------------------------------------------
  expect(
    getCountryByNumeric("0826")?.alpha2 === "GB",
    "9F1A 0826 resolves to GB"
  );
  expect(
    getCountryByNumeric("246")?.currencyNumeric === "978",
    "Finland uses EUR, not 246"
  );
  expect(
    getCountryByNumeric("999") === undefined,
    "unknown country code returns undefined"
  );

  // --- TLV lint -------------------------------------------------------------
  // Finland terminal (9F1A 0246) with the country code wrongly in 5F2A.
  const mismatch = lintTlv(parseTlv("9F1A0202465F2A020246"));
  expect(
    mismatch.some((f) => f.id === "country-currency-mismatch"),
    "lint catches country code copied into the currency field"
  );
  // Correct pairing must not fire.
  expect(
    !lintTlv(parseTlv("9F1A0202465F2A020978")).some(
      (f) => f.id === "country-currency-mismatch"
    ),
    "lint accepts Finland with EUR"
  );
  // GB with GBP: numerically identical, still correct.
  expect(
    !lintTlv(parseTlv("9F1A0208265F2A020826")).some(
      (f) => f.id === "country-currency-mismatch"
    ),
    "lint accepts GB with GBP"
  );

  const ttqFindings = lintTlv(parseTlv("9F660426804000"));
  expect(
    ttqFindings.some((f) => f.id === "ttq-signature-and-pin"),
    "lint flags TTQ advertising both signature and online PIN"
  );
  expect(
    !lintTlv(parseTlv("9F660424804000")).some(
      (f) => f.id === "ttq-signature-and-pin"
    ),
    "lint accepts TTQ 24804000"
  );
  expect(
    lintTlv(parseTlv("9F660424604000")).some(
      (f) => f.id === "ttq-cvm-required-static"
    ),
    "lint flags a statically set CVM Required bit"
  );
  expect(
    lintTlv(parseTlv("9F660424204000")).some(
      (f) => f.id === "ttq-offline-pin-without-contact"
    ),
    "lint flags offline PIN without contact chip support"
  );

  expect(
    lintTlv(parseTlv("9F0605B012345678")).some((f) =>
      f.id.startsWith("test-aid")
    ),
    "lint flags a test AID"
  );
  expect(
    lintTlv(parseTlv("9F150200 00".replace(/\s/g, ""))).some(
      (f) => f.id === "placeholder-mcc"
    ),
    "lint flags an all-zero MCC"
  );
  // 9F33 with a wrong length must be reported.
  expect(
    lintTlv(parseTlv("9F3302E0F8")).some((f) => f.id === "length-9F33"),
    "lint flags a wrong fixed length"
  );
  expect(lintTlv(null).length === 0, "lint tolerates a null result");

  // --- EMV config parsing and lint ------------------------------------------
  const configJson = {
    metadata: {
      label: "test",
      version: "1",
      properties: { includes_livecards_certs: "true" },
    },
    terminal: [
      { tag: "9F1A", value: "0246" },
      { tag: "5F2A", value: "0246" },
      { tag: "9F15", value: "0000" },
    ],
    kernel: [
      {
        kernelId: 2,
        // 9F6E in the Mastercard reader config is the bug that broke setup.
        config: [{ tag: "9F6E", value: "D8C04000" }],
        application: [
          {
            aid: ["A0000000041010", "B012345678"],
            transaction: [{ transactionType: "00", readerCVMRequiredLimit: 10000 }],
          },
        ],
      },
      {
        kernelId: 3,
        application: [
          {
            aid: ["A0000000031010"],
            transaction: [
              {
                transactionType: "00",
                readerCVMRequiredLimit: 5000,
                config: [{ tag: "9F66", value: "24604000" }],
              },
              // Refunds omit the limit on purpose; must not skew the comparison.
              { transactionType: "20" },
            ],
          },
        ],
      },
    ],
    publicKey: [
      {
        rId: "A000000025",
        index: "04",
        modulus: "B0".repeat(128),
        exponent: "03",
        checksum: "00".repeat(20),
      },
    ],
  };

  const plain = parseEmvConfig(JSON.stringify(configJson));
  expect(plain.signatureLine === undefined, "plain JSON has no signature line");
  expect(plain.config.metadata?.version === "1", "plain JSON metadata parsed");

  // Signed form: hash line, then the payload.
  const signed = parseEmvConfig(`ABCDEF0123\n${JSON.stringify(configJson)}`);
  expect(signed.signatureLine === "ABCDEF0123", "signed hash line extracted");
  expect(signed.config.kernel?.length === 2, "signed payload parsed");
  expectThrows(() => parseEmvConfig("not a config"), "unparseable input");
  expectThrows(
    () => parseEmvConfig("hashline\nstill not json"),
    "second line is not JSON"
  );

  const configFindings = lintEmvConfig(plain);
  const hasFinding = (id: string) => configFindings.some((f) => f.id === id);

  expect(hasFinding("mc-kernel-9f6e"), "lint flags 9F6E in the MC reader config");
  expect(
    hasFinding("test-aid-B012345678"),
    "lint flags the test AID in the config"
  );
  expect(
    hasFinding("config-country-currency"),
    "lint flags Finland country code sitting in the currency field"
  );
  expect(
    hasFinding("config-placeholder-mcc"),
    "lint flags the all-zero MCC"
  );
  expect(
    hasFinding("cvm-limit-inconsistent"),
    "lint flags CVM limits that differ between kernels"
  );
  expect(
    configFindings.some((f) => f.id.startsWith("capk-A000000025-04-checksum")),
    "lint flags the CA key checksum mismatch"
  );
  expect(
    hasFinding("capk-test-key-A000000025-04"),
    "lint flags a test CA key in a config claiming live certificates"
  );
  expect(
    configFindings.some((f) => f.id.includes("ttq-offline-pin")),
    "lint flags the contradictory TTQ offline-PIN bit"
  );
  expect(
    configFindings.some((f) => f.id.includes("ttq-cvm-static")),
    "lint flags the statically set TTQ CVM Required bit"
  );

  // A clean config must produce none of the above.
  const cleanConfig = parseEmvConfig(
    JSON.stringify({
      metadata: { version: "2", properties: {} },
      terminal: [
        { tag: "9F1A", value: "0826" },
        { tag: "5F2A", value: "0826" },
        { tag: "9F15", value: "5411" },
      ],
      kernel: [
        {
          kernelId: 3,
          application: [
            {
              aid: ["A0000000031010"],
              transaction: [
                {
                  transactionType: "00",
                  readerCVMRequiredLimit: 10000,
                  config: [{ tag: "9F66", value: "24804000" }],
                },
              ],
            },
          ],
        },
      ],
      publicKey: [
        {
          rId: "A000000003",
          index: "09",
          modulus: "B0".repeat(128),
          exponent: "03",
          checksum: computeCapkChecksum(
            "A000000003",
            "09",
            "B0".repeat(128),
            "03"
          ),
        },
      ],
    })
  );
  const cleanFindings = lintEmvConfig(cleanConfig);
  expect(
    cleanFindings.filter((f) => f.severity !== "info").length === 0,
    `clean config should produce no errors or warnings, got: ${cleanFindings
      .map((f) => f.id)
      .join(", ")}`
  );

  // Tag collection walks terminal, kernel config and per-transaction config.
  const collected = collectConfigTags(plain.config);
  expect(
    collected.some((t) => t.tag === "9F66" && t.value === "24604000"),
    "collectConfigTags reaches per-transaction tags"
  );
  expect(
    collected.some((t) => t.tag === "9F1A" && t.location === "terminal"),
    "collectConfigTags reaches terminal tags"
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
