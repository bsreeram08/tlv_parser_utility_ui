import Dexie from "dexie";
import type { Table } from "dexie";

// Define the saved data structure for TLV tests
export interface SavedTlvTest {
  id?: number;
  date: Date;
  name: string;
  hexData: string;
  description?: string;
  tags?: string[];
}

// Define the saved data structure for ISO 8583 tests
export interface SavedIsoTest {
  id?: number;
  date: Date;
  name: string;
  message: string;
  version: string;
  description?: string;
  tags?: string[];
  options?: Record<string, unknown>;
}

// Define our database
export class PaymentUtilsDB extends Dexie {
  tlvTests!: Table<SavedTlvTest>;
  isoTests!: Table<SavedIsoTest>;

  constructor() {
    super("paymentUtilsDB");
    this.version(1).stores({
      tlvTests: "++id, date, name, *tags",
      isoTests: "++id, date, name, version, *tags",
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
}

// Create a single database instance
export const db = new PaymentUtilsDB();
