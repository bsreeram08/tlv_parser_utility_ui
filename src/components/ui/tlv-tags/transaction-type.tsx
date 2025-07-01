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

export const TRANSACTION_TYPE = {
  tag: "9C",
  name: "Transaction Type",
  description:
    "Indicates the type of financial transaction, represented by the first two digits of the ISO 8583:1987 Processing Code",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 1,
  emvSpecRef: "Book 4, Section 6.5.16",
};

// Transaction types based on ISO 8583 Processing Code
const TRANSACTION_TYPES = {
  "00": {
    name: "Purchase",
    description: "Goods or services purchase",
    category: "Standard",
  },
  "01": {
    name: "Cash Advance",
    description: "Cash withdrawal from credit account",
    category: "Cash",
  },
  "02": {
    name: "Adjustment",
    description: "Transaction adjustment",
    category: "Administrative",
  },
  "03": {
    name: "Check Guarantee",
    description: "Check guarantee service",
    category: "Administrative",
  },
  "04": {
    name: "Check Verification",
    description: "Check verification service",
    category: "Administrative",
  },
  "05": {
    name: "Eurocheque",
    description: "Eurocheque transaction",
    category: "Administrative",
  },
  "06": {
    name: "Traveler Check",
    description: "Traveler's check transaction",
    category: "Administrative",
  },
  "07": {
    name: "Letter of Credit",
    description: "Letter of credit transaction",
    category: "Administrative",
  },
  "08": { name: "Giro", description: "Giro payment", category: "Transfer" },
  "09": {
    name: "Cash Deposit",
    description: "Cash deposit to account",
    category: "Cash",
  },
  "10": {
    name: "Check Deposit",
    description: "Check deposit",
    category: "Deposit",
  },
  "11": {
    name: "Eurocheque Deposit",
    description: "Eurocheque deposit",
    category: "Deposit",
  },
  "12": {
    name: "Savings Deposit",
    description: "Savings account deposit",
    category: "Deposit",
  },
  "13": {
    name: "Adjustment Credit",
    description: "Credit adjustment",
    category: "Administrative",
  },
  "14": {
    name: "Adjustment Debit",
    description: "Debit adjustment",
    category: "Administrative",
  },
  "15": {
    name: "Cashback",
    description: "Purchase with cashback",
    category: "Standard",
  },
  "16": {
    name: "Currency Exchange",
    description: "Currency exchange transaction",
    category: "Exchange",
  },
  "17": {
    name: "Bill Payment",
    description: "Bill payment transaction",
    category: "Payment",
  },
  "18": {
    name: "Government Payment",
    description: "Government fee payment",
    category: "Payment",
  },
  "19": {
    name: "Tax Payment",
    description: "Tax payment",
    category: "Payment",
  },
  "20": {
    name: "Refund",
    description: "Refund transaction",
    category: "Refund",
  },
  "21": {
    name: "Credit Return",
    description: "Credit card refund",
    category: "Refund",
  },
  "22": {
    name: "Debit Return",
    description: "Debit card refund",
    category: "Refund",
  },
  "30": {
    name: "Balance Inquiry",
    description: "Account balance inquiry",
    category: "Inquiry",
  },
  "31": {
    name: "Available Balance",
    description: "Available balance inquiry",
    category: "Inquiry",
  },
  "38": {
    name: "Mini Statement",
    description: "Mini statement request",
    category: "Inquiry",
  },
  "40": {
    name: "Account Transfer",
    description: "Transfer between accounts",
    category: "Transfer",
  },
  "50": {
    name: "Payment",
    description: "General payment",
    category: "Payment",
  },
  "89": {
    name: "Loyalty Transaction",
    description: "Loyalty points transaction",
    category: "Loyalty",
  },
  "90": {
    name: "PIN Change",
    description: "PIN change service",
    category: "Administrative",
  },
};

