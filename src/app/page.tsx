import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

async function isAuthenticated(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export default async function Home() {
  if (await isAuthenticated()) {
    redirect("/screen");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
            <span className="font-semibold text-gray-900">SanctionShield</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full mb-6">
          OFAC SDN &middot; EU Consolidated &middot; UN Security Council
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Sanctions screening<br />your business can afford
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Screen customers, vendors, and partners against global sanctions lists in milliseconds.
          Avoid $330K+ penalties with automated compliance — starting at $79/month.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            Start Screening Free
          </Link>
          <a href="#how-it-works" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            See How It Works
          </a>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">18,700+</div>
              <div className="text-xs text-gray-500 mt-1">OFAC SDN Entries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">&lt;500ms</div>
              <div className="text-xs text-gray-500 mt-1">Screening Speed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">$330K+</div>
              <div className="text-xs text-gray-500 mt-1">Per OFAC Violation</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Daily</div>
              <div className="text-xs text-gray-500 mt-1">List Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need for sanctions compliance</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Enterprise-grade screening without the enterprise price tag. Built for import/export SMBs, customs brokers, freight forwarders, and fintech startups.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Single Name Screening</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Fuzzy matching with confidence bands. Catches typos, transliterations, and name variations that exact-match tools miss.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Batch CSV Screening</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Upload your entire customer or vendor list. Get a downloadable report with match results, confidence scores, and recommended actions.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Audit-Ready Reports</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Every screening is logged with an immutable audit trail. Generate compliance reports for regulators in one click.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Watchlist Monitoring</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Add names to continuous monitoring. Get email alerts when sanctions lists update and a previously-clear name becomes a match.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">REST API</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Integrate screening into your existing workflows. JSON API with API key auth, webhook callbacks, and comprehensive documentation.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Multi-Tenant Security</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Row-level security isolates every organization. API keys are SHA-256 hashed. Audit logs are append-only and tamper-proof.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold text-gray-900 mb-2">Submit a name</h3>
              <p className="text-sm text-gray-500">Enter a customer, vendor, or partner name via the dashboard or API. Single names or batch CSV — your choice.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant fuzzy matching</h3>
              <p className="text-sm text-gray-500">Our engine checks against 18,700+ OFAC SDN entries using trigram, phonetic, and Levenshtein algorithms. Results in under 500ms.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold text-gray-900 mb-2">Act on results</h3>
              <p className="text-sm text-gray-500">Clear results auto-pass. Matches get confidence scores and recommended actions. Every result is logged for your audit trail.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Simple, transparent pricing</h2>
        <p className="text-gray-500 text-center mb-12">No setup fees. No long-term contracts. Cancel anytime.</p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-1">Starter</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">$79<span className="text-sm font-normal text-gray-400">/mo</span></div>
            <p className="text-sm text-gray-500 mb-6">For small importers and brokers</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> 1,000 screenings/month</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Single + batch screening</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> OFAC SDN list</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Audit reports</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> API access</li>
            </ul>
            <Link href="/register" className="block text-center border border-emerald-600 text-emerald-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">Get Started</Link>
          </div>
          <div className="p-8 rounded-xl border-2 border-emerald-600 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-medium px-3 py-0.5 rounded-full">Most Popular</div>
            <h3 className="font-semibold text-gray-900 mb-1">Growth</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">$149<span className="text-sm font-normal text-gray-400">/mo</span></div>
            <p className="text-sm text-gray-500 mb-6">For growing businesses</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> 5,000 screenings/month</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Everything in Starter</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Watchlist monitoring</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Email alerts</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Priority support</li>
            </ul>
            <Link href="/register" className="block text-center bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">Get Started</Link>
          </div>
          <div className="p-8 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-1">Pro</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">$299<span className="text-sm font-normal text-gray-400">/mo</span></div>
            <p className="text-sm text-gray-500 mb-6">For compliance teams</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> 25,000 screenings/month</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Everything in Growth</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> EU + UN lists</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Multi-user access</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Dedicated support</li>
            </ul>
            <Link href="/register" className="block text-center border border-emerald-600 text-emerald-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">Get Started</Link>
          </div>
        </div>
      </section>

      {/* Compliance note */}
      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            SanctionShield screens against publicly available sanctions lists from the U.S. Department of the Treasury (OFAC SDN),
            the European Union, and the United Nations Security Council. This tool is designed to assist with compliance screening
            and does not constitute legal advice. Companies are responsible for their own compliance programs and should consult
            legal counsel for regulatory requirements specific to their jurisdiction and industry.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">SS</span>
            </div>
            <span className="text-sm text-gray-400">&copy; 2026 SanctionShield</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600">Sign In</Link>
            <a href="https://github.com/JerrettDavis/sanction-shield" className="hover:text-gray-600">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
