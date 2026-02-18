import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Edit3, Save, X, Info } from "lucide-react";
import { toast } from "sonner";
import { TagClass, TagFormat } from "@/types/tlv";
import { parseHexToBytes, bytesToHex, toggleBit, isBitSet } from "@/utils/byte-utils";

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

// Compact capability definitions
const CAPABILITIES = {
  byte1: {
    name: "Card Data Input",
    bits: {
      0x80: "Manual key entry",
      0x40: "Magnetic stripe", 
      0x20: "IC with contacts"
    }
  },
  byte2: {
    name: "CVM Capability",
    bits: {
      0x80: "Plaintext PIN offline",
      0x40: "Enciphered PIN online",
      0x20: "Signature (paper)",
      0x10: "Enciphered PIN offline",
      0x08: "No CVM Required"
    }
  },
  byte3: {
    name: "Security Capability", 
    bits: {
      0x80: "SDA",
      0x40: "DDA",
      0x20: "Card capture",
      0x08: "CDA"
    }
  }
};

// Common configurations
const COMMON_CONFIGS = [
  { name: "Basic Contact", value: "E0E000", desc: "Manual + MSR + Contact" },
  { name: "Full Contact", value: "E0F088", desc: "All input + All CVM + SDA/DDA" },
  { name: "Contactless", value: "E0F8C8", desc: "Full capabilities + CDA" },
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
  const [byteValues, setByteValues] = useState<number[]>([]);

  // Parse hex value to bytes
  // Initialize byte values when the value prop changes
  useEffect(() => {
    setByteValues(parseHexToBytes(value, 3));
  }, [value]);

  // Toggle a specific capability
  const toggleCapability = (byteIndex: number, bitMask: number) => {
    const newBytes = [...byteValues];
    newBytes[byteIndex] = toggleBit(newBytes[byteIndex], bitMask);
    setByteValues(newBytes);
  };

  // Update the hex value when manual input changes
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 6)
      .toUpperCase();
    setHexValue(input);
    setByteValues(parseHexToBytes(input, 3));
  };

  // Handle save
  const handleSave = () => {
    const newHexValue = bytesToHex(byteValues);
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
    setByteValues(parseHexToBytes(configValue, 3));
  };

  // Get active capabilities for a byte
  const getActiveCapabilities = (byteIndex: number, capabilities: Record<number, string>) => {
    const byteVal = byteValues[byteIndex] || 0;
    return Object.entries(capabilities)
      .filter(([mask]) => isBitSet(byteVal, parseInt(mask)))
      .map(([, desc]) => desc);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Terminal Capabilities ({TERMINAL_CAPABILITIES.tag})
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm max-w-xs">
                    {TERMINAL_CAPABILITIES.description}<br/>
                    EMV Ref: {TERMINAL_CAPABILITIES.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-3 w-3 mr-1" />Cancel
                </Button>
              </>
            ) : (
              <>
                <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                  {value.toUpperCase()}
                </code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(value.toUpperCase())}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-3 w-3 mr-1" />Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isEditing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="hex-input" className="text-sm font-medium">Hex Value:</Label>
              <Input
                id="hex-input"
                value={hexValue}
                onChange={handleHexInputChange}
                className="w-24 h-8 font-mono text-center"
                maxLength={6}
                placeholder="E0F088"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Presets:</span>
              {COMMON_CONFIGS.map((config) => (
                <TooltipProvider key={config.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyConfig(config.value)}
                        className="h-7 text-xs"
                      >
                        {config.name}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{config.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* Compact capability display */}
        <div className="grid gap-3">
          {Object.entries(CAPABILITIES).map(([key, cap], byteIndex) => {
            const activeCaps = getActiveCapabilities(byteIndex, cap.bits);
            const byteVal = byteValues[byteIndex] || 0;
            
            return (
              <div key={key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{cap.name}</h4>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    0x{byteVal.toString(16).padStart(2, "0").toUpperCase()}
                  </code>
                </div>
                
                <div className="space-y-1">
                  {Object.entries(cap.bits).map(([mask, desc]) => {
                    const isActive = (byteVal & parseInt(mask)) !== 0;
                    return (
                      <div key={mask} className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleCapability(byteIndex, parseInt(mask))}
                            className="h-3 w-3"
                          />
                        ) : (
                          <div className={`h-3 w-3 rounded-sm border ${isActive ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                        )}
                        <span className={`text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                          {desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {!isEditing && activeCaps.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {activeCaps.map((cap, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs py-0 px-1.5">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
