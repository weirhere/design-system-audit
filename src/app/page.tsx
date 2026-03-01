import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/audits');
  }

  return (
    <div className="space-y-24 pb-16">
      {/* Hero */}
      <section className="space-y-6 pt-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Audit your design system
          <br />
          <span className="text-indigo-600">across products</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          Crawl any website, extract design tokens, compare them against your
          reference system, and get a prioritized migration roadmap — all in one
          tool.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-8">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          Everything you need to align your UI
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="8" />
                <path d="M10 6v4l3 3" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-slate-900">Crawl &amp; Extract</h3>
            <p className="text-sm text-slate-600">
              Scan live sites with a headless browser and automatically extract
              colors, typography, spacing, and component patterns.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-slate-900">Compare &amp; Classify</h3>
            <p className="text-sm text-slate-600">
              Match extracted tokens against your reference design system and
              classify deviations as Inherit, Adapt, or Extend.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17V5a2 2 0 012-2h10a2 2 0 012 2v12" />
                <path d="M7 9h6M7 13h4" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-slate-900">Report &amp; Export</h3>
            <p className="text-sm text-slate-600">
              Generate migration roadmaps and export to PDF, CSV, JSON, or
              create Jira and Linear tickets directly.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          How it works
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Set up your audit',
              description:
                'Pick your target URLs and reference design system, then configure crawl settings.',
            },
            {
              step: '2',
              title: 'Run the crawl',
              description:
                'The engine visits each page, extracts design tokens, and streams progress in real time.',
            },
            {
              step: '3',
              title: 'Review your report',
              description:
                'See every deviation classified and prioritized, with a clear roadmap to full alignment.',
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {item.step}
              </div>
              <h3 className="mb-1 font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-12">
          <h2 className="mb-3 text-2xl font-semibold text-slate-900">
            Ready to audit your design system?
          </h2>
          <p className="mb-6 text-slate-600">
            Sign in with GitHub and run your first audit in minutes.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
