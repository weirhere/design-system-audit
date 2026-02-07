'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClassificationBadge } from '@/components/ui/badge';
import { EFFORT_LABELS, PRIORITY_LABELS } from '@/lib/constants';
import type { MigrationTask } from '@/types/matrix';

export default function RoadmapPage() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [loading, setLoading] = useState(true);

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

  const grouped = useMemo(() => {
    const phases: Record<number, MigrationTask[]> = {};
    for (const task of tasks) {
      if (!phases[task.phase]) {
        phases[task.phase] = [];
      }
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-slate-100 animate-pulse" />
        ))}
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
      <h2 className="text-xl font-semibold text-slate-900">Migration Roadmap</h2>

      {grouped.map(({ phase, tasks: phaseTasks }) => (
        <section key={phase} className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Phase {phase}
            <span className="ml-2 text-sm font-normal text-slate-400">
              {phaseTasks.length} {phaseTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {phaseTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="leading-snug">{task.title}</CardTitle>
                    <ClassificationBadge classification={task.classification} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{task.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {EFFORT_LABELS[task.effortEstimate] ?? task.effortEstimate}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
