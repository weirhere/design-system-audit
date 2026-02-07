export type Classification = 'unclassified' | 'inherit' | 'adapt' | 'extend';

export interface ClassificationThresholds {
  inheritMax: number;
  adaptMax: number;
}

export interface ClassificationResult {
  classification: Classification;
  confidence: number;
  divergenceScore: number;
  canonicalValue: string;
  productValue: string;
}

export interface ClassificationOverride {
  tokenId: string;
  classification: Classification;
  reason?: string;
}
