/**
 * Assertions for the cipher, PIN and converter logic.
 *
 * Where a published test vector exists it is used. Where one does not, the
 * property being checked is round-trip consistency (encrypt/decrypt,
 * encode/decode, offset/recover) plus structural invariants — a self-consistent
 * result is not proof of scheme conformance, and these tools should not be
 * treated as certified.
 */

import {
  decryptHex,
  encryptHex,
  keyCheckValue,
  retailMac,
  xorHex,
} from "@/utils/crypto/block-ciphers";
import { hash, hmac } from "@/utils/crypto/hashes";
import {
  cardVerificationValue,
  decimalise,
  decodePinBlock,
  encodePinBlock,
  ibm3624Offset,
  ibm3624PinFromOffset,
  panBlock,
  visaPvv,
} from "@/utils/crypto/pin-blocks";
import {
  asciiToHex,
  base64ToHex,
  bitwise,
  completePan,
  decodeIso8583Bitmap,
  encodeIso8583Bitmap,
  fromJulianCyyddd,
  generateTestPans,
  hexToAscii,
  hexToBase64,
  luhnCheckDigit,
  toJulianCyyddd,
} from "@/utils/converters";
import { getCurrencyByNumeric, formatMinorUnits } from "@/utils/emv/currency-codes";
import { TOOLS, getTool, groupedTools, searchTools } from "@/tools/registry";
import { describeBitfield, type BitfieldSpec } from "@/utils/tlv/bitfield-specs";
import {
  bitLabelForIndex,
  emitBitfieldSpecCode,
  emptyByte,
  emptySpec,
  maskForBitIndex,
  normaliseBitfieldSpec,
  validateBitfieldSpec,
} from "@/utils/tlv/custom-bitfields";

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

