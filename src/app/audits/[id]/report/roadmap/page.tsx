'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClassificationBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EFFORT_LABELS, PRIORITY_LABELS, CLASSIFICATION_COLORS } from '@/lib/constants';
import type { MigrationTask } from '@/types/matrix';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type ViewMode = 'timeline' | 'kanban';

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1: Inherit — Direct Adoption',
  2: 'Phase 2: Adapt — Contextual Modifiers',
  3: 'Phase 3: Extend — New Tokens',
};

const PHASE_DESCRIPTIONS: Record<number, string> = {
  1: 'Tokens that can be directly adopted from the design system with no modifications.',
  2: 'Tokens that need density or context modifiers to align with the design system.',
  3: 'New tokens needed where no design system equivalent exists.',
};

const STATUS_COLUMNS = ['todo', 'in-progress', 'done'] as const;
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

export default function RoadmapPage() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  useEffect(() => {
    if (!id) return;
    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audits/${id}/roadmap`);
        if (!res.ok) throw new Error('Failed to fetch roadmap');
        const data = await res.json();
        setTasks(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, [id]);

  // Stats
  const stats = useMemo(() => {
    const byEffort: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byPhase: Record<number, number> = {};
    const byClassification: Record<string, number> = {};
    let totalPoints = 0;
    const effortPoints: Record<string, number> = { xs: 1, sm: 2, md: 3, lg: 5, xl: 8 };

    for (const t of tasks) {
      byEffort[t.effortEstimate] = (byEffort[t.effortEstimate] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      byPhase[t.phase] = (byPhase[t.phase] ?? 0) + 1;
      byClassification[t.classification] = (byClassification[t.classification] ?? 0) + 1;
      totalPoints += effortPoints[t.effortEstimate] ?? 3;
    }

    return { byEffort, byPriority, byPhase, byClassification, totalPoints };
  }, [tasks]);

  const effortChartData = useMemo(() => {
    return ['xs', 'sm', 'md', 'lg', 'xl'].map((e) => ({
      effort: EFFORT_LABELS[e] ?? e,
      count: stats.byEffort[e] ?? 0,
    }));
  }, [stats]);

  const priorityChartData = useMemo(() => {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#94a3b8',
    };
    return ['critical', 'high', 'medium', 'low']
      .map((p) => ({
        name: PRIORITY_LABELS[p] ?? p,
        value: stats.byPriority[p] ?? 0,
        color: colors[p] ?? '#94a3b8',
      }))
      .filter((d) => d.value > 0);
  }, [stats]);

  // Timeline grouping (by phase)
  const grouped = useMemo(() => {
    const phases: Record<number, MigrationTask[]> = {};
    for (const task of tasks) {
      if (!phases[task.phase]) phases[task.phase] = [];
      phases[task.phase].push(task);
    }
    return Object.entries(phases)
      .map(([phase, items]) => ({
        phase: Number(phase),
        tasks: items.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return (
            (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
          );
        }),
      }))
      .sort((a, b) => a.phase - b.phase);
  }, [tasks]);

  // Kanban grouping (by status)
  const kanbanColumns = useMemo(() => {
    return STATUS_COLUMNS.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      tasks: tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.phase - b.phase),
    }));
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-60 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Migration Roadmap</h2>
        <p className="text-sm text-slate-500">
          No roadmap tasks generated yet. Complete the crawl and analysis first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Migration Roadmap</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tasks.length} tasks &middot; {stats.totalPoints} story points estimated
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setViewMode('timeline')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'timeline'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Kanban
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((phase) => (
          <Card key={phase}>
            <CardContent className="py-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Phase {phase}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {stats.byPhase[phase] ?? 0}
              </p>
              <p className="text-xs text-slate-400">tasks</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Effort & Priority Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Effort</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={effortChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="effort"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">
                No data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-8">
          {grouped.map(({ phase, tasks: phaseTasks }) => (
            <section key={phase} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {PHASE_LABELS[phase] ?? `Phase ${phase}`}
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    {phaseTasks.length} {phaseTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </h3>
                <p className="text-sm text-slate-500">
                  {PHASE_DESCRIPTIONS[phase] ?? ''}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {phaseTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-3 gap-4">
          {kanbanColumns.map(({ status, label, tasks: colTasks }) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, compact = false }: { task: MigrationTask; compact?: boolean }) {
  return (
    <Card className={compact ? '' : ''}>
      <CardContent className={compact ? 'py-3 px-3' : 'py-4'}>
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-slate-800 ${compact ? 'text-xs' : 'text-sm'} leading-snug`}>
            {task.title}
          </p>
          <ClassificationBadge classification={task.classification} />
        </div>
        {!compact && (
          <p className="mt-2 text-xs text-slate-500 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {EFFORT_LABELS[task.effortEstimate] ?? task.effortEstimate}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              task.priority === 'critical'
                ? 'bg-red-100 text-red-700'
                : task.priority === 'high'
                  ? 'bg-orange-100 text-orange-700'
                  : task.priority === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
            }`}
          >
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
          {compact && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
              Phase {task.phase}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
