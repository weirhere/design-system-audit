import { Tabs } from '@/components/ui/tabs';

export default async function AuditDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tabs = [
    { label: 'Setup', href: `/audits/${id}/setup` },
    { label: 'Audit', href: `/audits/${id}/audit` },
    { label: 'Report', href: `/audits/${id}/report` },
  ];

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} />
      {children}
    </div>
  );
}
