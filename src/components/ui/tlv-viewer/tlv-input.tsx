/**
 * TLV Input Component
 *
 * A component for entering and validating TLV data in hexadecimal format.
 */

import { useState, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TlvInputProps {
  onParse: (hexString: string) => void;
  initialValue?: string;
}

export function TlvInput({
  onParse,
  initialValue = "",
}: TlvInputProps): JSX.Element {
  const [hexInput, setHexInput] = useState<string>(initialValue);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate hex string input
   */
  const validateHexString = (input: string): boolean => {
    // Remove spaces and normalize to uppercase
    const normalized = input.replace(/\s/g, "").toUpperCase();

    // Check if it's a valid hex string with even number of characters
    const isValid =
      /^[0-9A-F]*$/.test(normalized) && normalized.length % 2 === 0;

    if (!isValid && normalized.length > 0) {
      setError(
        "Input must be a valid hexadecimal string with an even number of characters"
      );
      return false;
    }

    setError(null);
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();

    if (validateHexString(hexInput)) {
      onParse(hexInput);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const value = event.target.value;
    setHexInput(value);
    validateHexString(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="tlv-hex-input">Enter TLV Hexadecimal Data</Label>
        <Textarea
          id="tlv-hex-input"
          placeholder="Example: 9F2608C1C2C3C4C5C6C7C8"
          value={hexInput}
          onChange={handleInputChange}
          className="font-mono h-24"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={hexInput.trim().length === 0}>
          Parse TLV Data
        </Button>
      </div>
    </form>
  );
}
