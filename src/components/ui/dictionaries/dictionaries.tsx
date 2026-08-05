/**
 * Searchable reference tables: EMV tags, countries and currencies.
 *
 * The country and currency tables sit side by side deliberately — 9F1A is
 * ISO 3166-1 and 5F2A is ISO 4217, and seeing both makes the overlap (and the
 * Eurozone divergence) obvious.
 */

import { useMemo, useState, type JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, X } from "lucide-react";
import { getAllTags } from "@/utils/tlv";
import { getAllCountries } from "@/utils/emv/country-codes";
import { CURRENCIES } from "@/utils/emv/currency-codes";
import { bitfieldSpecs } from "@/utils/tlv/bitfield-specs";
import { hasCustomRenderer } from "@/components/ui/tlv-tags/tag-registry";

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function Dictionaries(): JSX.Element {
  const [tagQuery, setTagQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [currencyQuery, setCurrencyQuery] = useState("");

  const tags = useMemo(() => {
    const all = [...getAllTags()].sort((a, b) => a.id.localeCompare(b.id));
    const needle = tagQuery.trim().toUpperCase();
    if (!needle) return all;
    return all.filter(
      (t) =>
        t.id.includes(needle) ||
        t.name.toUpperCase().includes(needle) ||
        t.description.toUpperCase().includes(needle)
    );
  }, [tagQuery]);

  const countries = useMemo(() => {
    const needle = countryQuery.trim().toUpperCase();
    const all = getAllCountries();
    if (!needle) return all;
    return all.filter(
      (c) =>
        c.numeric.includes(needle) ||
        c.alpha2.includes(needle) ||
        c.name.toUpperCase().includes(needle) ||
        c.currencyAlpha.includes(needle)
    );
  }, [countryQuery]);

  const currencies = useMemo(() => {
    const needle = currencyQuery.trim().toUpperCase();
    if (!needle) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.numeric.includes(needle) ||
        c.alpha.includes(needle) ||
        c.name.toUpperCase().includes(needle)
    );
  }, [currencyQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dictionaries</CardTitle>
        <CardDescription>
          Reference tables for the values that show up in EMV data. Tags marked
          with a decoder have a field-level view in the TLV parser.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="tags">
          <TabsList className="grid w-full grid-cols-3 sm:w-96">
            <TabsTrigger value="tags">EMV tags</TabsTrigger>
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="currencies">Currencies</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="mt-4 space-y-3">
            <SearchBox
              value={tagQuery}
              onChange={setTagQuery}
              placeholder="Search by tag, name or description"
            />
            <p className="text-xs text-muted-foreground">
              {tags.length} tag{tags.length === 1 ? "" : "s"}
            </p>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Tag</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Length</TableHead>
                    <TableHead className="w-28">Format</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {tag.id}
                          </Badge>
                          {(hasCustomRenderer(tag.id) ||
                            tag.id in bitfieldSpecs) && (
                            <span
                              title="Has a dedicated decoder"
                              className="h-1.5 w-1.5 rounded-full bg-primary"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{tag.name}</div>
                        <div className="text-muted-foreground">
                          {tag.description}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {tag.fixedLength !== undefined
                          ? tag.fixedLength
                          : tag.minLength !== undefined
                          ? `${tag.minLength}–${tag.maxLength ?? "?"}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tag.format}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="countries" className="mt-4 space-y-3">
            <SearchBox
              value={countryQuery}
              onChange={setCountryQuery}
              placeholder="Search by code, name or currency"
            />
            <p className="text-xs text-muted-foreground">
              {countries.length} countries · tag 9F1A is ISO 3166-1 numeric
            </p>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">9F1A</TableHead>
                    <TableHead className="w-16">Alpha-2</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="w-32">Usual currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((country) => {
                    const diverges =
                      country.currencyNumeric !== country.numeric;
                    return (
                      <TableRow key={country.numeric}>
                        <TableCell className="font-mono text-xs">
                          {country.numeric}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {country.alpha2}
                        </TableCell>
                        <TableCell className="text-xs">
                          {country.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-mono">
                            {country.currencyNumeric}
                          </span>{" "}
                          {country.currencyAlpha}
                          {!diverges && (
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px]"
                              title="Country and currency codes are numerically identical here, which is how they get swapped unnoticed"
                            >
                              same
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="currencies" className="mt-4 space-y-3">
            <SearchBox
              value={currencyQuery}
              onChange={setCurrencyQuery}
              placeholder="Search by code or name"
            />
            <p className="text-xs text-muted-foreground">
              {currencies.length} currencies · tag 5F2A is ISO 4217 numeric
            </p>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">5F2A</TableHead>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="w-28">Minor units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <TableRow key={currency.numeric}>
                      <TableCell className="font-mono text-xs">
                        {currency.numeric}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {currency.alpha}
                      </TableCell>
                      <TableCell className="text-xs">
                        {currency.sign} {currency.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {currency.minorUnits}
                        {currency.minorUnits === 0 && (
                          <span className="ml-1 text-muted-foreground">
                            (9F02 is whole units)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
