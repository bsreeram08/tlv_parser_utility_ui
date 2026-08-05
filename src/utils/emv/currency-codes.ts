/**
 * ISO 4217 currency codes, as carried in tag 5F2A.
 *
 * `minorUnits` matters when formatting an amount: tag 9F02 is in minor units,
 * so JPY (0 minor units) and most currencies (2) format differently from the
 * same integer.
 */

export type CurrencyInfo = {
  readonly numeric: string;
  readonly alpha: string;
  readonly name: string;
  readonly sign: string;
  readonly minorUnits: number;
};

export const CURRENCIES: readonly CurrencyInfo[] = [
  { numeric: "036", alpha: "AUD", name: "Australian Dollar", sign: "$", minorUnits: 2 },
  { numeric: "124", alpha: "CAD", name: "Canadian Dollar", sign: "$", minorUnits: 2 },
  { numeric: "156", alpha: "CNY", name: "Chinese Yuan", sign: "¥", minorUnits: 2 },
  { numeric: "203", alpha: "CZK", name: "Czech Koruna", sign: "Kč", minorUnits: 2 },
  { numeric: "208", alpha: "DKK", name: "Danish Krone", sign: "kr", minorUnits: 2 },
  { numeric: "344", alpha: "HKD", name: "Hong Kong Dollar", sign: "$", minorUnits: 2 },
  { numeric: "348", alpha: "HUF", name: "Hungarian Forint", sign: "Ft", minorUnits: 2 },
  { numeric: "352", alpha: "ISK", name: "Icelandic Króna", sign: "kr", minorUnits: 0 },
  { numeric: "356", alpha: "INR", name: "Indian Rupee", sign: "₹", minorUnits: 2 },
  { numeric: "376", alpha: "ILS", name: "Israeli New Shekel", sign: "₪", minorUnits: 2 },
  { numeric: "392", alpha: "JPY", name: "Japanese Yen", sign: "¥", minorUnits: 0 },
  { numeric: "410", alpha: "KRW", name: "South Korean Won", sign: "₩", minorUnits: 0 },
  { numeric: "484", alpha: "MXN", name: "Mexican Peso", sign: "$", minorUnits: 2 },
  { numeric: "554", alpha: "NZD", name: "New Zealand Dollar", sign: "$", minorUnits: 2 },
  { numeric: "578", alpha: "NOK", name: "Norwegian Krone", sign: "kr", minorUnits: 2 },
  { numeric: "702", alpha: "SGD", name: "Singapore Dollar", sign: "$", minorUnits: 2 },
  { numeric: "710", alpha: "ZAR", name: "South African Rand", sign: "R", minorUnits: 2 },
  { numeric: "752", alpha: "SEK", name: "Swedish Krona", sign: "kr", minorUnits: 2 },
  { numeric: "756", alpha: "CHF", name: "Swiss Franc", sign: "Fr", minorUnits: 2 },
  { numeric: "784", alpha: "AED", name: "UAE Dirham", sign: "د.إ", minorUnits: 2 },
  { numeric: "826", alpha: "GBP", name: "British Pound", sign: "£", minorUnits: 2 },
  { numeric: "840", alpha: "USD", name: "US Dollar", sign: "$", minorUnits: 2 },
  { numeric: "949", alpha: "TRY", name: "Turkish Lira", sign: "₺", minorUnits: 2 },
  { numeric: "985", alpha: "PLN", name: "Polish Złoty", sign: "zł", minorUnits: 2 },
  { numeric: "946", alpha: "RON", name: "Romanian Leu", sign: "lei", minorUnits: 2 },
  { numeric: "978", alpha: "EUR", name: "Euro", sign: "€", minorUnits: 2 },
  { numeric: "986", alpha: "BRL", name: "Brazilian Real", sign: "R$", minorUnits: 2 },
];

const BY_NUMERIC = new Map(CURRENCIES.map((c) => [c.numeric, c]));

/** Look up by the value of 5F2A. Accepts "0826" or "826". */
export function getCurrencyByNumeric(
  value: string
): CurrencyInfo | undefined {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 0) return undefined;
  return BY_NUMERIC.get(digits.padStart(3, "0").slice(-3));
}

/** Format an amount given in minor units (as tag 9F02 carries it). */
export function formatMinorUnits(
  minor: number,
  currencyNumeric: string
): string {
  const currency = getCurrencyByNumeric(currencyNumeric);
  const units = currency?.minorUnits ?? 2;
  const divisor = 10 ** units;
  const major = (minor / divisor).toFixed(units);
  return currency ? `${currency.sign}${major} ${currency.alpha}` : major;
}
