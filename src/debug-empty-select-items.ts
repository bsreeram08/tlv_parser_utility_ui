/**
 * Debug utility to patch Radix UI Select.Item to identify where empty values are coming from
 *
 * Import this file at the top of your main application entry point.
 */

import React from "react";

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Setup a MutationObserver to watch for SelectItem elements being added
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Find all divs with radix-select-item role
            const selectItems = (node as Element).querySelectorAll(
              '[role="option"]'
            );
            selectItems.forEach((item) => {
              const value =
                item.getAttribute("data-value") || item.getAttribute("value");
              if (value === "") {
                console.error("Empty SelectItem value detected!", item);
                console.trace("Stack trace to help find the source");
              }
            });
          }
        });
      }
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });

  // Also monkey patch React's createElement to catch empty values at creation time
  const originalCreateElement = React.createElement;
  React.createElement = function (...args: any[]) {
    // Check if this is a SelectItem with empty value
    if (
      args[0] &&
      ((typeof args[0] === "string" && args[0].includes("SelectItem")) ||
        (args[0] &&
          args[0].displayName &&
          args[0].displayName.includes("SelectItem")))
    ) {
      const props = args[1] || {};
      if (props.value === "") {
        console.error("Empty SelectItem value detected during creation!", {
          component: args[0],
          props,
        });
        console.trace("Stack trace for empty SelectItem value");

        // Prevent the error by giving it a unique non-empty value
        props.value = `debug-empty-value-${Date.now()}-${Math.random()}`;
      }
    }
    return originalCreateElement.apply(this, args);
  };

  console.log("Debug utility for empty SelectItem values installed");
});
