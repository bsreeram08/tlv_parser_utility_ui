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

export const TERMINAL_VERIFICATION_RESULTS = {
  tag: "95",
  name: "Terminal Verification Results",
  description:
    "Status of the different functions as seen from the terminal",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 5,
  emvSpecRef: "Book 4, Section 6.5.13",
};

// TVR bit specifications based on EMV specifications (5 bytes)
const TVR_VERIFICATION_STATUS = {
  byte1: {
    name: "Byte 1 - Offline Data Authentication",
    bits: {
      0x80: "Offline data authentication was not performed",
      0x40: "SDA failed",
      0x20: "ICC data missing",
      0x10: "Card appears on terminal exception file",
      0x08: "DDA failed",
      0x04: "CDA failed",
      0x02: "SDA selected",
      0x01: "Reserved for use by the payment system"
    }
  },
  byte2: {
    name: "Byte 2 - Cardholder Verification",
    bits: {
      0x80: "ICC and terminal have different application versions",
      0x40: "Expired application",
      0x20: "Application not yet effective",
      0x10: "Requested service not allowed for card product",
      0x08: "New card",
      0x04: "Reserved for use by the payment system",
      0x02: "Reserved for use by the payment system",
      0x01: "Reserved for use by the payment system"
    }
  },
  byte3: {
    name: "Byte 3 - Cardholder Verification",
    bits: {
      0x80: "Cardholder verification was not successful",
      0x40: "Unrecognised CVM",
      0x20: "PIN Try Limit exceeded",
      0x10: "PIN entry required and PIN pad not present or not working",
      0x08: "PIN entry required, PIN pad present, but PIN was not entered",
      0x04: "Online PIN entered",
      0x02: "Reserved for use by the payment system",
      0x01: "Reserved for use by the payment system"
    }
  },
  byte4: {
    name: "Byte 4 - Terminal Risk Management",
    bits: {
      0x80: "Transaction exceeds floor limit",
      0x40: "Lower consecutive offline limit exceeded",
      0x20: "Upper consecutive offline limit exceeded",
      0x10: "Transaction selected randomly for online processing",
      0x08: "Merchant forced transaction online",
      0x04: "Reserved for use by the payment system",
      0x02: "Reserved for use by the payment system",
      0x01: "Reserved for use by the payment system"
    }
  },
  byte5: {
    name: "Byte 5 - Issuer Authentication",
    bits: {
      0x80: "Default TDOL used",
      0x40: "Issuer authentication failed",
      0x20: "Script processing failed before final GENERATE AC",
      0x10: "Script processing failed after final GENERATE AC",
      0x08: "Reserved for use by the payment system",
      0x04: "Reserved for use by the payment system",
      0x02: "Reserved for use by the payment system",
      0x01: "Reserved for use by the payment system"
    }
  }
};

// Common TVR configurations
const COMMON_TVR_CONFIGS = [
  { name: "All OK", value: "0000000000", desc: "No verification issues" },
  { name: "Offline Auth Failed", value: "4000000000", desc: "SDA failed" },
  { name: "PIN Failed", value: "0080000000", desc: "Cardholder verification failed" },
  { name: "Over Floor Limit", value: "0000008000", desc: "Transaction over floor limit" },
];

interface TerminalVerificationResultsProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function TerminalVerificationResultsTag({
  value,
  onChange,
}: TerminalVerificationResultsProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [byteValues, setByteValues] = useState<number[]>([]);

  // Parse hex value to bytes
  const parseToBytes = (hexStr: string): number[] => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(10, "0")
      .substring(0, 10);
    
    return [
      parseInt(validHex.substring(0, 2), 16),
      parseInt(validHex.substring(2, 4), 16),
      parseInt(validHex.substring(4, 6), 16),
      parseInt(validHex.substring(6, 8), 16),
      parseInt(validHex.substring(8, 10), 16),
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

  // Toggle a specific verification status
  const toggleVerification = (byteIndex: number, bitMask: number) => {
    const newBytes = [...byteValues];
    newBytes[byteIndex] ^= bitMask;
    setByteValues(newBytes);
  };

  // Update the hex value when manual input changes
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 10)
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

  // Get active verification issues for a byte
  const getActiveIssues = (byteIndex: number, verifications: Record<number, string>) => {
    const byteVal = byteValues[byteIndex] || 0;
    return Object.entries(verifications)
      .filter(([mask]) => (byteVal & parseInt(mask)) !== 0)
      .map(([, desc]) => desc);
  };

  // Check if there are any verification issues
  const hasIssues = byteValues.some(byte => byte !== 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Terminal Verification Results ({TERMINAL_VERIFICATION_RESULTS.tag})
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
                    {TERMINAL_VERIFICATION_RESULTS.description}<br/>
                    EMV Ref: {TERMINAL_VERIFICATION_RESULTS.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isEditing && (
              <Badge variant={hasIssues ? "destructive" : "secondary"} className="text-xs">
                {hasIssues ? "Issues Detected" : "All OK"}
              </Badge>
            )}
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
                className="w-32 h-8 font-mono text-center"
                maxLength={10}
                placeholder="0000000000"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Presets:</span>
              {COMMON_TVR_CONFIGS.map((config) => (
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

        {/* Compact verification display */}
        <div className="grid gap-3">
          {Object.entries(TVR_VERIFICATION_STATUS).map(([key, verification], byteIndex) => {
            const activeIssues = getActiveIssues(byteIndex, verification.bits);
            const byteVal = byteValues[byteIndex] || 0;
            const hasIssuesInByte = byteVal !== 0;
            
            return (
              <div key={key} className={`border rounded-lg p-3 ${
                hasIssuesInByte ? 'border-red-200' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{verification.name}</h4>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      0x{byteVal.toString(16).padStart(2, "0").toUpperCase()}
                    </code>
                    {hasIssuesInByte && (
                      <Badge variant="destructive" className="text-xs py-0 px-1.5">
                        {activeIssues.length} issue{activeIssues.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {Object.entries(verification.bits).map(([mask, desc]) => {
                    const isActive = (byteVal & parseInt(mask)) !== 0;
                    const isReserved = desc.includes("Reserved");
                    
                    return (
                      <div key={mask} className="flex items-center gap-2">
                        {isEditing && !isReserved ? (
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleVerification(byteIndex, parseInt(mask))}
                            className="h-3 w-3"
                          />
                        ) : (
                          <div className={`h-3 w-3 rounded-sm border ${
                            isActive ? 'bg-red-500 border-red-500' : 'border-muted-foreground'
                          } ${isReserved ? 'opacity-50' : ''}`} />
                        )}
                        <span className={`text-xs ${
                          isActive ? 'font-medium text-red-700' : 'text-muted-foreground'
                        } ${isReserved ? 'italic opacity-75' : ''}`}>
                          {desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {!isEditing && activeIssues.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-red-200">
                    {activeIssues.map((issue, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs py-0 px-1.5">
                        {issue}
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