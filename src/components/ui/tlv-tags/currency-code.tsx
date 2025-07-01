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

export const CURRENCY_CODE = {
  tag: "5F2A",
  name: "Transaction Currency Code",
  description: "Indicates the currency code of the transaction according to ISO 4217",
  format: TagFormat.PRIMITIVE,
  class: TagClass.APPLICATION,
  fixedLength: 2,
  emvSpecRef: "Book 4, Section 6.5.6",
};

// Common ISO 4217 currency codes used in payments
const CURRENCY_CODES = {
  "036": { name: "Australian Dollar", symbol: "AUD", sign: "$" },
  "124": { name: "Canadian Dollar", symbol: "CAD", sign: "$" },
  "156": { name: "Chinese Yuan", symbol: "CNY", sign: "¥" },
  "208": { name: "Danish Krone", symbol: "DKK", sign: "kr" },
  "344": { name: "Hong Kong Dollar", symbol: "HKD", sign: "$" },
  "356": { name: "Indian Rupee", symbol: "INR", sign: "₹" },
  "392": { name: "Japanese Yen", symbol: "JPY", sign: "¥" },
  "410": { name: "South Korean Won", symbol: "KRW", sign: "₩" },
  "484": { name: "Mexican Peso", symbol: "MXN", sign: "$" },
  "554": { name: "New Zealand Dollar", symbol: "NZD", sign: "$" },
  "578": { name: "Norwegian Krone", symbol: "NOK", sign: "kr" },
  "702": { name: "Singapore Dollar", symbol: "SGD", sign: "$" },
  "710": { name: "South African Rand", symbol: "ZAR", sign: "R" },
  "752": { name: "Swedish Krona", symbol: "SEK", sign: "kr" },
  "756": { name: "Swiss Franc", symbol: "CHF", sign: "Fr" },
  "826": { name: "British Pound", symbol: "GBP", sign: "£" },
  "840": { name: "US Dollar", symbol: "USD", sign: "$" },
  "978": { name: "Euro", symbol: "EUR", sign: "€" },
};

// Common currency presets
const COMMON_CURRENCY_CONFIGS = [
  { name: "USD", code: "840" },
  { name: "EUR", code: "978" },
  { name: "GBP", code: "826" },
  { name: "JPY", code: "392" },
];

interface CurrencyCodeProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function CurrencyCodeTag({ value, onChange }: CurrencyCodeProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");

  // Convert hex string to decimal currency code
  const hexToCurrencyCode = (hexStr: string): string => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(4, "0")
      .substring(0, 4);
    
    const decimal = parseInt(validHex, 10);
    return decimal.toString().padStart(3, "0");
  };

  // Convert decimal currency code to hex string
  const currencyCodeToHex = (code: string): string => {
    const decimal = parseInt(code, 10);
    return decimal.toString(10).padStart(4, "0");
  };

  // Initialize currency code when value changes
  useEffect(() => {
    const code = hexToCurrencyCode(value);
    setSelectedCode(code);
  }, [value]);

  // Handle currency selection
  const handleCurrencyChange = (code: string) => {
    setSelectedCode(code);
    const newHex = currencyCodeToHex(code);
    setHexValue(newHex);
  };

  // Handle manual hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 4)
      .toUpperCase();
    setHexValue(input);
    
    const code = hexToCurrencyCode(input);
    setSelectedCode(code);
  };

  // Handle save
  const handleSave = () => {
    const newHexValue = currencyCodeToHex(selectedCode);
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

  // Apply preset currency
  const applyCurrencyPreset = (code: string) => {
    setSelectedCode(code);
    setHexValue(currencyCodeToHex(code));
  };

  // Get currency information
  const currentCode = hexToCurrencyCode(value);
  const currencyInfo = CURRENCY_CODES[currentCode as keyof typeof CURRENCY_CODES];
  const isValidCurrency = currencyInfo !== undefined;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Currency Code ({CURRENCY_CODE.tag})
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
                    {CURRENCY_CODE.description}<br/>
                    Standard: ISO 4217<br/>
                    EMV Ref: {CURRENCY_CODE.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isEditing && (
              <Badge 
                variant={isValidCurrency ? "secondary" : "destructive"}
                className="text-xs"
              >
                {isValidCurrency ? currencyInfo.symbol : "Unknown"}
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
                className="w-20 h-8 font-mono text-center"
                maxLength={4}
                placeholder="0840"
              />
              <span className="text-xs text-muted-foreground">
                = {hexToCurrencyCode(hexValue)}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Common:</span>
              {COMMON_CURRENCY_CONFIGS.map((config) => (
                <Button
                  key={config.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyCurrencyPreset(config.code)}
                  className="h-7 text-xs"
                >
                  {config.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Currency Selection */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Currency</h4>
            <Badge variant="outline" className="text-xs font-mono">
              ISO {selectedCode}
            </Badge>
          </div>
          
          {isEditing ? (
            <Select value={selectedCode} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_CODES).map(([code, info]) => (
                  <SelectItem key={code} value={code}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{code}</span>
                      <span className="font-medium">{info.symbol}</span>
                      <span className="text-muted-foreground">{info.name}</span>
                      <span className="text-lg">{info.sign}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              {isValidCurrency ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currencyInfo.sign}</span>
                    <div>
                      <p className="font-medium">{currencyInfo.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {currencyInfo.symbol} • ISO {currentCode}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-destructive">
                  Unknown currency code: {currentCode}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Currency Details */}
        {isValidCurrency && !isEditing && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium text-lg">{currencyInfo.sign}</div>
              <div className="text-muted-foreground">Symbol</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{currencyInfo.symbol}</div>
              <div className="text-muted-foreground">Code</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{currentCode}</div>
              <div className="text-muted-foreground">ISO</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}