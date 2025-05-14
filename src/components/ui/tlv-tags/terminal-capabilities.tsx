import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TagClass, TagFormat } from "@/types/tlv";

export const TERMINAL_CAPABILITIES = {
  tag: "9F33",
  name: "Terminal Capabilities",
  description: "Indicates the capabilities of the terminal",
  format: TagFormat.PRIMITIVE,
  class: TagClass.CONTEXT_SPECIFIC,
  fixedLength: 6,
};

interface Capability {
  bit: number;
  description: string;
}

interface CapabilityGroup {
  byte: number;
  description: string;
  capabilities: Capability[];
}

const capabilityGroups: CapabilityGroup[] = [
  {
    byte: 1,
    description: "Card Data Input Capability",
    capabilities: [
      { bit: 8, description: "Manual key entry" },
      { bit: 7, description: "Magnetic stripe" },
      { bit: 6, description: "IC with contacts" },
      { bit: 5, description: "Reserved" },
      { bit: 4, description: "Reserved" },
      { bit: 3, description: "Reserved" },
      { bit: 2, description: "Reserved" },
      { bit: 1, description: "Reserved" },
    ],
  },
  {
    byte: 2,
    description: "CVM Capability",
    capabilities: [
      { bit: 8, description: "Plaintext PIN for ICC verification" },
      { bit: 7, description: "Enciphered PIN for online verification" },
      { bit: 6, description: "Signature (paper)" },
      { bit: 5, description: "Enciphered PIN for offline verification" },
      { bit: 4, description: "No CVM required" },
      { bit: 3, description: "Reserved" },
      { bit: 2, description: "Reserved" },
      { bit: 1, description: "Reserved" },
    ],
  },
  {
    byte: 3,
    description: "Security Capability",
    capabilities: [
      { bit: 8, description: "Static data authentication (SDA)" },
      { bit: 7, description: "Dynamic data authentication (DDA)" },
      { bit: 6, description: "Card capture" },
      { bit: 5, description: "Reserved" },
      { bit: 4, description: "Reserved" },
      { bit: 3, description: "Reserved" },
      { bit: 2, description: "Reserved" },
      { bit: 1, description: "Reserved" },
    ],
  },
];

interface CapabilitiesState {
  [key: string]: boolean;
}

function parseHexToCapabilities(hex: string): CapabilitiesState {
  const capabilities: CapabilitiesState = {};
  const bytes = [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
  for (let byteIndex = 0; byteIndex < 3; byteIndex++) {
    const byte = bytes[byteIndex];
    for (let bit = 8; bit >= 1; bit--) {
      const key = `${byteIndex + 1}-${bit}`;
      capabilities[key] = (byte & (1 << (bit - 1))) !== 0;
    }
  }
  return capabilities;
}

function capabilitiesToHex(capabilities: CapabilitiesState): string {
  const bytes = [0, 0, 0];
  for (const key in capabilities) {
    const [byteStr, bitStr] = key.split("-");
    const byteIndex = parseInt(byteStr) - 1;
    const bit = parseInt(bitStr);
    if (capabilities[key]) {
      bytes[byteIndex] |= 1 << (bit - 1);
    }
  }
  return bytes
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

interface TerminalCapabilitiesTagProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function TerminalCapabilitiesTag({
  value,
  onChange,
}: TerminalCapabilitiesTagProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [capabilitiesState, setCapabilitiesState] = useState<CapabilitiesState>(
    {}
  );

  const handleEdit = () => {
    setCapabilitiesState(parseHexToCapabilities(value));
    setIsEditing(true);
  };

  const handleSave = () => {
    const newValue = capabilitiesToHex(capabilitiesState);
    onChange(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const currentCapabilities = parseHexToCapabilities(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {TERMINAL_CAPABILITIES.name} ({TERMINAL_CAPABILITIES.tag})
        </CardTitle>
        <CardDescription>{TERMINAL_CAPABILITIES.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div>
            {capabilityGroups.map((group) => (
              <div key={group.byte} className="mb-4">
                <h3 className="text-lg font-semibold">{group.description}</h3>
                {group.capabilities.map((cap) => (
                  <div
                    key={cap.bit}
                    className="flex items-center space-x-2 mt-1"
                  >
                    <Checkbox
                      id={`${group.byte}-${cap.bit}`}
                      checked={capabilitiesState[`${group.byte}-${cap.bit}`]}
                      onCheckedChange={(checked) =>
                        setCapabilitiesState((prev) => ({
                          ...prev,
                          [`${group.byte}-${cap.bit}`]: !!checked,
                        }))
                      }
                    />
                    <label
                      htmlFor={`${group.byte}-${cap.bit}`}
                      className="text-sm"
                    >
                      {cap.description}
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="mb-2">
              <strong>Current Value:</strong> {value}
            </p>
            <h3 className="text-lg font-semibold mb-2">
              Enabled Capabilities:
            </h3>
            {capabilityGroups.map((group) => {
              const enabledCaps = group.capabilities.filter(
                (cap) => currentCapabilities[`${group.byte}-${cap.bit}`]
              );
              return enabledCaps.length > 0 ? (
                <div key={group.byte} className="mb-4">
                  <h4 className="font-medium">{group.description}:</h4>
                  <ul className="list-disc pl-5">
                    {enabledCaps.map((cap) => (
                      <li key={cap.bit} className="text-sm">
                        {cap.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {isEditing ? (
          <>
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={handleEdit}>Edit</Button>
        )}
      </CardFooter>
    </Card>
  );
}
