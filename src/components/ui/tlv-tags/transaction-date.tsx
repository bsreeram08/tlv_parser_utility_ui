import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Edit3, Save, X, Info, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { TagClass, TagFormat } from "@/types/tlv";
import { format } from "date-fns";

export const TRANSACTION_DATE = {
  tag: "9A",
  name: "Transaction Date",
  description: "Local date that the transaction was authorized",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 3,
  emvSpecRef: "Book 4, Section 6.5.15",
};

// Common date presets
const COMMON_DATE_CONFIGS = [
  { name: "Today", getValue: () => new Date() },
  {
    name: "Yesterday",
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    },
  },
  {
    name: "Start of Month",
    getValue: () => {
      const d = new Date();
      d.setDate(1);
      return d;
    },
  },
  {
    name: "End of Month",
    getValue: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1, 0);
      return d;
    },
  },
];

interface TransactionDateProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function TransactionDateTag({ value, onChange }: TransactionDateProps) {
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Convert hex YYMMDD to Date object
  const hexToDate = (hexStr: string): Date | undefined => {
    const validHex = hexStr
      .replace(/[^0-9A-Fa-f]/g, "")
      .padEnd(6, "0")
      .substring(0, 6);

    if (validHex === "000000") return undefined;

    try {
      const year = parseInt(validHex.substring(0, 2));
      const month = parseInt(validHex.substring(2, 4));
      const day = parseInt(validHex.substring(4, 6));

      // Handle Y2K for transaction dates - assume years 00-99 are 20xx
      // Transaction dates are typically current/recent, so all 2-digit years map to 2000-2099
      const fullYear = 2000 + year;

      // Validate date components
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return undefined;
      }

      const date = new Date(fullYear, month - 1, day);

      // Check if the date is valid (handles invalid dates like Feb 30)
      if (
        date.getFullYear() !== fullYear ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return undefined;
      }

      return date;
    } catch {
      return undefined;
    }
  };

  // Convert Date object to hex YYMMDD
  const dateToHex = (date: Date): string => {
    const year = date.getFullYear() % 100; // Get last 2 digits
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return [year, month, day]
      .map((n) => n.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  };

  // Initialize date when value changes
  useEffect(() => {
    const date = hexToDate(value);
    setSelectedDate(date);
  }, [value]);

  // Handle manual hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, 6)
      .toUpperCase();
    setHexValue(input);

    const date = hexToDate(input);
    setSelectedDate(date);
  };

  // Handle date picker change
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const newHex = dateToHex(date);
      setHexValue(newHex);
    }
    setCalendarOpen(false);
  };

  // Handle save
  const handleSave = () => {
    if (selectedDate) {
      const newHexValue = dateToHex(selectedDate);
      setHexValue(newHexValue);
      onChange(newHexValue);
    } else {
      onChange(hexValue);
    }
    setIsEditing(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    });
  };

  // Apply preset date
  const applyDatePreset = (getDate: () => Date) => {
    const date = getDate();
    setSelectedDate(date);
    setHexValue(dateToHex(date));
  };

  // Format date for display
  const formatDisplayDate = (date: Date | undefined): string => {
    if (!date) return "Invalid date";
    return format(date, "PPP"); // e.g., "December 25, 2024"
  };

  // Check if date is valid
  const isValidDate = selectedDate !== undefined;
  const currentDate = hexToDate(value);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Transaction Date ({TRANSACTION_DATE.tag})
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
                    {TRANSACTION_DATE.description}
                    <br />
                    Format: YYMMDD (hex)
                    <br />
                    EMV Ref: {TRANSACTION_DATE.emvSpecRef}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isEditing && (
              <Badge
                variant={isValidDate ? "secondary" : "destructive"}
                className="text-xs"
              >
                {isValidDate ? "Valid" : "Invalid"}
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
                placeholder="181225"
              />
              <span className="text-xs text-muted-foreground">YYMMDD</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Quick dates:</span>
              {COMMON_DATE_CONFIGS.map((config) => (
                <Button
                  key={config.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyDatePreset(config.getValue)}
                  className="h-7 text-xs"
                >
                  {config.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Date Display and Picker */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Transaction Date</h4>
            {isValidDate && (
              <Badge variant="outline" className="text-xs">
                {selectedDate && format(selectedDate, "yyyy-MM-dd")}
              </Badge>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      formatDisplayDate(selectedDate)
                    ) : (
                      <span className="text-muted-foreground">Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {selectedDate && (
                <div className="text-xs text-muted-foreground">
                  Hex: {dateToHex(selectedDate)} • Day of week:{" "}
                  {format(selectedDate, "EEEE")}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {currentDate ? (
                <>
                  <p className="text-sm font-medium">
                    {formatDisplayDate(currentDate)}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {format(currentDate, "EEEE, MMMM do, yyyy")} • Hex:{" "}
                    {value.toUpperCase()}
                  </div>
                </>
              ) : (
                <p className="text-sm text-destructive">Invalid date format</p>
              )}
            </div>
          )}
        </div>

        {/* Date Information */}
        {currentDate && !isEditing && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{format(currentDate, "dd")}</div>
              <div className="text-muted-foreground">Day</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{format(currentDate, "MM")}</div>
              <div className="text-muted-foreground">Month</div>
            </div>
            <div className="bg-muted p-2 rounded text-center">
              <div className="font-medium">{format(currentDate, "yy")}</div>
              <div className="text-muted-foreground">Year</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
