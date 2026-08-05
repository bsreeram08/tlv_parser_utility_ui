import { useEffect, useState, type JSX } from "react";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENT_STORAGE_KEY = "payment-utilities-accent-theme";

type AccentTheme = "warm" | "blue" | "green" | "violet" | "mono";

const ACCENTS: ReadonlyArray<{
  id: AccentTheme;
  name: string;
  swatch: string;
}> = [
  { id: "warm", name: "Ember", swatch: "bg-[oklch(0.67_0.15_39)]" },
  { id: "blue", name: "Terminal", swatch: "bg-[oklch(0.62_0.19_250)]" },
  { id: "green", name: "Signal", swatch: "bg-[oklch(0.62_0.15_155)]" },
  { id: "violet", name: "Cipher", swatch: "bg-[oklch(0.62_0.18_292)]" },
  { id: "mono", name: "Mono", swatch: "bg-[oklch(0.52_0_0)]" },
];

function storedAccent(): AccentTheme {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (ACCENTS.some((accent) => accent.id === stored)) {
      return stored as AccentTheme;
    }
  } catch {
    // Appearance persistence is optional.
  }
  return "warm";
}

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState<AccentTheme>(storedAccent);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    } catch {
      // Appearance persistence is optional.
    }
  }, [accent]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          aria-label="Open appearance settings"
        >
          <Palette className="size-3.5" />
          <span className="hidden sm:inline">Appearance</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="py-1 text-xs text-muted-foreground">
          Color mode
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" className="py-1 text-xs">
            <Sun className="size-3.5" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="py-1 text-xs">
            <Moon className="size-3.5" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="py-1 text-xs">
            <Monitor className="size-3.5" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="py-1 text-xs text-muted-foreground">
          Accent
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={accent}
          onValueChange={(value) => setAccent(value as AccentTheme)}
        >
          {ACCENTS.map((item) => (
            <DropdownMenuRadioItem
              key={item.id}
              value={item.id}
              className="py-1 text-xs"
            >
              <span className={`size-3.5 rounded-full ${item.swatch}`} />
              {item.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