export function runCryptoTests() {
  /* --- DES / 3DES / AES ---------------------------------------------------- */

  // Published single-DES vector: key 0123456789ABCDEF over plaintext
  // 4E6F772069732074 gives 3FA40E8A984D4815.
  expect(
    encryptHex({
      algorithm: "DES",
      keyHex: "0123456789ABCDEF",
      dataHex: "4E6F772069732074",
    }) === "3FA40E8A984D4815",
    "DES known-answer vector"
  );

  // FIPS-197 AES-128 vector.
  expect(
    encryptHex({
      algorithm: "AES",
      keyHex: "000102030405060708090A0B0C0D0E0F",
      dataHex: "00112233445566778899AABBCCDDEEFF",
    }) === "69C4E0D86A7B0430D8CDB78070B4C55A",
    "AES-128 FIPS-197 vector"
  );

  // Two-key 3DES with K1 == K2 must reduce to single DES.
  expect(
    encryptHex({
      algorithm: "3DES",
      keyHex: "0123456789ABCDEF0123456789ABCDEF",
      dataHex: "4E6F772069732074",
    }) === "3FA40E8A984D4815",
    "3DES with equal halves reduces to DES"
  );

  // Round trips.
  for (const [algorithm, key] of [
    ["DES", "0123456789ABCDEF"],
    ["3DES", "0123456789ABCDEFFEDCBA9876543210"],
    ["AES", "000102030405060708090A0B0C0D0E0F"],
  ] as const) {
    const data = algorithm === "AES" ? "00".repeat(16) : "0011223344556677";
    const encrypted = encryptHex({ algorithm, keyHex: key, dataHex: data });
    expect(
      decryptHex({ algorithm, keyHex: key, dataHex: encrypted }) === data,
      `${algorithm} ECB round trip`
    );

    const iv = algorithm === "AES" ? "00".repeat(16) : "0000000000000000";
    const cbc = encryptHex({
      algorithm,
      mode: "CBC",
      keyHex: key,
      dataHex: data,
      ivHex: iv,
    });
    expect(
      decryptHex({
        algorithm,
        mode: "CBC",
        keyHex: key,
        dataHex: cbc,
        ivHex: iv,
      }) === data,
      `${algorithm} CBC round trip`
    );
  }

  // CBC must differ from ECB across repeated blocks — proves chaining happens.
  const repeated = "00112233445566770011223344556677";
  expect(
    encryptHex({
      algorithm: "3DES",
      keyHex: "0123456789ABCDEFFEDCBA9876543210",
      dataHex: repeated,
    }).substring(0, 16) ===
      encryptHex({
        algorithm: "3DES",
        keyHex: "0123456789ABCDEFFEDCBA9876543210",
        dataHex: repeated,
      }).substring(16, 32),
    "ECB encrypts identical blocks identically"
  );
  const cbcRepeated = encryptHex({
    algorithm: "3DES",
    mode: "CBC",
    keyHex: "0123456789ABCDEFFEDCBA9876543210",
    dataHex: repeated,
    ivHex: "0000000000000000",
  });
  expect(
    cbcRepeated.substring(0, 16) !== cbcRepeated.substring(16, 32),
    "CBC chains, so identical blocks encrypt differently"
  );

  // Validation.
  expectThrows(
    () => encryptHex({ algorithm: "DES", keyHex: "0011", dataHex: "00".repeat(8) }),
    "short DES key"
  );
  expectThrows(
    () => encryptHex({ algorithm: "DES", keyHex: "0123456789ABCDEF", dataHex: "0011" }),
    "data that is not a whole block"
  );
  expectThrows(
    () =>
      encryptHex({
        algorithm: "DES",
        mode: "CBC",
        keyHex: "0123456789ABCDEF",
        dataHex: "00".repeat(8),
        ivHex: "0011",
      }),
    "wrong IV length"
  );

  expect(keyCheckValue("DES", "0123456789ABCDEF").length === 6, "KCV is 3 bytes");
  expect(
    keyCheckValue("DES", "0123456789ABCDEF") ===
      encryptHex({
        algorithm: "DES",
        keyHex: "0123456789ABCDEF",
        dataHex: "0000000000000000",
      }).substring(0, 6),
    "KCV is the leading 3 bytes of an encrypted zero block"
  );

  expect(xorHex("FF00", "0FF0") === "F0F0", "xorHex");
  expectThrows(() => xorHex("FF", "FFFF"), "XOR length mismatch");

  expect(
    retailMac("0123456789ABCDEFFEDCBA9876543210", "00".repeat(8)).length === 16,
    "retail MAC is 8 bytes"
  );
  expectThrows(
    () => retailMac("0123456789ABCDEF", "00".repeat(8)),
    "retail MAC with a single-length key"
  );

  /* --- hashes ------------------------------------------------------------- */

  // Published vectors for the empty string and "abc".
  expect(
    hash("SHA-1", "", "utf8") === "DA39A3EE5E6B4B0D3255BFEF95601890AFD80709",
    "SHA-1 of the empty string"
  );
  expect(
    hash("SHA-256", "abc", "utf8") ===
      "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD",
    "SHA-256 of abc"
  );
  // Hex and text encodings of the same characters must agree.
  expect(
    hash("SHA-256", "616263", "hex") === hash("SHA-256", "abc", "utf8"),
    "hex and utf8 inputs agree when the bytes agree"
  );
  // RFC 2202 HMAC-SHA-1 test case 2.
  expect(
    hmac("SHA-1", "what do ya want for nothing?", "Jefe", "utf8", "utf8") ===
      "EFFCDF6AE5EB2FA2D27416D5F184DF9C259A7C79",
    "HMAC-SHA-1 RFC 2202 case 2"
  );
  expectThrows(() => hash("SHA-256", "ABC", "hex"), "odd-length hex input");

  /* --- PIN blocks --------------------------------------------------------- */

  // Format 0 worked example: PIN 1234, PAN 4111111111111111.
  // Clear block 041234FFFFFFFFFF XOR PAN block 0000111111111111.
  expect(
    panBlock("4111111111111111") === "0000111111111111",
    "format 0 PAN block"
  );
  const f0 = encodePinBlock("0", "1234", "4111111111111111");
  expect(f0 === "041225EEEEEEEEEE", `format 0 block, got ${f0}`);

  // Round trip every format.
  for (const format of ["0", "1", "2", "3"] as const) {
    const pan = format === "0" || format === "3" ? "4111111111111111" : undefined;
    const block = encodePinBlock(format, "1234", pan, "AAAAAAAAAAAAAA");
    const decoded = decodePinBlock(block, pan);
    expect(decoded.pin === "1234", `format ${format} PIN round trip`);
    expect(decoded.format === format, `format ${format} detected`);
  }

  // A 6-digit PIN must survive too.
  expect(
    decodePinBlock(
      encodePinBlock("0", "123456", "4111111111111111"),
      "4111111111111111"
    ).pin === "123456",
    "6-digit PIN round trip"
  );

  // Format 0 decoded without the PAN warns rather than silently lying.
  const noPan = decodePinBlock(f0);
  expect(noPan.warnings.length > 0, "decoding format 0 without a PAN warns");

  // Wrong PAN must not silently yield the right PIN.
  expect(
    decodePinBlock(f0, "4222222222222222").pin !== "1234",
    "a wrong PAN does not recover the PIN"
  );

  expectThrows(() => encodePinBlock("0", "123", "4111111111111111"), "short PIN");
  expectThrows(() => encodePinBlock("0", "1234"), "format 0 without a PAN");
  expectThrows(() => decodePinBlock("0011"), "short PIN block");
  expectThrows(() => panBlock("411111"), "PAN too short for a PAN block");

  // Encrypted round trip through the PIN encryption key.
  const pek = "0123456789ABCDEFFEDCBA9876543210";
  const encryptedBlock = encryptHex({
    algorithm: "3DES",
    keyHex: pek,
    dataHex: f0,
  });
  expect(
    decodePinBlock(
      decryptHex({ algorithm: "3DES", keyHex: pek, dataHex: encryptedBlock }),
      "4111111111111111"
    ).pin === "1234",
    "encrypted PIN block round trip"
  );

  /* --- decimalisation, PVV, 3624 ------------------------------------------ */

  expect(
    decimalise("1234ABCD") === "12340123",
    "decimalise takes digits then maps letters"
  );
  expect(
    decimalise("ABCDEF", "0000000000000000") === "000000",
    "decimalisation table is honoured"
  );

  const pvv = visaPvv("4111111111111111", "1", "1234", pek);
  expect(/^\d{4}$/.test(pvv), `PVV is 4 digits, got ${pvv}`);
  // The PVV must depend on each input.
  expect(
    visaPvv("4111111111111111", "1", "4321", pek) !== pvv,
    "PVV depends on the PIN"
  );
  expect(
    visaPvv("4222222222222222", "1", "1234", pek) !== pvv,
    "PVV depends on the PAN"
  );
  expect(
    visaPvv("4111111111111111", "2", "1234", pek) !== pvv,
    "PVV depends on the key index"
  );
  expectThrows(
    () => visaPvv("4111111111111111", "1", "123456", pek),
    "PVV with a non-4-digit PIN"
  );

  const { naturalPin, offset } = ibm3624Offset("4111111111111111", pek, "1234");
  expect(/^\d{4}$/.test(naturalPin), "natural PIN is 4 digits");
  expect(/^\d{4}$/.test(offset), "offset is 4 digits");
  expect(
    ibm3624PinFromOffset("4111111111111111", pek, offset) === "1234",
    "3624 offset recovers the PIN"
  );
  // A zero offset means the chosen PIN is the natural PIN.
  expect(
    ibm3624Offset("4111111111111111", pek, naturalPin).offset === "0000",
    "choosing the natural PIN gives a zero offset"
  );

  const cvv = cardVerificationValue(
    "4111111111111111",
    "2512",
    "201",
    "0123456789ABCDEF",
    "FEDCBA9876543210"
  );
  expect(/^\d{3}$/.test(cvv), `CVV is 3 digits, got ${cvv}`);
  expect(
    cardVerificationValue(
      "4111111111111111",
      "2512",
      "000",
      "0123456789ABCDEF",
      "FEDCBA9876543210"
    ) !== cvv,
    "CVV depends on the service code"
  );
  expectThrows(
    () =>
      cardVerificationValue("4111111111111111", "25", "201", "0123456789ABCDEF", "FEDCBA9876543210"),
    "CVV with a bad expiry"
  );

  /* --- converters --------------------------------------------------------- */

  expect(asciiToHex("TERMINAL") === "5445524D494E414C", "asciiToHex");
  expect(hexToAscii("5445524D494E414C") === "TERMINAL", "hexToAscii");
  expect(hexToAscii("00FF") === "..", "hexToAscii masks unprintable bytes");
  expectThrows(() => asciiToHex("€"), "multi-byte character");
  expectThrows(() => hexToAscii("ABC"), "odd-length hex");

  expect(hexToBase64("00112233") === "ABEiMw==", "hexToBase64");
  expect(base64ToHex("ABEiMw==") === "00112233", "base64ToHex");
  expect(
    base64ToHex(hexToBase64("9F660424804000")) === "9F660424804000",
    "base64 round trip"
  );
  expectThrows(() => base64ToHex("!!!!"), "invalid base64");

  expect(bitwise("AND", "F0F0", "FF00") === "F000", "bitwise AND");
  expect(bitwise("OR", "F0F0", "0F0F") === "FFFF", "bitwise OR");
  expect(bitwise("XOR", "FFFF", "F0F0") === "0F0F", "bitwise XOR");
  expect(bitwise("NOT", "F0") === "0F", "bitwise NOT");
  expectThrows(() => bitwise("AND", "FF", "FFFF"), "bitwise length mismatch");

  expect(toJulianCyyddd("2026-01-01") === "126001", "Julian first day of 2026");
  expect(toJulianCyyddd("2026-12-31") === "126365", "Julian last day of 2026");
  // 2024 is a leap year, so 31 December is day 366.
  expect(toJulianCyyddd("2024-12-31") === "124366", "Julian leap year");
  expect(fromJulianCyyddd("126001") === "2026-01-01", "Julian reverse");
  expect(fromJulianCyyddd("124366") === "2024-12-31", "Julian reverse leap year");
  expect(
    fromJulianCyyddd(toJulianCyyddd("2026-08-04")) === "2026-08-04",
    "Julian round trip"
  );
  expectThrows(() => toJulianCyyddd("2026-02-30"), "impossible date");
  expectThrows(() => fromJulianCyyddd("126366"), "day 366 in a non-leap year");

  expect(luhnCheckDigit("411111111111111") === "1", "Luhn check digit");
  expect(completePan("411111111111111") === "4111111111111111", "completePan");
  const generated = generateTestPans("411111", 16, 5, 7);
  expect(generated.length === 5, "generated PAN count");
  expect(
    generated.every((c) => c.valid && c.pan.length === 16),
    "generated PANs are valid and the right length"
  );
  expect(
    generateTestPans("411111", 16, 3, 7)[0].pan === generated[0].pan,
    "generation is deterministic for a given seed"
  );
  expectThrows(() => generateTestPans("411111", 4, 1), "PAN length below the BIN");

  /* --- ISO 8583 bitmap ---------------------------------------------------- */

  const bitmap = decodeIso8583Bitmap("7238000108C00000");
  expect(bitmap.hasSecondary === false, "no secondary bitmap flagged");
  expect(
    bitmap.fields.includes(2) &&
      bitmap.fields.includes(3) &&
      bitmap.fields.includes(4),
    "bitmap decodes the expected low fields"
  );
  expect(!bitmap.fields.includes(1), "bit 1 is not reported as a data field");
  expect(
    encodeIso8583Bitmap(bitmap.fields) === "7238000108C00000",
    "bitmap round trip"
  );
  // A field above 64 must switch on the secondary bitmap.
  const secondary = encodeIso8583Bitmap([2, 70]);
  expect(secondary.length === 32, "secondary bitmap is 16 bytes");
  expect(
    decodeIso8583Bitmap(secondary).hasSecondary,
    "secondary bitmap flag is set"
  );
  expect(
    decodeIso8583Bitmap(secondary).fields.includes(70),
    "field above 64 survives the round trip"
  );
  expectThrows(() => encodeIso8583Bitmap([1]), "field 1 is the bitmap flag");
  expectThrows(() => decodeIso8583Bitmap("00"), "short bitmap");

  /* --- currencies --------------------------------------------------------- */

  expect(getCurrencyByNumeric("0826")?.alpha === "GBP", "5F2A 0826 is GBP");
  expect(getCurrencyByNumeric("392")?.minorUnits === 0, "JPY has no minor units");
  expect(
    formatMinorUnits(10000, "826") === "£100.00 GBP",
    `GBP minor units, got ${formatMinorUnits(10000, "826")}`
  );
  expect(
    formatMinorUnits(10000, "392") === "¥10000 JPY",
    `JPY has no decimals, got ${formatMinorUnits(10000, "392")}`
  );

  /* --- registry integrity ------------------------------------------------- */

  const ids = TOOLS.map((t) => t.id);
  expect(
    new Set(ids).size === ids.length,
    `tool ids must be unique; duplicates in ${ids.join(", ")}`
  );
  for (const tool of TOOLS) {
    expect(tool.name.length > 0, `${tool.id} has a name`);
    expect(tool.group.length > 0, `${tool.id} has a group`);
    expect(tool.description.length > 0, `${tool.id} has a description`);
    expect(getTool(tool.id) === tool, `${tool.id} is retrievable by id`);
    if (tool.kind === "calculator") {
      expect(tool.fields.length > 0, `${tool.id} declares fields`);
      const names = tool.fields.map((f) => f.name);
      expect(
        new Set(names).size === names.length,
        `${tool.id} has unique field names`
      );
      // Select fields must offer options, or the control renders empty.
      for (const field of tool.fields) {
        if (field.type === "select") {
          expect(
            (field.options ?? []).length > 0,
            `${tool.id}.${field.name} is a select with options`
          );
          // Radix Select throws on an empty item value.
          expect(
            (field.options ?? []).every((o) => o.value !== ""),
            `${tool.id}.${field.name} has no empty option value`
          );
        }
      }
      // Every example must compute without throwing.
      if (tool.example) {
        const values: Record<string, string> = {};
        for (const field of tool.fields) values[field.name] = field.defaultValue ?? "";
        try {
          const results = tool.compute({ ...values, ...tool.example });
          expect(
            results.length > 0,
            `${tool.id} example produces at least one result`
          );
        } catch (e) {
          throw new Error(
            `${tool.id} example threw: ${e instanceof Error ? e.message : e}`
          );
        }
      }
    }
  }

  // Every tool must be reachable from a group, and search must find it by name.
  const grouped = groupedTools().flatMap((g) => g.tools);
  expect(
    grouped.length === TOOLS.length,
    `every tool appears in a group (${grouped.length} vs ${TOOLS.length})`
  );
  expect(
    searchTools("ttq").some((t) => t.id === "decode-9f66"),
    "search finds the TTQ decoder by keyword"
  );
  expect(
    searchTools("pin block").length > 0,
    "search finds the PIN block tools"
  );
  expect(searchTools("").length === TOOLS.length, "empty search returns all");
  expect(searchTools("zzzznope").length === 0, "search can return nothing");

  return "All crypto and registry tests passed";
}

