/**
 * ISO 3166-1 numeric country codes, with each country's usual ISO 4217
 * currency code.
 *
 * Tag 9F1A (Terminal Country Code) is ISO 3166-1; tag 5F2A (Transaction
 * Currency Code) is ISO 4217. They coincide numerically for several currencies
 * — SEK 752, DKK 208, NOK 578, GBP 826, USD 840 — which makes it easy to
 * copy one into the other and never notice. They diverge for every Eurozone
 * country (Finland 246 / EUR 978, Ireland 372 / EUR 978), so a config copied
 * between markets silently corrupts these fields.
 */

export type CountryInfo = {
  /** ISO 3166-1 numeric, as it appears in 9F1A. */
  readonly numeric: string;
  readonly alpha2: string;
  readonly name: string;
  /** Usual ISO 4217 numeric currency code for this country. */
  readonly currencyNumeric: string;
  readonly currencyAlpha: string;
};

const COUNTRIES: CountryInfo[] = [
  { numeric: "036", alpha2: "AU", name: "Australia", currencyNumeric: "036", currencyAlpha: "AUD" },
  { numeric: "040", alpha2: "AT", name: "Austria", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "056", alpha2: "BE", name: "Belgium", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "076", alpha2: "BR", name: "Brazil", currencyNumeric: "986", currencyAlpha: "BRL" },
  { numeric: "124", alpha2: "CA", name: "Canada", currencyNumeric: "124", currencyAlpha: "CAD" },
  { numeric: "156", alpha2: "CN", name: "China", currencyNumeric: "156", currencyAlpha: "CNY" },
  { numeric: "191", alpha2: "HR", name: "Croatia", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "196", alpha2: "CY", name: "Cyprus", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "203", alpha2: "CZ", name: "Czechia", currencyNumeric: "203", currencyAlpha: "CZK" },
  { numeric: "208", alpha2: "DK", name: "Denmark", currencyNumeric: "208", currencyAlpha: "DKK" },
  { numeric: "233", alpha2: "EE", name: "Estonia", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "246", alpha2: "FI", name: "Finland", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "250", alpha2: "FR", name: "France", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "276", alpha2: "DE", name: "Germany", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "300", alpha2: "GR", name: "Greece", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "344", alpha2: "HK", name: "Hong Kong", currencyNumeric: "344", currencyAlpha: "HKD" },
  { numeric: "348", alpha2: "HU", name: "Hungary", currencyNumeric: "348", currencyAlpha: "HUF" },
  { numeric: "352", alpha2: "IS", name: "Iceland", currencyNumeric: "352", currencyAlpha: "ISK" },
  { numeric: "356", alpha2: "IN", name: "India", currencyNumeric: "356", currencyAlpha: "INR" },
  { numeric: "372", alpha2: "IE", name: "Ireland", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "376", alpha2: "IL", name: "Israel", currencyNumeric: "376", currencyAlpha: "ILS" },
  { numeric: "380", alpha2: "IT", name: "Italy", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "392", alpha2: "JP", name: "Japan", currencyNumeric: "392", currencyAlpha: "JPY" },
  { numeric: "428", alpha2: "LV", name: "Latvia", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "440", alpha2: "LT", name: "Lithuania", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "442", alpha2: "LU", name: "Luxembourg", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "470", alpha2: "MT", name: "Malta", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "484", alpha2: "MX", name: "Mexico", currencyNumeric: "484", currencyAlpha: "MXN" },
  { numeric: "528", alpha2: "NL", name: "Netherlands", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "554", alpha2: "NZ", name: "New Zealand", currencyNumeric: "554", currencyAlpha: "NZD" },
  { numeric: "578", alpha2: "NO", name: "Norway", currencyNumeric: "578", currencyAlpha: "NOK" },
  { numeric: "616", alpha2: "PL", name: "Poland", currencyNumeric: "985", currencyAlpha: "PLN" },
  { numeric: "620", alpha2: "PT", name: "Portugal", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "642", alpha2: "RO", name: "Romania", currencyNumeric: "946", currencyAlpha: "RON" },
  { numeric: "702", alpha2: "SG", name: "Singapore", currencyNumeric: "702", currencyAlpha: "SGD" },
  { numeric: "703", alpha2: "SK", name: "Slovakia", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "705", alpha2: "SI", name: "Slovenia", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "710", alpha2: "ZA", name: "South Africa", currencyNumeric: "710", currencyAlpha: "ZAR" },
  { numeric: "724", alpha2: "ES", name: "Spain", currencyNumeric: "978", currencyAlpha: "EUR" },
  { numeric: "752", alpha2: "SE", name: "Sweden", currencyNumeric: "752", currencyAlpha: "SEK" },
  { numeric: "756", alpha2: "CH", name: "Switzerland", currencyNumeric: "756", currencyAlpha: "CHF" },
  { numeric: "792", alpha2: "TR", name: "Türkiye", currencyNumeric: "949", currencyAlpha: "TRY" },
  { numeric: "784", alpha2: "AE", name: "United Arab Emirates", currencyNumeric: "784", currencyAlpha: "AED" },
  { numeric: "826", alpha2: "GB", name: "United Kingdom", currencyNumeric: "826", currencyAlpha: "GBP" },
  { numeric: "840", alpha2: "US", name: "United States", currencyNumeric: "840", currencyAlpha: "USD" },
];

const BY_NUMERIC = new Map(COUNTRIES.map((c) => [c.numeric, c]));

export function getAllCountries(): CountryInfo[] {
  return COUNTRIES;
}

/**
 * Look up a country by the value of tag 9F1A. Values are BCD, so "0826" and
 * "826" both mean the United Kingdom.
 */
export function getCountryByNumeric(value: string): CountryInfo | undefined {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 0) return undefined;
  const padded = digits.padStart(3, "0").slice(-3);
  return BY_NUMERIC.get(padded);
}
