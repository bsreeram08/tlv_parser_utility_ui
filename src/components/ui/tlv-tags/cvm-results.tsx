import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Edit3, Save, X, Info } from "lucide-react";
import { toast } from "sonner";
import { TagClass, TagFormat } from "@/types/tlv";

export const CVM_RESULTS = {
  tag: "9F34",
  name: "Cardholder Verification Method (CVM) Results",
  description: "Indicates the results of the last CVM performed",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 3,
  emvSpecRef: "Book 4, Section 6.5.5",
};

// CVM Types (EMV Book 4)
const CVM_TYPES = {
  0x00: "Fail CVM processing",
  0x01: "Plaintext PIN verification performed by ICC",
  0x02: "Enciphered PIN verified online",
  0x03: "Plaintext PIN verification performed by ICC and signature (paper)",
  0x04: "Enciphered PIN verification performed by ICC",
  0x05: "Enciphered PIN verification performed by ICC and signature (paper)",
  0x1e: "Signature (paper)",
  0x1f: "No CVM required",
  0x3f: "Not applicable (cash or cashback transaction)",
};

// CVM Condition Codes
const CVM_CONDITIONS = {
  0x00: "Always",
  0x01: "If unattended cash",
  0x02: "If not unattended cash and not manual cash and not purchase with cashback",
  0x03: "If terminal supports the CVM",
  0x04: "If manual cash",
  0x05: "If purchase with cashback",
  0x06: "If transaction is in the application currency and is under X value",
  0x07: "If transaction is in the application currency and is over X value",
  0x08: "If transaction is in the application currency and is under Y value",
  0x09: "If transaction is in the application currency and is over Y value",
};

// CVM Result Status
const CVM_RESULT_STATUS = {
  0x00: "Unknown",
  0x01: "Failed",
  0x02: "Successful",
};

// Common CVM result configurations
const COMMON_CVM_CONFIGS = [
  {
    name: "PIN Successful",
    value: "020002",
    desc: "Online PIN verification successful",
  },
  {
    name: "PIN Failed",
    value: "020001",
    desc: "Online PIN verification failed",
  },
  {
    name: "Signature",
    value: "1E0002",
    desc: "Signature verification successful",
  },
  { name: "No CVM", value: "1F0002", desc: "No CVM required - successful" },
];

interface CVMResultsProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function CVMResultsTag({ value, onChange }: CVMResultsProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [cvmType, setCvmType] = useState<string>("1F");
  const [cvmCondition, setCvmCondition] = useState<string>("00");
  const [cvmResult, setCvmResult] = useState<string>("02");

  // Parse hex value to CVM components
  const parseCVMResult = (hexStr: string) => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(6, "0")
      .substring(0, 6);

    const type = validHex.substring(0, 2);
    const condition = validHex.substring(2, 4);
    const result = validHex.substring(4, 6);

    setCvmType(type);
    setCvmCondition(condition);
    setCvmResult(result);
  };

  // Build hex from components
  const buildHexFromComponents = () => {
    return (cvmType + cvmCondition + cvmResult).toUpperCase();
  };

  // Initialize when value changes
  useEffect(() => {
    parseCVMResult(value);
  }, [value]);

  // Update hex when components change
  useEffect(() => {
    if (isEditing) {
      setHexValue(buildHexFromComponents());
    }
  }, [cvmType, cvmCondition, cvmResult, isEditing]);

  // Handle manual hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 6)
      .toUpperCase();
    setHexValue(input);
    parseCVMResult(input);
  };

  // Handle save
  const handleSave = () => {
    const newHexValue = buildHexFromComponents();
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

  // Apply preset configuration
  const applyConfig = (configValue: string) => {
    setHexValue(configValue);
    parseCVMResult(configValue);
  };

  // Get current CVM information
  const currentCvmType =
    CVM_TYPES[parseInt(cvmType, 16) as keyof typeof CVM_TYPES] || "Unknown CVM";
  const currentCondition =
    CVM_CONDITIONS[parseInt(cvmCondition, 16) as keyof typeof CVM_CONDITIONS] ||
    "Unknown condition";
  const currentResult =
    CVM_RESULT_STATUS[
      parseInt(cvmResult, 16) as keyof typeof CVM_RESULT_STATUS
    ] || "Unknown";

  const isSuccessful = parseInt(cvmResult, 16) === 2;
  const isFailed = parseInt(cvmResult, 16) === 1;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              CVM Results ({CVM_RESULTS.tag})
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
                    {CVM_RESULTS.description}
                    <br />
                    EMV Ref: {CVM_RESULTS.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isEditing && (
              <Badge
                variant={
                  isSuccessful
                    ? "secondary"
                    : isFailed
                    ? "destructive"
                    : "outline"
                }
                className="text-xs"
              >
                {currentResult}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                  {value.toUpperCase()}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(value.toUpperCase())}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
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
              <Label htmlFor="hex-input" className="text-sm font-medium">
                Hex Value:
              </Label>
              <Input
                id="hex-input"
                value={hexValue}
                onChange={handleHexInputChange}
                className="w-24 h-8 font-mono text-center"
                maxLength={6}
                placeholder="1F0002"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Presets:</span>
              {COMMON_CVM_CONFIGS.map((config) => (
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

        {/* CVM Components Display */}
        <div className="grid gap-3">
          {/* CVM Type */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">CVM Method Performed</h4>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                0x{cvmType}
              </code>
            </div>
            {isEditing ? (
              <Select value={cvmType} onValueChange={setCvmType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CVM_TYPES).map(([code, desc]) => (
                    <SelectItem
                      key={code}
                      value={code.toString().padStart(2, "0").toUpperCase()}
                    >
                      {desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">{currentCvmType}</p>
            )}
          </div>

          {/* CVM Condition */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">CVM Condition</h4>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                0x{cvmCondition}
              </code>
            </div>
            {isEditing ? (
              <Select value={cvmCondition} onValueChange={setCvmCondition}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CVM_CONDITIONS).map(([code, desc]) => (
                    <SelectItem
                      key={code}
                      value={code.toString().padStart(2, "0").toUpperCase()}
                    >
                      {desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {currentCondition}
              </p>
            )}
          </div>

          {/* CVM Result */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">CVM Result</h4>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                0x{cvmResult}
              </code>
            </div>
            {isEditing ? (
              <Select value={cvmResult} onValueChange={setCvmResult}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CVM_RESULT_STATUS).map(([code, desc]) => (
                    <SelectItem
                      key={code}
                      value={code.toString().padStart(2, "0").toUpperCase()}
                    >
                      {desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{currentResult}</p>
                {isSuccessful && (
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                )}
                {isFailed && (
                  <Badge variant="destructive" className="text-xs">
                    ✗
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
