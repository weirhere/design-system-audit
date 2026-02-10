'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS, CLASSIFICATION_DESCRIPTIONS, LAYER_LABELS, TOKEN_LAYERS } from '@/lib/constants';
import type { ExtractedToken } from '@/types/token';
import type { TokenLayer } from '@/types/audit';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function ReportOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [tokens, setTokens] = useState<ExtractedToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchTokens = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audits/${id}/tokens`);
        if (!res.ok) throw new Error('Failed to fetch tokens');
        const data = await res.json();
        setTokens(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, [id]);

  const stats = useMemo(() => {
    let inherit = 0;
    let adapt = 0;
    let extend = 0;
    let unclassified = 0;
    for (const t of tokens) {
      switch (t.classification) {
        case 'inherit':
          inherit++;
          break;
        case 'adapt':
          adapt++;
          break;
        case 'extend':
          extend++;
          break;
        default:
          unclassified++;
      }
    }
    return { total: tokens.length, inherit, adapt, extend, unclassified };
  }, [tokens]);

  const pieData = useMemo(() => {
    return [
      { name: CLASSIFICATION_LABELS.inherit, value: stats.inherit, color: CLASSIFICATION_COLORS.inherit },
      { name: CLASSIFICATION_LABELS.adapt, value: stats.adapt, color: CLASSIFICATION_COLORS.adapt },
      { name: CLASSIFICATION_LABELS.extend, value: stats.extend, color: CLASSIFICATION_COLORS.extend },
      { name: CLASSIFICATION_LABELS.unclassified, value: stats.unclassified, color: CLASSIFICATION_COLORS.unclassified },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const barData = useMemo(() => {
    const layerCounts: Record<string, number> = {};
    for (const layer of TOKEN_LAYERS) {
      layerCounts[layer] = 0;
    }
    for (const t of tokens) {
      if (layerCounts[t.layer] !== undefined) {
        layerCounts[t.layer]++;
      }
    }
    return TOKEN_LAYERS.map((layer) => ({
      layer: LAYER_LABELS[layer],
      count: layerCounts[layer],
    }));
  }, [tokens]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Report Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Tokens
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4" title={CLASSIFICATION_DESCRIPTIONS.inherit}>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
              {CLASSIFICATION_LABELS.inherit}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.inherit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4" title={CLASSIFICATION_DESCRIPTIONS.adapt}>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
              {CLASSIFICATION_LABELS.adapt}
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.adapt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4" title={CLASSIFICATION_DESCRIPTIONS.extend}>
            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">
              {CLASSIFICATION_LABELS.extend}
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.extend}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classification Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">
                No token data available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tokens per Layer</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="layer"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">
                No token data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
