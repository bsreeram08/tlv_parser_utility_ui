import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { TagClass, TagFormat } from "@/types/tlv";

export const TERMINAL_CAPABILITIES = {
  tag: "9F33",
  name: "Terminal Capabilities",
  description:
    "Indicates the card data input, CVM, and security capabilities of the terminal",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 6,
  emvSpecRef: "Book 4, Section 6.5.14",
};

// Define bit specifications for each byte based on the exact table
const BYTE_SPECS = [
  {
    name: "Byte 1 - Card Data Input Capability",
    bits: [
      { position: 8, description: "Manual key entry" },
      { position: 7, description: "Magnetic stripe" },
      { position: 6, description: "IC with contacts" },
      { position: 5, description: "RFU" },
      { position: 4, description: "RFU" },
      { position: 3, description: "RFU" },
      { position: 2, description: "RFU" },
      { position: 1, description: "RFU" },
    ],
  },
  {
    name: "Byte 2 - CVM Capability",
    bits: [
      {
        position: 8,
        description: "Plaintext PIN for offline ICC verification",
      },
      { position: 7, description: "Enciphered PIN for online verification" },
      { position: 6, description: "Signature (paper)" },
      { position: 5, description: "Enciphered PIN for offline verification" },
      { position: 4, description: "No CVM Required" },
      { position: 3, description: "RFU" },
      { position: 2, description: "RFU" },
      { position: 1, description: "RFU" },
    ],
  },
  {
    name: "Byte 3 - Security Capability",
    bits: [
      { position: 8, description: "Static Data Authentication (SDA)" },
      { position: 7, description: "Dynamic Data Authentication (DDA)" },
      { position: 6, description: "Capture card" },
      { position: 5, description: "RFU" },
      {
        position: 4,
        description: "Combined DDA/Application Cryptogram Generation",
      },
      { position: 3, description: "RFU" },
      { position: 2, description: "RFU" },
      { position: 1, description: "RFU" },
    ],
  },
];

// Common configurations
const COMMON_CONFIGS = [
  { name: "Basic Contact", value: "E0E000" },
  { name: "Full Contact", value: "E0F088" },
  { name: "Contact+Contactless", value: "E0F8C8" },
];

interface TerminalCapabilitiesTagProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function TerminalCapabilitiesTag({
  value,
  onChange,
}: TerminalCapabilitiesTagProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [bitValues, setBitValues] = useState<Array<Array<boolean>>>([]);

  // Parse hex value to bit arrays for the table
  const parseToBits = (hexStr: string): Array<Array<boolean>> => {
    // Ensure we have exactly 6 characters (3 bytes)
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(6, "0")
      .substring(0, 6);

    // Convert each byte to binary and then to a boolean array
    const bytes = [
      parseInt(validHex.substring(0, 2), 16),
      parseInt(validHex.substring(2, 4), 16),
      parseInt(validHex.substring(4, 6), 16),
    ];

    // Convert to 3-dimensional array [byte][bit][value]
    return bytes.map((byte) =>
      Array.from({ length: 8 }, (_, i) => ((byte >> (7 - i)) & 1) === 1)
    );
  };

  // Convert bit array back to hex
  const bitsToHex = (bits: boolean[][]) => {
    return bits
      .map((byteBits) => {
        let byteValue = 0;
        byteBits.forEach((bit, index) => {
          if (bit) {
            byteValue |= 1 << (7 - index);
          }
        });
        return byteValue.toString(16).padStart(2, "0").toUpperCase();
      })
      .join("");
  };

  // Initialize bit values when the value prop changes
  useEffect(() => {
    setBitValues(parseToBits(value));
  }, [value]);

  // Toggle a specific bit
  const toggleBit = (byteIndex: number, bitIndex: number) => {
    const newBitValues = [...bitValues];
    newBitValues[byteIndex][bitIndex] = !newBitValues[byteIndex][bitIndex];
    setBitValues(newBitValues);
  };

  // Update the hex value when manual input changes
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 6)
      .toUpperCase();
    setHexValue(input);
    setBitValues(parseToBits(input));
  };

  // Handle save
  const handleSave = () => {
    const newHexValue = bitsToHex(bitValues);
    setHexValue(newHexValue);
    onChange(newHexValue);
    setIsEditing(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    });
  };

  // Apply a predefined configuration
  const applyConfig = (configValue: string) => {
    setHexValue(configValue);
    setBitValues(parseToBits(configValue));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {TERMINAL_CAPABILITIES.name} ({TERMINAL_CAPABILITIES.tag})
            </CardTitle>
            <CardDescription>
              {TERMINAL_CAPABILITIES.description}
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  EMV Reference: {TERMINAL_CAPABILITIES.emvSpecRef}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="hex-value">Hex Value:</Label>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <Input
                  id="hex-value"
                  value={hexValue}
                  onChange={handleHexInputChange}
                  className="w-32 font-mono text-right"
                  maxLength={6}
                />
              ) : (
                <div className="flex items-center">
                  <code className="bg-muted px-2 py-1 rounded font-mono">
                    {value.toUpperCase()}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(value.toUpperCase())}
                    className="ml-1 h-7 w-7"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex space-x-2 mt-2">
              {COMMON_CONFIGS.map((config) => (
                <Button
                  key={config.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyConfig(config.value)}
                >
                  {config.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Bit table layout exactly as in the example */}
        <div className="space-y-6">
          {BYTE_SPECS.map((byteSpec, byteIndex) => (
            <div key={byteIndex}>
              <h3 className="font-medium mb-2">{byteSpec.name}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border px-2 py-1 w-10 text-center">b8</th>
                      <th className="border px-2 py-1 w-10 text-center">b7</th>
                      <th className="border px-2 py-1 w-10 text-center">b6</th>
                      <th className="border px-2 py-1 w-10 text-center">b5</th>
                      <th className="border px-2 py-1 w-10 text-center">b4</th>
                      <th className="border px-2 py-1 w-10 text-center">b3</th>
                      <th className="border px-2 py-1 w-10 text-center">b2</th>
                      <th className="border px-2 py-1 w-10 text-center">b1</th>
                      <th className="border px-4 py-1 text-left">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byteSpec.bits.map((bit, bitIndex) => (
                      <tr key={bitIndex}>
                        {Array.from({ length: 8 }, (_, i) => (
                          <td
                            key={i}
                            className={`border px-2 py-1 text-center ${
                              i === 8 - bit.position
                                ? bitValues[byteIndex]?.[i]
                                  ? "bg-primary/10"
                                  : ""
                                : ""
                            }`}
                            onClick={() =>
                              isEditing ? toggleBit(byteIndex, i) : null
                            }
                            style={{
                              cursor: isEditing ? "pointer" : "default",
                            }}
                          >
                            {i === 8 - bit.position
                              ? bitValues[byteIndex]?.[i]
                                ? "1"
                                : "0"
                              : ""}
                          </td>
                        ))}
                        <td
                          className={`border px-4 py-1 text-left ${
                            bitValues[byteIndex]?.[8 - bit.position]
                              ? "bg-primary/10"
                              : ""
                          }`}
                        >
                          {bit.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            EMV Spec Reference: {TERMINAL_CAPABILITIES.emvSpecRef}
          </p>
        </div>
        <div>
          {isEditing ? (
            <div className="space-x-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
