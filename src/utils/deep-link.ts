/**
 * Deep-link input: `/?tool=<id>#input=<url-encoded value>`.
 *
 * The payload lives in the URL fragment on purpose. Browsers never send the
 * fragment to the server, so card data in a shared link stays on the device.
 * This module only reads strings; the caller owns `window.location`.
 */

export const DEEP_LINK_TOOL_IDS = ["tlv", "iso8583", "apdu"] as const;

export type DeepLinkToolId = (typeof DEEP_LINK_TOOL_IDS)[number];

export type DeepLinkInput = {
  readonly toolId: DeepLinkToolId;
  readonly input: string;
};

export type DeepLinkError = "unknown-tool" | "malformed-encoding" | "empty-input";

export type DeepLinkResult =
  | { readonly kind: "none" }
  | { readonly kind: "ok"; readonly link: DeepLinkInput }
  | { readonly kind: "error"; readonly error: DeepLinkError };

export const DEEP_LINK_ERROR_MESSAGES: Readonly<Record<DeepLinkError, string>> = {
  "unknown-tool": "Use ?tool=tlv, ?tool=iso8583, or ?tool=apdu with #input=.",
  "malformed-encoding": "The #input= value is not valid URL encoding.",
  "empty-input": "The #input= value is empty.",
};

function isDeepLinkToolId(value: string | null): value is DeepLinkToolId {
  return (DEEP_LINK_TOOL_IDS as readonly string[]).includes(value ?? "");
}

/**
 * Read the raw `input` value from a fragment such as `#input=9F26...`.
 * The fragment is split by hand rather than with URLSearchParams, which would
 * turn `+` into a space (corrupting base64) and silently accept bad escapes.
 */
function rawFragmentInput(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const pair of fragment.split("&")) {
    const separator = pair.indexOf("=");
    if (separator >= 0 && pair.slice(0, separator) === "input") {
      return pair.slice(separator + 1);
    }
  }
  return null;
}

/**
 * Parse a deep link from `location.search` and `location.hash`.
 * Returns `none` when there is no `#input=` so ordinary visits are untouched.
 */
export function parseDeepLink(search: string, hash: string): DeepLinkResult {
  const raw = rawFragmentInput(hash);
  if (raw === null) return { kind: "none" };

  const toolId = new URLSearchParams(search).get("tool");
  if (!isDeepLinkToolId(toolId)) return { kind: "error", error: "unknown-tool" };

  let input: string;
  try {
    input = decodeURIComponent(raw).trim();
  } catch {
    return { kind: "error", error: "malformed-encoding" };
  }
  if (input.length === 0) return { kind: "error", error: "empty-input" };

  return { kind: "ok", link: { toolId, input } };
}
