/**
 * APDU decoder — ISO/IEC 7816-4 command and response APDUs, with the EMV
 * command set and status words that matter when reading a terminal trace.
 */

export type ApduKind = "command" | "response";

export type CommandApdu = {
  readonly kind: "command";
  readonly cla: string;
  readonly ins: string;
  readonly p1: string;
  readonly p2: string;
  /** Command name if the CLA/INS pair is recognised. */
  readonly name?: string;
  /** Human-readable P1/P2 decoding for commands we know. */
  readonly parameterNotes: string[];
  /** Lc, if a data field is present. */
  readonly lc?: number;
  readonly data?: string;
  /** Le, if an expected-length byte is present. */
  readonly le?: number;
  readonly claNotes: string[];
  readonly errors: string[];
};

export type StatusWord = {
  readonly sw: string;
  readonly meaning: string;
  readonly severity: "success" | "warning" | "error";
};

export type ResponseApdu = {
  readonly kind: "response";
  readonly data: string;
  readonly statusWord: StatusWord;
  readonly errors: string[];
};

export type ApduDecoding = CommandApdu | ResponseApdu;

/** EMV / ISO 7816 commands, keyed by INS then narrowed by CLA where needed. */
const COMMANDS: Record<string, string> = {
  "00A4": "SELECT",
  "00B2": "READ RECORD",
  "00C0": "GET RESPONSE",
  "00CA": "GET DATA",
  "80CA": "GET DATA",
  "00DA": "PUT DATA",
  "80DA": "PUT DATA",
  "0020": "VERIFY",
  "0082": "EXTERNAL AUTHENTICATE",
  "0084": "GET CHALLENGE",
  "0088": "INTERNAL AUTHENTICATE",
  "80A8": "GET PROCESSING OPTIONS",
  "80AE": "GENERATE APPLICATION CRYPTOGRAM",
  "8016": "CARD BLOCK",
  "8018": "APPLICATION UNBLOCK",
  "801E": "APPLICATION BLOCK",
  "8024": "PIN CHANGE / UNBLOCK",
};

/** Exact status words. Prefixed families are handled in `decodeStatusWord`. */
const STATUS_WORDS: Record<string, string> = {
  "9000": "Success",
  "6200": "Warning: no information given, state of non-volatile memory unchanged",
  "6281": "Warning: part of the returned data may be corrupted",
  "6282": "Warning: end of file reached before reading Le bytes",
  "6283": "Warning: selected file invalidated / blocked",
  "6284": "Warning: FCI not formatted according to 7816-4",
  "6300": "Warning: authentication failed, state of non-volatile memory changed",
  "6400": "Error: state of non-volatile memory unchanged, execution error",
  "6500": "Error: state of non-volatile memory changed, execution error",
  "6581": "Error: memory failure",
  "6700": "Error: wrong length (Lc or Le incorrect)",
  "6800": "Error: functions in CLA not supported",
  "6881": "Error: logical channel not supported",
  "6882": "Error: secure messaging not supported",
  "6900": "Error: command not allowed",
  "6981": "Error: command incompatible with file structure",
  "6982": "Error: security status not satisfied",
  "6983": "Error: authentication method blocked",
  "6984": "Error: referenced data invalidated / reference data unusable",
  "6985": "Error: conditions of use not satisfied",
  "6986": "Error: command not allowed (no current EF selected)",
  "6987": "Error: expected secure messaging data objects missing",
  "6988": "Error: secure messaging data objects incorrect",
  "6A00": "Error: wrong parameters P1-P2",
  "6A80": "Error: incorrect parameters in the command data field",
  "6A81": "Error: function not supported",
  "6A82": "Error: file or application not found",
  "6A83": "Error: record not found",
  "6A84": "Error: not enough memory space in the file",
  "6A86": "Error: incorrect parameters P1-P2",
  "6A88": "Error: referenced data not found",
  "6B00": "Error: wrong parameters (offset outside the EF)",
  "6D00": "Error: instruction code not supported or invalid",
  "6E00": "Error: class not supported",
  "6F00": "Error: no precise diagnosis",
};

/** Decode a two-byte status word, including the 61XX/6CXX/63CX families. */
export function decodeStatusWord(sw: string): StatusWord {
  const upper = sw.toUpperCase();
  const sw1 = upper.substring(0, 2);
  const sw2 = upper.substring(2, 4);
  const sw2Value = parseInt(sw2, 16);

  if (upper === "9000") {
    return { sw: upper, meaning: STATUS_WORDS["9000"], severity: "success" };
  }
  if (sw1 === "61") {
    return {
      sw: upper,
      meaning: `Success: ${sw2Value} more byte${
        sw2Value === 1 ? "" : "s"
      } available — issue GET RESPONSE`,
      severity: "success",
    };
  }
  if (sw1 === "6C") {
    return {
      sw: upper,
      meaning: `Error: wrong Le — retry with Le = ${sw2Value}`,
      severity: "error",
    };
  }
  if (sw1 === "63" && sw2.startsWith("C")) {
    const tries = parseInt(sw2.substring(1), 16);
    return {
      sw: upper,
      meaning: `Warning: verification failed, ${tries} PIN ${
        tries === 1 ? "try" : "tries"
      } remaining`,
      severity: "warning",
    };
  }

  const exact = STATUS_WORDS[upper];
  if (exact) {
    return {
      sw: upper,
      meaning: exact,
      severity: sw1 === "62" || sw1 === "63" ? "warning" : "error",
    };
  }

  return {
    sw: upper,
    meaning: "Unknown status word — may be payment-system or card specific",
    severity: sw1 === "62" || sw1 === "63" ? "warning" : "error",
  };
}

