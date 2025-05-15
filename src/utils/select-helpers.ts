/**
 * Helper utilities for working with Select components
 */

/**
 * Makes a value safe to use in a SelectItem component
 * Radix UI Select component doesn't allow empty string values
 *
 * @param value The value to make safe for SelectItem
 * @returns A non-empty string value safe for SelectItem
 */
export function makeSafeSelectValue(value: string | null | undefined): string {
  // If the value is null, undefined, or empty string, return a placeholder value
  if (value === null || value === undefined || value === "") {
    return "placeholder-value";
  }
  return value;
}

/**
 * Sanitize an object's string properties to ensure no empty strings are passed to SelectItem components
 *
 * @param obj The object to sanitize
 * @returns A new object with sanitized values
 */
export function sanitizeSelectValues<T extends Record<string, any>>(obj: T): T {
  // Create a new object to avoid mutating the original
  const result = { ...obj } as Record<string, any>;

  // Recursively process all properties
  Object.entries(result).forEach(([key, value]) => {
    if (value === "") {
      // Replace empty strings with null
      result[key] = null;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Process nested objects
      result[key] = sanitizeSelectValues(value);
    } else if (Array.isArray(value)) {
      // Process arrays
      result[key] = value.map((item) =>
        typeof item === "string" && item === ""
          ? null
          : typeof item === "object" && item !== null
          ? sanitizeSelectValues(item)
          : item
      );
    }
  });

  return result as T;
}
