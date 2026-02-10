import type { ClassificationThresholds } from '@/types/classification';
import type { TokenLayer } from '@/types/audit';

export const CLASSIFICATION_THRESHOLDS: Record<TokenLayer, ClassificationThresholds> = {
  color: { inheritMax: 0.02, adaptMax: 0.15 },
  typography: { inheritMax: 0.00, adaptMax: 0.25 },
  spacing: { inheritMax: 0.05, adaptMax: 0.30 },
  elevation: { inheritMax: 0.00, adaptMax: 0.20 },
  border: { inheritMax: 0.05, adaptMax: 0.30 },
  motion: { inheritMax: 0.05, adaptMax: 0.30 },
  opacity: { inheritMax: 0.02, adaptMax: 0.15 },
};

export const TOKEN_LAYERS: TokenLayer[] = [
  'color',
  'typography',
  'spacing',
  'elevation',
  'border',
  'motion',
  'opacity',
];

export const LAYER_LABELS: Record<TokenLayer, string> = {
  color: 'Color',
  typography: 'Typography',
  spacing: 'Spacing',
  elevation: 'Elevation',
  border: 'Border',
  motion: 'Motion',
  opacity: 'Opacity',
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  unclassified: 'Unclassified',
  inherit: 'Match',
  adapt: 'Modified',
  extend: 'Custom',
};

export const CLASSIFICATION_DESCRIPTIONS: Record<string, string> = {
  unclassified: 'Not yet classified against the design system',
  inherit: 'Exact or near-exact match to the design system',
  adapt: 'Similar to a design system token but has been altered',
  extend: 'Not found in the design system — completely custom',
};

export const CLASSIFICATION_COLORS: Record<string, string> = {
  unclassified: '#94a3b8',
  inherit: '#22c55e',
  adapt: '#f59e0b',
  extend: '#ef4444',
};

export const MAX_ELEMENTS_PER_PAGE = 5000;
export const MAX_PAGES_PER_PRODUCT = 50;
export const DEFAULT_VIEWPORTS = [1440];
export const MAX_PRODUCT_URLS = 6;
export const MIN_PRODUCT_URLS = 1;

export const DEFAULT_AUDIT_CONFIG = {
  maxPagesPerProduct: MAX_PAGES_PER_PRODUCT,
  viewports: DEFAULT_VIEWPORTS,
  extractLayers: TOKEN_LAYERS,
};

export const EFFORT_LABELS: Record<string, string> = {
  xs: 'XS (< 1h)',
  sm: 'SM (1-4h)',
  md: 'MD (4-8h)',
  lg: 'LG (1-3d)',
  xl: 'XL (3-5d)',
};

export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
