
export type Tone = 'positive' | 'neutral' | 'negative';
export type WritingStyle = 'neutral' | 'friendly' | 'authoritative' | 'witty';

export interface SEOArticle {
  id: string;
  keyword: string;
  filename: string;
  additionalKeywords?: string;
  context?: string;
  title: string;
  content: string; // The full HTML content
  metaDescription: string;
  status: 'completed' | 'pending' | 'error';
  createdAt: number;
  sources: { title: string; uri: string }[];
  tone: Tone;
  style: WritingStyle;
  includeDisclaimer: boolean;
  isStackMaster?: boolean;
}

export interface LinkInput {
  url: string;
  anchorText: string;
}

export interface MasterLinkStrategy {
  primaryLink: LinkInput;
  ctaUrl: string;
  ctaAnchors: string[];
}

export interface StackConfig {
  isActive: boolean;
  bucketUrl: string;
  supportingKeywords: string[];
}

export type GenerationStep = 'researching' | 'outlining' | 'writing' | 'polishing' | 'idle' | 'stacking';
