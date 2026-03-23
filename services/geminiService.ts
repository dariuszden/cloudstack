
import { GoogleGenAI } from "@google/genai";
import { MasterLinkStrategy, Tone, WritingStyle } from "../types";

const MODEL_NAME = 'gemini-3-pro-preview';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private cleanOutput(text: string): string {
    return text.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim();
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async callWithRetry(fn: ()