/**
 * Tag Decoder Builder logic: validation, normalisation and code emission.
 * Kept separate so it can be run on its own.
 */
export function runTagBuilderTests() {
  /* --- masks -------------------------------------------------------------- */
  expect(maskForBitIndex(0) === 0x80, "bit index 0 is the top bit");
  expect(maskForBitIndex(7) === 0x01, "bit index 7 is the bottom bit");
  expect(bitLabelForIndex(0).includes("bit 8"), "index 0 is labelled bit 8");

  /* --- validation --------------------------------------------------------- */
  const good: BitfieldSpec = {
    tag: "9F6E",
    name: "Enhanced Contactless Reader Capabilities",
    description: "AMEX reader capabilities",
    ref: "C-4 Table 4-4",
    bytes: [
      {
        name: "Byte 1",
        bits: [
          { mask: 0x80, label: "Contactless mag-stripe supported" },
          { mask: 0x08, label: "Mobile CVM supported" },
        ],
      },
      { name: "Byte 2", bits: [] },
    ],
    presets: [{ name: "Shipping value", value: "18C0", desc: "as deployed" }],
  };
  expect(validateBitfieldSpec(good).length === 0, "a coherent spec validates");

  const has = (spec: Partial<BitfieldSpec>, needle: string) =>
    validateBitfieldSpec(spec).some((i) =>
      i.message.toLowerCase().includes(needle.toLowerCase())
    );

  expect(has({ ...good, tag: "" }, "enter a tag"), "empty tag rejected");
  expect(has({ ...good, tag: "9F6" }, "whole number of bytes"), "odd tag rejected");
  expect(
    has({ ...good, tag: "9F6E7A8B9C" }, "at most 4 bytes"),
    "over-long tag rejected"
  );
  expect(has({ ...good, name: "  " }, "enter a name"), "blank name rejected");
  expect(has({ ...good, bytes: [] }, "at least one byte"), "no bytes rejected");
  expect(
    has({ ...good, bytes: [{ name: "", bits: [] }] }, "needs a name"),
    "unnamed byte rejected"
  );

  // A mask covering two bits is not a single flag.
  expect(
    has(
      { ...good, bytes: [{ name: "B", bits: [{ mask: 0xc0, label: "two bits" }] }] },
      "not a single bit"
    ),
    "multi-bit mask rejected"
  );
  // The same bit twice would render two checkboxes driving one bit.
  expect(
    has(
      {
        ...good,
        bytes: [
          {
            name: "B",
            bits: [
              { mask: 0x80, label: "one" },
              { mask: 0x80, label: "two" },
            ],
          },
        ],
      },
      "used twice"
    ),
    "duplicate mask rejected"
  );
  // A preset must match the declared width or it is silently padded.
  expect(
    has({ ...good, presets: [{ name: "p", value: "18", desc: "" }] }, "but this tag is"),
    "preset width mismatch rejected"
  );
  // An enum value outside its mask can never match.
  expect(
    has(
      {
        ...good,
        bytes: [
          {
            name: "B",
            bits: [],
            enums: [
              { mask: 0xc0, label: "type", values: { 0x10: "impossible" } },
            ],
          },
        ],
      },
      "outside its mask"
    ),
    "enum value outside the mask rejected"
  );
  // A bit that is also inside an enum's mask is ambiguous.
  expect(
    has(
      {
        ...good,
        bytes: [
          {
            name: "B",
            bits: [{ mask: 0x80, label: "flag" }],
            enums: [{ mask: 0xc0, label: "type", values: { 0x80: "x" } }],
          },
        ],
      },
      "overlaps enum"
    ),
    "bit overlapping an enum rejected"
  );

  /* --- normalisation ------------------------------------------------------ */
  const normalised = normaliseBitfieldSpec({
    ...good,
    tag: "9f6e",
    name: "  Padded name  ",
    bytes: [
      {
        name: " Byte 1 ",
        // Deliberately out of order, with one blank label to be dropped.
        bits: [
          { mask: 0x08, label: "low" },
          { mask: 0x80, label: "high" },
          { mask: 0x20, label: "   " },
        ],
      },
      { name: "Byte 2", bits: [] },
    ],
  });
  expect(normalised.tag === "9F6E", "tag is uppercased");
  expect(normalised.name === "Padded name", "name is trimmed");
  expect(normalised.bytes[0].name === "Byte 1", "byte name is trimmed");
  expect(
    normalised.bytes[0].bits?.length === 2,
    "blank-label bits are dropped"
  );
  expect(
    normalised.bytes[0].bits?.[0].mask === 0x80,
    "bits are sorted most-significant first"
  );

  /* --- the spec must actually decode -------------------------------------- */
  const flags = describeBitfield(normalised, "8800");
  expect(flags.includes("high"), "built spec decodes the top bit");
  expect(flags.includes("low"), "built spec decodes the low bit");
  expect(
    !describeBitfield(normalised, "0000").length,
    "an all-zero value sets no flags"
  );

  /* --- code emission ------------------------------------------------------ */
  const code = emitBitfieldSpecCode(normalised);
  expect(code.includes("TAG_9F6E: BitfieldSpec"), "emits a typed const");
  expect(code.includes('tag: "9F6E"'), "emits the tag");
  expect(code.includes("mask: 0x80"), "emits masks as hex");
  expect(code.includes('label: "high"'), "emits labels");
  expect(code.includes('"9F6E": TAG_9F6E'), "reminds you to register it");
  // Emitted masks must be hex literals, not decimal — 0x80 not 128.
  expect(!/mask: 128/.test(code), "masks are not emitted as decimal");

  /* --- blanks ------------------------------------------------------------- */
  const blank = emptySpec();
  expect(blank.bytes.length === 1, "a new spec starts with one byte");
  expect(
    validateBitfieldSpec(blank).length > 0,
    "a blank spec does not validate"
  );
  expect(emptyByte(2).name === "Byte 3", "new bytes are numbered from 1");

  return "All tag builder tests passed";
}
