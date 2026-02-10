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
    <div>
      <div className="sticky top-14 z-40 -mx-6 -mt-8 border-b border-slate-200 bg-white px-6">
        <Tabs tabs={tabs} className="border-b-0" />
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
