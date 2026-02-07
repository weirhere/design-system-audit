'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { MatrixRow } from '@/types/matrix';
import { ClassificationBadge } from '@/components/ui/badge';
import { ColorSwatch } from '@/components/tokens/color-swatch';
import { LAYER_LABELS } from '@/lib/constants';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

interface ComparisonMatrixProps {
  rows: MatrixRow[];
  products: string[];
  globalFilter?: string;
}

function getDivergenceColor(d: number): string {
  if (d <= 0.02) return 'bg-emerald-50 text-emerald-700';
  if (d <= 0.15) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export function ComparisonMatrix({ rows, products, globalFilter = '' }: ComparisonMatrixProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'maxDivergence', desc: true }]);

  const columns = useMemo<ColumnDef<MatrixRow>[]>(() => {
    const base: ColumnDef<MatrixRow>[] = [
      {
        accessorKey: 'layer',
        header: 'Layer',
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-slate-500 uppercase">
            {LAYER_LABELS[getValue() as TokenLayer]}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: 'property',
        header: 'Property',
        cell: ({ getValue }) => (
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{getValue() as string}</code>
        ),
        size: 140,
      },
      {
        accessorKey: 'canonicalValue',
        header: 'Canonical',
        cell: ({ row }) => {
          const val = row.original.canonicalValue;
          const isColor = row.original.layer === 'color';
          return (
            <div className="flex items-center gap-2">
              {isColor && <ColorSwatch color={val} size="sm" />}
              <code className="text-xs">{val}</code>
            </div>
          );
        },
        size: 160,
      },
    ];

    // Add a column per product
    const productCols: ColumnDef<MatrixRow>[] = products.map((product) => ({
      id: `product-${product}`,
      header: () => {
        try {
          return <span className="text-xs">{new URL(product).hostname}</span>;
        } catch {
          return <span className="text-xs">{product}</span>;
        }
      },
      cell: ({ row }: { row: { original: MatrixRow } }) => {
        const pv = row.original.productValues[product];
        if (!pv) return <span className="text-slate-300">—</span>;
        const isColor = row.original.layer === 'color';
        return (
          <div className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${getDivergenceColor(pv.divergence)}`}>
            {isColor && <ColorSwatch color={pv.value} size="sm" />}
            <code className="text-xs">{pv.value}</code>
            <span className="text-[10px] opacity-60">{Math.round(pv.divergence * 100)}%</span>
          </div>
        );
      },
      size: 180,
    }));

    const tail: ColumnDef<MatrixRow>[] = [
      {
        accessorKey: 'maxDivergence',
        header: 'Max Δ',
        cell: ({ getValue }) => {
          const d = getValue() as number;
          return (
            <span className={`text-xs font-medium ${getDivergenceColor(d)} rounded px-1.5 py-0.5`}>
              {Math.round(d * 100)}%
            </span>
          );
        },
        size: 70,
      },
    ];

    return [...base, ...productCols, ...tail];
  }, [products]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap"
                  style={{ width: header.column.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? ''}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-400">
          No comparison data found.
        </div>
      )}
    </div>
  );
}
