import { useEffect, useRef } from "react";
import hotkeys from "hotkeys-js";

type KeyHandler = (event: KeyboardEvent, handler: { key: string }) => void;

interface HotkeyOptions {
  /**
   * Enable hotkeys when typing in INPUT, TEXTAREA and SELECT elements
   */
  enableOnFormTags?: boolean;
  /**
   * Enable capturing hotkeys when an element is in focus
   * The default behavior is to only capture hotkeys when no element is in focus
   */
  enableOnContentEditable?: boolean;
}

/**
 * A hook for using hotkeys in a React component
 * @param keys - The key or keys to bind (e.g., 'ctrl+s', 'command+s', 'shift+r')
 * @param callback - The function to call when the hotkey is pressed
 * @param options - Options for the hotkey binding
 * @param deps - Dependencies to watch for changes (similar to useEffect)
 */
export function useHotkeys(
  keys: string,
  callback: KeyHandler,
  options: HotkeyOptions = {},
  deps: any[] = []
): void {
  const { enableOnFormTags = false, enableOnContentEditable = false } = options;

  // Store the callback in a ref to avoid recreating hotkeys bindings on every render
  const callbackRef = useRef<KeyHandler>(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Set global hotkeys options
    hotkeys.filter = function (event) {
      const target = event.target as HTMLElement;

      // Always allow hotkeys if element is not input, textarea, or select
      if (!/(INPUT|TEXTAREA|SELECT)/i.test(target.tagName)) {
        return true;
      }

      // Allow hotkeys in form fields if enableOnFormTags is true
      if (enableOnFormTags) {
        return true;
      }

      // Allow hotkeys in contentEditable elements if enableOnContentEditable is true
      if (enableOnContentEditable && target.isContentEditable) {
        return true;
      }

      return false;
    };

    // Bind the hotkey
    hotkeys(keys, function (event, handler) {
      event.preventDefault();
      callbackRef.current(event, handler);
    });

    // Clean up the binding when the component unmounts
    return () => {
      hotkeys.unbind(keys);
    };
  }, [keys, enableOnFormTags, enableOnContentEditable, ...deps]);
}
