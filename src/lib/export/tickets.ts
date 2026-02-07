import { getDb } from '@/lib/db';
import { migrationTasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { EFFORT_LABELS, PRIORITY_LABELS } from '@/lib/constants';

interface JiraTicket {
  summary: string;
  description: string;
  labels: string[];
  priority: string;
  storyPoints: number;
}

const EFFORT_TO_POINTS: Record<string, number> = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 5,
  xl: 8,
};

export async function exportJiraTickets(auditId: string): Promise<string> {
  const db = getDb();
  const tasks = await db
    .select()
    .from(migrationTasks)
    .where(eq(migrationTasks.auditId, auditId));

  const tickets: JiraTicket[] = tasks.map((t) => ({
    summary: t.title,
    description: `${t.description}\n\nClassification: ${t.classification}\nEffort: ${EFFORT_LABELS[t.effortEstimate]}\nPriority: ${PRIORITY_LABELS[t.priority]}\nPhase: ${t.phase}\nEntity Type: ${t.entityType}\nSource Product: ${t.sourceProduct}`,
    labels: ['design-system-migration', `phase-${t.phase}`, t.classification, t.entityType],
    priority: t.priority === 'critical' ? 'Highest' : t.priority === 'high' ? 'High' : t.priority === 'medium' ? 'Medium' : 'Low',
    storyPoints: EFFORT_TO_POINTS[t.effortEstimate] || 3,
  }));

  return JSON.stringify(tickets, null, 2);
}

export async function exportLinearTickets(auditId: string): Promise<string> {
  const db = getDb();
  const tasks = await db
    .select()
    .from(migrationTasks)
    .where(eq(migrationTasks.auditId, auditId));

  const tickets = tasks.map((t) => ({
    title: t.title,
    description: t.description,
    labels: [t.classification, t.entityType, `phase-${t.phase}`],
    priority: t.priority === 'critical' ? 1 : t.priority === 'high' ? 2 : t.priority === 'medium' ? 3 : 4,
    estimate: EFFORT_TO_POINTS[t.effortEstimate] || 3,
  }));

  return JSON.stringify(tickets, null, 2);
}

export async function exportTicketsCsv(auditId: string): Promise<string> {
  const db = getDb();
  const tasks = await db
    .select()
    .from(migrationTasks)
    .where(eq(migrationTasks.auditId, auditId));

  const headers = ['Title', 'Description', 'Classification', 'Effort', 'Priority', 'Phase', 'Entity Type', 'Source Product', 'Status'];
  const rows = tasks.map((t) => [
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.classification,
    EFFORT_LABELS[t.effortEstimate],
    PRIORITY_LABELS[t.priority],
    t.phase,
    t.entityType,
    t.sourceProduct,
    t.status,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
