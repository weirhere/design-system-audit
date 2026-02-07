import type { TokenLayer } from './audit';
import type { Classification } from './classification';

export interface ExtractedToken {
  id: string;
  auditId: string;
  crawledPageId: string;
  sourceProduct: string;
  layer: TokenLayer;
  property: string;
  computedValue: string;
  rawValue: string | null;
  cssVariable: string | null;
  selector: string;
  frequency: number;
  classification: Classification;
  classificationConfidence: number;
  classificationOverridden: boolean;
  metadata: Record<string, unknown> | null;
}

export interface TokenGroup {
  layer: TokenLayer;
  property: string;
  tokens: ExtractedToken[];
}

export interface TokenSummary {
  layer: TokenLayer;
  total: number;
  unique: number;
  inherit: number;
  adapt: number;
  extend: number;
  unclassified: number;
}
