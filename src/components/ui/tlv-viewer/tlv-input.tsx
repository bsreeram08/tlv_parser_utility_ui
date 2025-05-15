/**
 * TLV Input Component
 *
 * A component for entering and validating TLV data in both hexadecimal and Base64 formats.
 * Automatically detects input format and uses Zod for schema validation.
 */

import { useState, useEffect, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Copy, Trash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Define TLV input format types
type TlvFormat = "hex" | "base64" | "unknown";

interface TlvInputProps {
  onParse: (data: { value: string; format: TlvFormat }) => void;
  initialValue?: string;
}

export function TlvInput({
  onParse,
  initialValue = "",
}: TlvInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState<string>(initialValue || "");
  const [detectedFormat, setDetectedFormat] = useState<TlvFormat>("unknown");
  const [error, setError] = useState<string | null>(null);

  // Safely check if a value is a non-empty string
  function isNonEmptyString(value: unknown): boolean {
    return typeof value === "string" && value.length > 0;
  }

  // Check if a string is valid hex (even length and only hex characters)
  function isValidHex(value: string): boolean {
    return (
      /^[0-9A-Fa-f]*$/.test(value) && value.length % 2 === 0 && value.length > 0
    );
  }

  // Check if a string might be Base64
  function mightBeBase64(value: string): boolean {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length > 0;
  }

  // Detect format without setting error
  function detectFormat(value: string): TlvFormat {
    // Safety check for non-string values
    if (!isNonEmptyString(value)) {
      return "unknown";
    }

    // Now that we know it's a string, we can safely use string methods
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return "unknown";
    }

    // Check for hex format
    if (isValidHex(trimmedValue)) {
      return "hex";
    }

    // Check for Base64 format
    if (mightBeBase64(trimmedValue)) {
      try {
        // Attempt to decode to verify it's valid Base64
        window.atob(trimmedValue);
        return "base64";
      } catch (e) {
        // Not valid Base64
      }
    }

    return "unknown";
  }

  // Check initial format once on mount
  useEffect(() => {
    if (isNonEmptyString(initialValue)) {
      const format = detectFormat(initialValue);
      setDetectedFormat(format);
    }
  }, []);

  // Validate input with error reporting
  function validateInput(value: string): TlvFormat {
    if (!isNonEmptyString(value)) {
      setError(null);
      return "unknown";
    }

    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      setError(null);
      return "unknown";
    }

    const format = detectFormat(trimmedValue);

    if (format !== "unknown") {
      setError(null);
      return format;
    }

    // Provide appropriate error message based on input
    if (/^[0-9A-Fa-f]*$/.test(trimmedValue)) {
      setError("Hex string must have an even number of characters");
    } else if (/^[A-Za-z0-9+/=]*$/.test(trimmedValue)) {
      setError("Invalid Base64 format");
    } else {
      setError("Input must be valid hexadecimal or Base64");
    }

    return "unknown";
  }

  function handleInputChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void {
    const value = event.target.value;
    setInputValue(value);
    const format = validateInput(value);
    setDetectedFormat(format);
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();

    if (!isNonEmptyString(inputValue) || inputValue.trim() === "") {
      setError("Input cannot be empty");
      return;
    }

    if (detectedFormat === "unknown") {
      setError("Unable to detect a valid format");
      return;
    }

    // Pass to parent
    onParse({ value: inputValue, format: detectedFormat });
  }

  function handleClear(): void {
    setInputValue("");
    setError(null);
    setDetectedFormat("unknown");
  }

  function copyToClipboard(): void {
    if (!isNonEmptyString(inputValue)) return;

    try {
      navigator.clipboard.writeText(inputValue).then(
        () => toast.success("Copied to clipboard!"),
        () => toast.error("Failed to copy to clipboard")
      );
    } catch (e) {
      toast.error("Failed to copy to clipboard");
      console.error("Copy failed:", e);
    }
  }

  // Simple and safe hex to base64 conversion
  function convertHexToBase64(hex: string): string {
    try {
      if (!isNonEmptyString(hex)) {
        throw new Error("Invalid hex input");
      }

      // Remove any spaces and ensure uppercase
      const cleanHex = hex.replace(/\s/g, "").toUpperCase();

      // Must be even length
      if (cleanHex.length % 2 !== 0) {
        throw new Error("Hex string must have an even number of characters");
      }

      // Create binary string
      let binaryString = "";
      for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.substring(i, i + 2), 16);
        binaryString += String.fromCharCode(byte);
      }

      // Convert to base64
      return window.btoa(binaryString);
    } catch (e) {
      console.error("Hex to Base64 conversion failed:", e);
      throw new Error("Failed to convert hex to Base64");
    }
  }

  // Simple and safe base64 to hex conversion
  function convertBase64ToHex(base64: string): string {
    try {
      if (!isNonEmptyString(base64)) {
        throw new Error("Invalid Base64 input");
      }

      // Get binary string from base64
      const binaryString = window.atob(base64);

      // Convert to hex
      let hex = "";
      for (let i = 0; i < binaryString.length; i++) {
        const byte = binaryString.charCodeAt(i);
        hex += byte.toString(16).padStart(2, "0").toUpperCase();
      }

      return hex;
    } catch (e) {
      console.error("Base64 to hex conversion failed:", e);
      throw new Error("Failed to convert Base64 to hex");
    }
  }

  // Switch between formats
  function toggleFormat(): void {
    if (!isNonEmptyString(inputValue)) return;

    try {
      if (detectedFormat === "hex") {
        const base64 = convertHexToBase64(inputValue);
        setInputValue(base64);
        setDetectedFormat("base64");
        setError(null);
      } else if (detectedFormat === "base64") {
        const hex = convertBase64ToHex(inputValue);
        setInputValue(hex);
        setDetectedFormat("hex");
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    }
  }

  return (
    <div className="space-y-4 w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="tlv-input">Enter TLV Data</Label>
              {detectedFormat !== "unknown" && (
                <Badge variant="outline">
                  {detectedFormat === "hex" ? "Hex" : "Base64"} detected
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              {detectedFormat !== "unknown" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleFormat}
                >
                  Convert to {detectedFormat === "hex" ? "Base64" : "Hex"}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                disabled={!inputValue}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                disabled={!inputValue}
                title="Clear input"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Textarea
            id="tlv-input"
            placeholder="Enter hex (9F2608C1C2C3C4C5C6C7C8) or Base64 (nyYIwcLDxMXGx8g=)"
            value={inputValue}
            onChange={handleInputChange}
            className="font-mono h-24"
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!inputValue || detectedFormat === "unknown"}
          >
            Parse TLV Data
          </Button>
        </div>
      </form>
    </div>
  );
}
