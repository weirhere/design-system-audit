'use client';

import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TOKEN_LAYERS, LAYER_LABELS, CLASSIFICATION_LABELS } from '@/lib/constants';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

interface FilterBarProps {
  layer: TokenLayer | '';
  onLayerChange: (layer: TokenLayer | '') => void;
  classification: Classification | '';
  onClassificationChange: (classification: Classification | '') => void;
  search: string;
  onSearchChange: (search: string) => void;
  products?: string[];
  selectedProduct?: string;
  onProductChange?: (product: string) => void;
}

export function FilterBar({
  layer,
  onLayerChange,
  classification,
  onClassificationChange,
  search,
  onSearchChange,
  products,
  selectedProduct,
  onProductChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={layer}
        onChange={(e) => onLayerChange(e.target.value as TokenLayer | '')}
        className="w-40"
      >
        <option value="">All layers</option>
        {TOKEN_LAYERS.map((l) => (
          <option key={l} value={l}>{LAYER_LABELS[l]}</option>
        ))}
      </Select>

      <Select
        value={classification}
        onChange={(e) => onClassificationChange(e.target.value as Classification | '')}
        className="w-40"
      >
        <option value="">All classifications</option>
        <option value="inherit">{CLASSIFICATION_LABELS.inherit}</option>
        <option value="adapt">{CLASSIFICATION_LABELS.adapt}</option>
        <option value="extend">{CLASSIFICATION_LABELS.extend}</option>
        <option value="unclassified">{CLASSIFICATION_LABELS.unclassified}</option>
      </Select>

      {products && products.length > 0 && onProductChange && (
        <Select
          value={selectedProduct || ''}
          onChange={(e) => onProductChange(e.target.value)}
          className="w-52"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p} value={p}>{(() => { try { return new URL(p).hostname; } catch { return p; } })()}</option>
          ))}
        </Select>
      )}

      <Input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search tokens..."
        className="w-52"
      />
    </div>
  );
}
