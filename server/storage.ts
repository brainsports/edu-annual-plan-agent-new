import type { UploadedFile, ProgramInfo } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  addUploadedFile(file: UploadedFile): Promise<UploadedFile>;
  getUploadedFile(id: string): Promise<UploadedFile | undefined>;
  removeUploadedFile(id: string): Promise<void>;
  getAllUploadedFiles(): Promise<UploadedFile[]>;
  setFileText(id: string, text: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private uploadedFiles: Map<string, UploadedFile>;

  constructor() {
    this.uploadedFiles = new Map();
  }

  async addUploadedFile(file: UploadedFile): Promise<UploadedFile> {
    this.uploadedFiles.set(file.id, file);
    return file;
  }

  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    return this.uploadedFiles.get(id);
  }

  async removeUploadedFile(id: string): Promise<void> {
    this.uploadedFiles.delete(id);
  }

  async getAllUploadedFiles(): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values());
  }

  async setFileText(id: string, text: string): Promise<void> {
    const file = this.uploadedFiles.get(id);
    if (file) {
      file.extractedText = text;
      this.uploadedFiles.set(id, file);
    }
  }
}

export const storage = new MemStorage();
