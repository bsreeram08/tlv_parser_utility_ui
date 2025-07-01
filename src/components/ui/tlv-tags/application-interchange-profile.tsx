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

export const APPLICATION_INTERCHANGE_PROFILE = {
  tag: "82",
  name: "Application Interchange Profile",
  description:
    "Indicates the capabilities of the card to support specific functions in the application",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 2,
  emvSpecRef: "Book 4, Section 6.5.1",
};

// AIP bit specifications based on EMV specifications
const AIP_CAPABILITIES = {
  byte1: {
    name: "Byte 1 - Processing Options",
    bits: {
      0x80: "SDA supported",
      0x40: "DDA supported", 
      0x20: "Cardholder verification is supported",
      0x10: "Terminal risk management is to be performed",
      0x08: "Issuer authentication is supported",
      0x04: "Reserved for use by the payment system",
      0x02: "CDA supported",
      0x01: "Reserved for use by the payment system"
    }
  },
  byte2: {
    name: "Byte 2 - Additional Options",
    bits: {
      0x80: "Reserved for use by the payment system",
      0x40: "Reserved for use by the payment system",
      0x20: "Reserved for use by the payment system", 
      0x10: "Reserved for use by the payment system",
      0x08: "Reserved for use by the payment system",
      0x04: "Reserved for use by the payment system",
      0x02: "Reserved for use by the payment system",
      0x01: "Reserved for use by the payment system"
    }
  }
};

// Common AIP configurations
const COMMON_AIP_CONFIGS = [
  { name: "SDA Only", value: "8000", desc: "Static Data Authentication only" },
  { name: "DDA", value: "4000", desc: "Dynamic Data Authentication" },
  { name: "CDA", value: "4200", desc: "Combined DDA/Application Cryptogram" },
  { name: "Full Support", value: "FC00", desc: "All authentication methods" },
];

interface ApplicationInterchangeProfileProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function ApplicationInterchangeProfileTag({
  value,
  onChange,
}: ApplicationInterchangeProfileProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [byteValues, setByteValues] = useState<number[]>([]);

  // Parse hex value to bytes
  const parseToBytes = (hexStr: string): number[] => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(4, "0")
      .substring(0, 4);
    
    return [
      parseInt(validHex.substring(0, 2), 16),
      parseInt(validHex.substring(2, 4), 16),
    ];
  };

  // Convert bytes back to hex
  const bytesToHex = (bytes: number[]) => {
    return bytes
      .map(byte => byte.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  };

  // Initialize byte values when the value prop changes
  useEffect(() => {
    setByteValues(parseToBytes(value));
  }, [value]);

  // Toggle a specific capability
  const toggleCapability = (byteIndex: number, bitMask: number) => {
    const newBytes = [...byteValues];
    newBytes[byteIndex] ^= bitMask;
    setByteValues(newBytes);
  };

  // Update the hex value when manual input changes
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 4)
      .toUpperCase();
    setHexValue(input);
    setByteValues(parseToBytes(input));
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
    setByteValues(parseToBytes(configValue));
  };

  // Get active capabilities for a byte
  const getActiveCapabilities = (byteIndex: number, capabilities: Record<number, string>) => {
    const byteVal = byteValues[byteIndex] || 0;
    return Object.entries(capabilities)
      .filter(([mask]) => (byteVal & parseInt(mask)) !== 0)
      .map(([, desc]) => desc);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Application Interchange Profile ({APPLICATION_INTERCHANGE_PROFILE.tag})
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
                    {APPLICATION_INTERCHANGE_PROFILE.description}<br/>
                    EMV Ref: {APPLICATION_INTERCHANGE_PROFILE.emvSpecRef}
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
                className="w-20 h-8 font-mono text-center"
                maxLength={4}
                placeholder="8000"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Presets:</span>
              {COMMON_AIP_CONFIGS.map((config) => (
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
          {Object.entries(AIP_CAPABILITIES).map(([key, cap], byteIndex) => {
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
                    const isReserved = desc.includes("Reserved");
                    
                    return (
                      <div key={mask} className="flex items-center gap-2">
                        {isEditing && !isReserved ? (
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleCapability(byteIndex, parseInt(mask))}
                            className="h-3 w-3"
                          />
                        ) : (
                          <div className={`h-3 w-3 rounded-sm border ${
                            isActive ? 'bg-primary border-primary' : 'border-muted-foreground'
                          } ${isReserved ? 'opacity-50' : ''}`} />
                        )}
                        <span className={`text-xs ${
                          isActive ? 'font-medium' : 'text-muted-foreground'
                        } ${isReserved ? 'italic opacity-75' : ''}`}>
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