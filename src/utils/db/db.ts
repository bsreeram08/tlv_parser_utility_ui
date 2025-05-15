import Dexie from "dexie";
import type { Table } from "dexie";
import type { CustomTagDefinition } from "@/types/custom-tag";
import type { SavedTlvComparison } from "@/types/tlv-comparison";

// Define the saved data structure for TLV tests
export interface SavedTlvTest {
  id?: number;
  name: string;
  description?: string;
  tlvData: string;
  date: Date;
  tags?: string[];
  category?: string; // E.g., "EMV Card", "Payment Terminal", "Test Data"
  favorite?: boolean; // To mark frequently used tests
  lastAccessed?: Date; // When the test was last loaded
  source?: string; // Where the test came from (e.g., "Manual", "Imported")
  version?: string; // Optional version for tracking changes to the test
}

// Define the saved data structure for ISO 8583 tests
export interface SavedIsoTest {
  id?: number;
  name: string;
  description?: string;
  isoData: string;
  version: string; // ISO 8583 version used
  date: Date;
  tags?: string[];
  category?: string; // E.g., "Financial", "Network Management", "Test Data"
  favorite?: boolean; // To mark frequently used tests
  lastAccessed?: Date; // When the test was last loaded
  source?: string; // Where the test came from (e.g., "Manual", "Imported")
  messageType?: string; // Message type identifier (e.g., "0200" for authorization request)
  options?: Record<string, unknown>;
}

// Define our database
export class PaymentUtilsDB extends Dexie {
  tlvTests!: Table<SavedTlvTest>;
  isoTests!: Table<SavedIsoTest>;
  customTags!: Table<CustomTagDefinition>;
  tlvComparisons!: Table<SavedTlvComparison>;

  constructor() {
    super("paymentUtilsDB");
    this.version(1).stores({
      tlvTests: "++id, date, name, *tags",
      isoTests: "++id, date, name, version, *tags",
    });
    
    // Add custom tags table in version 2
    this.version(2).stores({
      customTags: "id, name, format, dataFormat, created, modified"
    });
    
    // Enhanced storage with improved indexes in version 3
    this.version(3).stores({
      tlvTests: "++id, date, name, *tags, category, favorite, lastAccessed, source, version",
      isoTests: "++id, date, name, version, *tags, category, favorite, lastAccessed, source, messageType"
    });
    
    // Add TLV comparisons table in version 4
    this.version(4).stores({
      tlvComparisons: "++id, date, name, *tags, category, favorite, lastAccessed, source"
    });
  }

  // Helper method to save a TLV test
  async saveTlvTest(test: SavedTlvTest): Promise<number> {
    return await this.tlvTests.add({
      ...test,
      date: new Date(),
    });
  }

  // Helper method to save an ISO 8583 test
  async saveIsoTest(test: SavedIsoTest): Promise<number> {
    return await this.isoTests.add({
      ...test,
      date: new Date(),
    });
  }

  // Helper method to get TLV tests
  async getTlvTests(): Promise<SavedTlvTest[]> {
    return await this.tlvTests.orderBy("date").reverse().toArray();
  }

  // Helper method to get ISO 8583 tests
  async getIsoTests(): Promise<SavedIsoTest[]> {
    return await this.isoTests.orderBy("date").reverse().toArray();
  }

  // Delete a TLV test
  async deleteTlvTest(id: number): Promise<void> {
    return await this.tlvTests.delete(id);
  }

  // Delete an ISO 8583 test
  async deleteIsoTest(id: number): Promise<void> {
    return await this.isoTests.delete(id);
  }
  
  // Custom Tag methods
  
  // Add a new custom tag definition
  async addCustomTag(tag: CustomTagDefinition): Promise<void> {
    // Check if tag with this ID already exists
    const existingTag = await this.customTags.get(tag.id);
    if (existingTag) {
      throw new Error(`A custom tag with ID ${tag.id} already exists`);
    }
    
    await this.customTags.add(tag);
  }
  
  // Update an existing custom tag
  async updateCustomTag(tag: CustomTagDefinition): Promise<number> {
    // Set modified date
    const updatedTag = {
      ...tag,
      modified: new Date()
    };
    
    return await this.customTags.update(tag.id, updatedTag);
  }
  
  // Get a custom tag by ID
  async getCustomTag(id: string): Promise<CustomTagDefinition | undefined> {
    return await this.customTags.get(id);
  }
  
  // Get all custom tags
  async getAllCustomTags(): Promise<CustomTagDefinition[]> {
    return await this.customTags.toArray();
  }
  
  // Delete a custom tag
  async deleteCustomTag(id: string): Promise<void> {
    return await this.customTags.delete(id);
  }
  
  // Search for custom tags by name
  async searchCustomTagsByName(query: string): Promise<CustomTagDefinition[]> {
    return await this.customTags
      .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
      .toArray();
  }
  
  // TLV Comparison methods
  
  // Save a TLV comparison
  async saveTlvComparison(comparison: SavedTlvComparison): Promise<number> {
    return await this.tlvComparisons.add({
      ...comparison,
      date: new Date(),
    });
  }
  
  // Get all TLV comparisons
  async getTlvComparisons(): Promise<SavedTlvComparison[]> {
    return await this.tlvComparisons.orderBy("date").reverse().toArray();
  }
  
  // Get a TLV comparison by ID
  async getTlvComparison(id: number): Promise<SavedTlvComparison | undefined> {
    return await this.tlvComparisons.get(id);
  }
  
  // Delete a TLV comparison
  async deleteTlvComparison(id: number): Promise<void> {
    return await this.tlvComparisons.delete(id);
  }
  
  // Update last accessed timestamp for TLV comparison
  async updateTlvComparisonAccess(id: number): Promise<number> {
    return await this.tlvComparisons.update(id, { lastAccessed: new Date() });
  }
}

// Create a single database instance
export const db = new PaymentUtilsDB();
