import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type AuthError = { error: NextResponse };
type AuthSuccess = { userId: string };
type AuditOwnerSuccess = { userId: string; audit: typeof audits.$inferSelect };

export async function requireAuth(): Promise<AuthError | AuthSuccess> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { userId: user.id };
}

export async function requireAuditOwner(auditId: string): Promise<AuthError | AuditOwnerSuccess> {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult;
  }

  const db = getDb();
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
  });

  if (!audit) {
    return { error: NextResponse.json({ error: 'Audit not found' }, { status: 404 }) };
  }

  if (audit.userId && audit.userId !== authResult.userId) {
    return { error: NextResponse.json({ error: 'Audit not found' }, { status: 404 }) };
  }

  return { userId: authResult.userId, audit };
}
