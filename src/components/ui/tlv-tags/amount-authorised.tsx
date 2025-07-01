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
import { Copy, Edit3, Save, X, Info, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { TagClass, TagFormat } from "@/types/tlv";

export const AMOUNT_AUTHORISED = {
  tag: "9F02",
  name: "Amount, Authorised (Numeric)",
  description: "Authorized amount of the transaction (excluding adjustments)",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 6,
  emvSpecRef: "Book 4, Section 6.5.2",
};

// Common currency symbols for display
const CURRENCY_SYMBOLS = {
  "USD": "$",
  "EUR": "€",
  "GBP": "£",
  "JPY": "¥",
  "CNY": "¥",
  "INR": "₹",
  "KRW": "₩",
  "CHF": "Fr",
  "CAD": "$",
  "AUD": "$",
  "DEFAULT": "$"
};

// Common amount presets (in minor currency units)
const COMMON_AMOUNT_CONFIGS = [
  { name: "$1.00", value: "000000000100", amount: 100 },
  { name: "$5.00", value: "000000000500", amount: 500 },
  { name: "$10.00", value: "000000001000", amount: 1000 },
  { name: "$25.00", value: "000000002500", amount: 2500 },
  { name: "$50.00", value: "000000005000", amount: 5000 },
  { name: "$100.00", value: "000000010000", amount: 10000 },
];

interface AmountAuthorisedProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function AmountAuthorisedTag({ value, onChange }: AmountAuthorisedProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [decimalAmount, setDecimalAmount] = useState<string>("");
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");

  // Convert hex string to decimal amount (in minor currency units)
  const hexToAmount = (hexStr: string): number => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(12, "0")
      .substring(0, 12);
    
    return parseInt(validHex, 10);
  };

  // Convert decimal amount to hex string
  const amountToHex = (amount: number): string => {
    return amount.toString(10).padStart(12, "0");
  };

  // Format amount for display (major currency units)
  const formatAmount = (amount: number, currency: string = "USD"): string => {
    // Most currencies use 2 decimal places, JPY and KRW use 0
    const decimals = ["JPY", "KRW"].includes(currency) ? 0 : 2;
    const divisor = decimals === 0 ? 1 : 100;
    
    const majorAmount = amount / divisor;
    return majorAmount.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Parse user input amount to minor currency units
  const parseAmountInput = (input: string, currency: string = "USD"): number => {
    // Remove currency symbols and formatting
    const cleaned = input.replace(/[^\d.]/g, "");
    const amount = parseFloat(cleaned) || 0;
    
    // Convert to minor currency units
    const decimals = ["JPY", "KRW"].includes(currency) ? 0 : 2;
    const multiplier = decimals === 0 ? 1 : 100;
    
    return Math.round(amount * multiplier);
  };

  // Initialize amount when value changes
  useEffect(() => {
    const amount = hexToAmount(value);
    setDecimalAmount(formatAmount(amount, displayCurrency));
  }, [value, displayCurrency]);

  // Handle amount input change
  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDecimalAmount(input);
    
    const amount = parseAmountInput(input, displayCurrency);
    const newHex = amountToHex(amount);
    setHexValue(newHex);
  };

  // Handle manual hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 12)
      .toUpperCase();
    setHexValue(input);
    
    const amount = hexToAmount(input);
    setDecimalAmount(formatAmount(amount, displayCurrency));
  };

  // Handle currency change
  const handleCurrencyChange = (currency: string) => {
    setDisplayCurrency(currency);
    setCurrencySymbol(CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || CURRENCY_SYMBOLS.DEFAULT);
    
    // Re-format the current amount for the new currency
    const amount = hexToAmount(hexValue);
    setDecimalAmount(formatAmount(amount, currency));
  };

  // Handle save
  const handleSave = () => {
    const amount = parseAmountInput(decimalAmount, displayCurrency);
    const newHexValue = amountToHex(amount);
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

  // Apply preset amount
  const applyAmountPreset = (amount: number) => {
    const newHex = amountToHex(amount);
    setHexValue(newHex);
    setDecimalAmount(formatAmount(amount, displayCurrency));
  };

  // Get current amount information
  const currentAmount = hexToAmount(value);
  const formattedCurrentAmount = formatAmount(currentAmount, displayCurrency);
  const isZeroAmount = currentAmount === 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Amount Authorised ({AMOUNT_AUTHORISED.tag})
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
                    {AMOUNT_AUTHORISED.description}<br/>
                    Format: Minor currency units (cents)<br/>
                    EMV Ref: {AMOUNT_AUTHORISED.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isEditing && (
              <Badge 
                variant={isZeroAmount ? "outline" : "secondary"}
                className="text-xs"
              >
                {isZeroAmount ? "No Amount" : "Valid"}
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
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="amount-input" className="text-sm font-medium">Amount:</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="amount-input"
                    value={decimalAmount}
                    onChange={handleAmountInputChange}
                    className="w-32 h-8 pl-7 text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="hex-input" className="text-sm font-medium">Hex:</Label>
                <Input
                  id="hex-input"
                  value={hexValue}
                  onChange={handleHexInputChange}
                  className="w-32 h-8 font-mono text-center"
                  maxLength={12}
                  placeholder="000000001000"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Currency:</Label>
              <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CURRENCY_SYMBOLS).filter(c => c !== "DEFAULT").map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Quick amounts:</span>
              {COMMON_AMOUNT_CONFIGS.map((config) => (
                <Button
                  key={config.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyAmountPreset(config.amount)}
                  className="h-7 text-xs"
                >
                  {config.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Amount Display */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Transaction Amount</h4>
            <Badge variant="outline" className="text-xs">
              {displayCurrency}
            </Badge>
          </div>
          
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold flex items-center justify-center gap-1">
              <span className="text-muted-foreground">{currencySymbol}</span>
              <span>{formattedCurrentAmount}</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Minor units: {currentAmount.toLocaleString()} • 
              Hex: {value.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Amount Breakdown */}
        {currentAmount > 0 && !isEditing && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{currencySymbol}{formattedCurrentAmount}</div>
              <div className="text-muted-foreground">Display</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{currentAmount.toLocaleString()}</div>
              <div className="text-muted-foreground">Minor Units</div>
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