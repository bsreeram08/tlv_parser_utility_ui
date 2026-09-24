import { ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  describeCvmCondition,
  describeCvmMethod,
} from "@/components/ui/tlv-tags/cvm-results";
import { AIP_CAPABILITIES } from "@/components/ui/tlv-tags/application-interchange-profile";
import { TVR_VERIFICATION_STATUS } from "@/components/ui/tlv-tags/terminal-verification-results";

test("9F34 method byte masks the apply-succeeding flag", () => {
  strictEqual(
    describeCvmMethod(0x42),
    "Enciphered PIN verified online (apply succeeding rule if unsuccessful)",
  );
  strictEqual(describeCvmMethod(0x1f), "No CVM required");
  strictEqual(describeCvmMethod(0x3f), "No CVM performed");
  strictEqual(describeCvmMethod(0x25), "Payment system specific CVM");
  strictEqual(describeCvmMethod(0x31), "Issuer specific CVM");
  strictEqual(describeCvmCondition(0x03), "If terminal supports the CVM");
  strictEqual(describeCvmCondition(0x85), "Payment system specific condition");
});

// Mastercard wallet tap with CDCVM (EMV Book C-2 v2.11 A.1.16, A.1.163, CVM.4)
test("Kernel 2 CDCVM case: AIP 1B80, TVR 0000008001, 9F34 010002", () => {
  const set = (bits: Record<number, string>, byte: number) =>
    Object.entries(bits)
      .filter(([mask]) => byte & Number(mask))
      .map(([, label]) => label);

  const aip1 = set(AIP_CAPABILITIES.byte1.bits, 0x1b);
  strictEqual(aip1.length, 4);
  ok(aip1.includes("Cardholder verification is supported"));
  ok(aip1.some((l) => l.startsWith("On device cardholder verification")));
  ok(aip1.includes("CDA supported"));
  ok(set(AIP_CAPABILITIES.byte2.bits, 0x80)[0].startsWith("EMV mode"));

  strictEqual(
    set(TVR_VERIFICATION_STATUS.byte4.bits, 0x80)[0],
    "Transaction exceeds floor limit",
  );
  ok(
    set(TVR_VERIFICATION_STATUS.byte5.bits, 0x01)[0].startsWith(
      "Relay resistance protocol not performed",
    ),
  );
  ok(describeCvmMethod(0x01).includes("on-device CVM"));
});
