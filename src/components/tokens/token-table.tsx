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
import type { ExtractedToken } from '@/types/token';
import { ClassificationBadge } from '@/components/ui/badge';
import { ColorSwatch } from './color-swatch';
import { LAYER_LABELS } from '@/lib/constants';
import type { TokenLayer } from '@/types/audit';

interface TokenTableProps {
  tokens: ExtractedToken[];
  globalFilter?: string;
}

export function TokenTable({ tokens, globalFilter = '' }: TokenTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<ExtractedToken>[]>(
    () => [
      {
        accessorKey: 'layer',
        header: 'Layer',
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-slate-500 uppercase">
            {LAYER_LABELS[getValue() as TokenLayer]}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'property',
        header: 'Property',
        cell: ({ getValue }) => (
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{getValue() as string}</code>
        ),
      },
      {
        accessorKey: 'computedValue',
        header: 'Value',
        cell: ({ row }) => {
          const value = row.original.computedValue;
          const isColor = row.original.layer === 'color';
          return (
            <div className="flex items-center gap-2">
              {isColor && <ColorSwatch color={value} size="sm" />}
              <code className="text-xs">{value}</code>
            </div>
          );
        },
      },
      {
        accessorKey: 'cssVariable',
        header: 'CSS Variable',
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          return val ? (
            <code className="text-xs text-indigo-600">{val}</code>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          );
        },
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums">{getValue() as number}</span>
        ),
        size: 90,
      },
      {
        accessorKey: 'sourceProduct',
        header: 'Source',
        cell: ({ getValue }) => {
          try {
            return <span className="text-xs text-slate-500">{new URL(getValue() as string).hostname}</span>;
          } catch {
            return <span className="text-xs text-slate-500">{getValue() as string}</span>;
          }
        },
      },
      {
        accessorKey: 'classification',
        header: 'Classification',
        cell: ({ getValue }) => (
          <ClassificationBadge classification={getValue() as ExtractedToken['classification']} />
        ),
        size: 120,
      },
    ],
    []
  );

  const table = useReactTable({
    data: tokens,
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
                  className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
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
          No tokens found matching your filters.
        </div>
      )}
    </div>
  );
}
