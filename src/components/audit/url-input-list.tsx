'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_PRODUCT_URLS } from '@/lib/constants';

interface UrlInputListProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

export function UrlInputList({ urls, onChange, label = 'Product URLs', max = MAX_PRODUCT_URLS }: UrlInputListProps) {
  const addUrl = () => {
    if (urls.length >= max) return;
    onChange([...urls, '']);
  };

  const removeUrl = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const updated = [...urls];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {urls.map((url, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => updateUrl(i, e.target.value)}
            placeholder="https://app.example.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeUrl(i)}
            className="text-slate-400 hover:text-red-500 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Button>
        </div>
      ))}
      {urls.length < max && (
        <Button type="button" variant="ghost" size="sm" onClick={addUrl} className="text-indigo-600">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add URL
        </Button>
      )}
      <p className="text-xs text-slate-400">{urls.length}/{max} product URLs</p>
    </div>
  );
}