/** Decode P1/P2 for the commands where it carries real meaning. */
function decodeParameters(
  claIns: string,
  p1: string,
  p2: string
): string[] {
  const notes: string[] = [];
  const p1Value = parseInt(p1, 16);
  const p2Value = parseInt(p2, 16);

  switch (claIns) {
    case "00A4": {
      const selectBy =
        p1Value === 0x04
          ? "Select by name (DF name / AID)"
          : p1Value === 0x00
          ? "Select by file identifier"
          : `P1 = ${p1}`;
      notes.push(selectBy);
      notes.push(
        (p2Value & 0x03) === 0x00
          ? "First or only occurrence"
          : (p2Value & 0x03) === 0x02
          ? "Next occurrence"
          : `Occurrence bits = ${(p2Value & 0x03).toString(2)}`
      );
      break;
    }
    case "00B2": {
      const sfi = p2Value >> 3;
      notes.push(`Record number ${p1Value}`);
      notes.push(
        (p2Value & 0x07) === 0x04
          ? `SFI ${sfi}, P1 is a record number`
          : `SFI ${sfi}, unusual reference control ${(p2Value & 0x07)
              .toString(2)
              .padStart(3, "0")}`
      );
      break;
    }
    case "80AE": {
      const acType = p1Value & 0xc0;
      notes.push(
        acType === 0x00
          ? "Requesting AAC (decline)"
          : acType === 0x40
          ? "Requesting TC (offline approve)"
          : acType === 0x80
          ? "Requesting ARQC (go online)"
          : "Requesting AAR (referral)"
      );
      if ((p1Value & 0x10) !== 0) {
        notes.push("CDA signature requested");
      }
      break;
    }
    case "0020": {
      if (p2Value === 0x80) notes.push("Plaintext PIN");
      else if (p2Value === 0x88) notes.push("Enciphered PIN");
      else notes.push(`Reference data qualifier ${p2}`);
      break;
    }
    case "00CA":
    case "80CA": {
      notes.push(`Requesting tag ${p1}${p2}`);
      break;
    }
    default:
      break;
  }

  return notes;
}

/** Notes on the class byte: logical channel and secure messaging. */
function decodeCla(cla: string): string[] {
  const notes: string[] = [];
  const value = parseInt(cla, 16);
  if (Number.isNaN(value)) return notes;

  if ((value & 0xf0) === 0x80) {
    notes.push("Proprietary class (EMV application command)");
  } else if ((value & 0xf0) === 0x00) {
    notes.push("Interindustry class (ISO/IEC 7816-4)");
  }
  const channel = value & 0x03;
  if (channel !== 0) notes.push(`Logical channel ${channel}`);
  if ((value & 0x0c) !== 0) notes.push("Secure messaging indicated");

  return notes;
}

/**
 * Decode a command APDU: CLA INS P1 P2 [Lc data] [Le].
 * Only the short (single-byte length) forms are handled — extended-length
 * APDUs are rare in EMV contact/contactless traces.
 */
function decodeCommand(hex: string): CommandApdu {
  const errors: string[] = [];

  if (hex.length < 8) {
    errors.push("Command APDU needs at least 4 bytes (CLA INS P1 P2)");
  }

  const cla = hex.substring(0, 2);
  const ins = hex.substring(2, 4);
  const p1 = hex.substring(4, 6);
  const p2 = hex.substring(6, 8);
  const claIns = `${cla}${ins}`.toUpperCase();

  let lc: number | undefined;
  let data: string | undefined;
  let le: number | undefined;

  const rest = hex.substring(8);
  if (rest.length === 2) {
    // Case 2: Le only.
    le = parseInt(rest, 16);
  } else if (rest.length > 2) {
    lc = parseInt(rest.substring(0, 2), 16);
    const dataHex = rest.substring(2, 2 + lc * 2);
    data = dataHex;

    if (dataHex.length < lc * 2) {
      errors.push(
        `Lc says ${lc} byte${lc === 1 ? "" : "s"} of data but only ${
          dataHex.length / 2
        } are present`
      );
    }

    const after = rest.substring(2 + lc * 2);
    if (after.length === 2) {
      le = parseInt(after, 16);
    } else if (after.length > 2) {
      errors.push(
        `${after.length / 2} unexpected trailing bytes after the data field`
      );
    }
  }

  return {
    kind: "command",
    cla,
    ins,
    p1,
    p2,
    name: COMMANDS[claIns],
    parameterNotes: decodeParameters(claIns, p1, p2),
    lc,
    data,
    le,
    claNotes: decodeCla(cla),
    errors,
  };
}

/** Decode a response APDU: [data] SW1 SW2. */
function decodeResponse(hex: string): ResponseApdu {
  const errors: string[] = [];
  if (hex.length < 4) {
    errors.push("Response APDU needs at least a 2-byte status word");
    return {
      kind: "response",
      data: "",
      statusWord: decodeStatusWord(hex.padEnd(4, "0")),
      errors,
    };
  }

  return {
    kind: "response",
    data: hex.substring(0, hex.length - 4),
    statusWord: decodeStatusWord(hex.substring(hex.length - 4)),
    errors,
  };
}

/**
 * Decode an APDU. `kind` selects command vs response framing — the same bytes
 * are ambiguous otherwise, so the caller must say which direction it is.
 */
export function decodeApdu(input: string, kind: ApduKind): ApduDecoding {
  const hex = input.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();

  if (hex.length % 2 !== 0) {
    const errors = ["Odd number of hex digits — one nibble is missing"];
    return kind === "command"
      ? { ...decodeCommand(hex.slice(0, -1)), errors }
      : { ...decodeResponse(hex.slice(0, -1)), errors };
  }

  return kind === "command" ? decodeCommand(hex) : decodeResponse(hex);
}
