import type { Classification } from './classification';
import type { TokenLayer } from './audit';

export interface ComparisonResult {
  id: string;
  auditId: string;
  entityType: 'token' | 'component' | 'pattern';
  entityProperty: string;
  canonicalValue: string;
  productValues: Record<string, string>;
  divergenceScore: number;
  classification: Classification;
}

export interface MatrixRow {
  id: string;
  layer: TokenLayer;
  property: string;
  canonicalValue: string;
  productValues: Record<string, {
    value: string;
    divergence: number;
    classification: Classification;
  }>;
  maxDivergence: number;
}

export interface MatrixFilters {
  layers: TokenLayer[];
  classifications: Classification[];
  search: string;
  minDivergence: number;
  maxDivergence: number;
}

export interface MigrationTask {
  id: string;
  auditId: string;
  title: string;
  description: string;
  entityType: 'token' | 'component' | 'pattern';
  entityIds: string[];
  sourceProduct: string;
  classification: Classification;
  effortEstimate: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  priority: 'critical' | 'high' | 'medium' | 'low';
  phase: number;
  status: 'todo' | 'in-progress' | 'done';
}
