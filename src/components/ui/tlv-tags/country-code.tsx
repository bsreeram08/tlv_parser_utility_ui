/**
 * Terminal Country Code (9F1A) — ISO 3166-1 numeric.
 *
 * Kept deliberately separate from the currency selector (5F2A, ISO 4217): the
 * two fields are numerically identical for GBP, SEK, DKK, NOK and USD, so
 * copying a config between markets can swap them without any visible symptom
 * until a Eurozone country exposes the divergence.
 */

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Copy, Edit3, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  getAllCountries,
  getCountryByNumeric,
} from "@/utils/emv/country-codes";

interface CountryCodeTagProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function CountryCodeTag({ value, onChange }: CountryCodeTagProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value.toUpperCase());

  useEffect(() => {
    setDraft(value.toUpperCase());
    setIsEditing(false);
  }, [value]);

  const country = getCountryByNumeric(draft);
  const countries = getAllCountries();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            Terminal Country Code (9F1A)
          </CardTitle>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    onChange(draft);
                    setIsEditing(false);
                  }}
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft(value.toUpperCase());
                    setIsEditing(false);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                  {value.toUpperCase() || "<empty>"}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(value.toUpperCase())
                      .then(() => toast.success("Copied to clipboard"))
                      .catch(() => toast.error("Copy failed"))
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEditing ? (
          <Select
            value={country?.numeric ?? ""}
            onValueChange={(numeric) => {
              // 9F1A is 2 bytes of BCD, so 826 is encoded as 0826.
              setDraft(numeric.padStart(4, "0"));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.numeric} value={c.numeric}>
                  {c.numeric} — {c.name} ({c.alpha2})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {country ? (
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">
              {country.name} ({country.alpha2})
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="font-mono">
                ISO 3166-1: {country.numeric}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Usual currency: {country.currencyAlpha} (
                {country.currencyNumeric})
              </Badge>
            </div>
            {country.currencyNumeric !== country.numeric && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>
                  This country&rsquo;s code ({country.numeric}) differs from its
                  currency code ({country.currencyNumeric}). Check that 5F2A
                  carries {country.currencyNumeric}, not {country.numeric}.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>
              {draft
                ? `${draft} is not a recognised ISO 3166-1 numeric country code. Verify it is not a currency code.`
                : "No value set."}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