// Transaction type categories for filtering
const TRANSACTION_CATEGORIES = {
  Standard: ["00", "15"],
  Cash: ["01", "09"],
  Refund: ["20", "21", "22"],
  Inquiry: ["30", "31", "38"],
  Transfer: ["08", "40"],
  Payment: ["17", "18", "19", "50"],
  Administrative: ["02", "03", "04", "05", "06", "07", "13", "14", "90"],
};

// Common transaction type presets
const COMMON_TRANSACTION_CONFIGS = [
  { name: "Purchase", code: "00" },
  { name: "Cash Advance", code: "01" },
  { name: "Refund", code: "20" },
  { name: "Balance Inquiry", code: "30" },
];

interface TransactionTypeProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function TransactionTypeTag({ value, onChange }: TransactionTypeProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");

  // Convert hex to transaction type
  const hexToTransactionType = (hexStr: string): string => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(2, "0")
      .substring(0, 2);

    const decimal = parseInt(validHex, 16);
    return decimal.toString().padStart(2, "0");
  };

  // Convert transaction type to hex
  const transactionTypeToHex = (type: string): string => {
    const decimal = parseInt(type, 10);
    return decimal.toString(16).padStart(2, "0").toUpperCase();
  };

  // Initialize transaction type when value changes
  useEffect(() => {
    const type = hexToTransactionType(value);
    setSelectedType(type);
  }, [value]);

  // Handle transaction type selection
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const newHex = transactionTypeToHex(type);
    setHexValue(newHex);
  };

  // Handle manual hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 2)
      .toUpperCase();
    setHexValue(input);

    const type = hexToTransactionType(input);
    setSelectedType(type);
  };

  // Handle save
  const handleSave = () => {
    const newHexValue = transactionTypeToHex(selectedType);
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

  // Apply preset transaction type
  const applyTypePreset = (code: string) => {
    setSelectedType(code);
    setHexValue(transactionTypeToHex(code));
  };

  // Get transaction information
  const currentType = hexToTransactionType(value);
  const transactionInfo =
    TRANSACTION_TYPES[currentType as keyof typeof TRANSACTION_TYPES];
  const isValidType = transactionInfo !== undefined;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Transaction Type ({TRANSACTION_TYPE.tag})
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
                    {TRANSACTION_TYPE.description}
                    <br />
                    Standard: ISO 8583
                    <br />
                    EMV Ref: {TRANSACTION_TYPE.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isEditing && (
              <Badge
                variant={isValidType ? "secondary" : "destructive"}
                className="text-xs"
              >
                {isValidType ? transactionInfo.category : "Unknown"}
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
                className="w-16 h-8 font-mono text-center"
                maxLength={2}
                placeholder="00"
              />
              <span className="text-xs text-muted-foreground">
                = Type {hexToTransactionType(hexValue)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Common:</span>
              {COMMON_TRANSACTION_CONFIGS.map((config) => (
                <Button
                  key={config.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTypePreset(config.code)}
                  className="h-7 text-xs"
                >
                  {config.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Type Selection */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Transaction Type</h4>
            <Badge variant="outline" className="text-xs font-mono">
              Code {selectedType}
            </Badge>
          </div>

          {isEditing ? (
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSACTION_CATEGORIES).map(
                  ([category, codes]) => (
                    <div key={category}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                        {category}
                      </div>
                      {codes.map((code) => {
                        const info =
                          TRANSACTION_TYPES[
                            code as keyof typeof TRANSACTION_TYPES
                          ];
                        return (
                          <SelectItem key={code} value={code}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs w-6">
                                {code}
                              </span>
                              <span className="font-medium">{info.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {info.description}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </div>
                  )
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              {isValidType ? (
                <>
                  <p className="font-medium">{transactionInfo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {transactionInfo.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {transactionInfo.category}
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-destructive">
                  Unknown transaction type: {currentType}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {isValidType && !isEditing && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{currentType}</div>
              <div className="text-muted-foreground">Code</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{transactionInfo.category}</div>
              <div className="text-muted-foreground">Category</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">0x{value.toUpperCase()}</div>
              <div className="text-muted-foreground">Hex</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
