import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import { audits, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type AuthError = { error: NextResponse };
type AuthSuccess = { userId: string };
type AuditOwnerSuccess = { userId: string; audit: typeof audits.$inferSelect };

/** Ensure the user record exists in the DB (handles ephemeral DB on serverless) */
async function ensureUser(session: { user: { id: string; name?: string | null; email?: string | null; image?: string | null } }) {
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, session.user.id)).get();
  if (!existing) {
    await db.insert(users).values({
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    });
  }
}

export async function requireAuth(): Promise<AuthError | AuthSuccess> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  await ensureUser(session);
  return { userId: session.user.id };
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
