/**
 * Debug utilities to help identify and fix issues
 */

/**
 * Helper function to find empty string properties in objects
 * This can help identify where empty string values are coming from
 */
export function findEmptyStringProperties(data: unknown, path = ""): string[] {
  const emptyProperties: string[] = [];

  if (!data || typeof data !== "object") {
    return emptyProperties;
  }

  // Loop through all properties
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const currentPath = path ? `${path}.${key}` : key;

    if (value === "") {
      // Found an empty string!
      emptyProperties.push(currentPath);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recursively check nested objects
      const childEmpty = findEmptyStringProperties(value, currentPath);
      emptyProperties.push(...childEmpty);
    } else if (Array.isArray(value)) {
      // Check arrays
      value.forEach((item, index) => {
        const arrayPath = `${currentPath}[${index}]`;
        if (item === "") {
          emptyProperties.push(arrayPath);
        } else if (item && typeof item === "object") {
          const childEmpty = findEmptyStringProperties(item, arrayPath);
          emptyProperties.push(...childEmpty);
        }
      });
    }
  });

  return emptyProperties;
}

/**
 * Helper to sanitize data by replacing empty strings with null
 * This can prevent errors with components that don't accept empty strings
 * @returns A new sanitized copy of the data
 */
export function sanitizeEmptyStrings<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeEmptyStrings(item)) as unknown as T;
  }

  const result = { ...data } as Record<string, unknown>;

  Object.entries(result).forEach(([key, value]) => {
    if (value === "") {
      // Replace empty strings with null
      result[key] = null;
    } else if (value && typeof value === "object") {
      // Recursively sanitize nested objects and arrays
      result[key] = sanitizeEmptyStrings(value);
    }
  });

  return result as T;
}
