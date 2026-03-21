# SanctionShield Constitution

## Core Principles

### I. Zero-Capital First
Every architectural and tooling decision MUST prioritize zero or near-zero cost. Free-tier cloud services (Vercel, Cloudflare Workers, Supabase, Neon) are the default. No paid service may be introduced until monthly revenue exceeds 3x the service cost. Every dependency must have a free tier that supports MVP scale.

### II. Security by Default
This is a compliance product. Security is not optional. All data must be encrypted at rest and in transit. Tenant isolation must be absolute — no shared tables without row-level security. API keys must be hashed, never stored in plaintext. Audit logs are append-only and immutable. The product's credibility depends on its own security posture.

### III. Accuracy Over Speed
False negatives (missing a sanctioned entity) are catastrophic — they expose the customer to $330K+ OFAC penalties. False positives are annoying but safe. The system MUST be tuned for high recall, accepting some false positives. Configurable confidence thresholds let customers adjust the tradeoff.

### IV. Simplicity & YAGNI
Start with the simplest thing that works. No microservices — single deployable. No complex orchestration — cron jobs for list updates. No GraphQL — REST with JSON. No custom auth — Supabase Auth or similar. Add complexity only when current simplicity provably fails under real load.

### V. Auditability is the Product
Every action in the system must be logged. The audit trail is not a feature — it IS the product. Companies buy SanctionShield to prove they screened, not just to screen. Design every feature with "how does this appear in an audit report?" as the first question.

## Technology Constraints

- **Language**: TypeScript (full-stack — API + dashboard)
- **Runtime**: Node.js 22+ on Vercel Serverless Functions or Cloudflare Workers
- **Database**: PostgreSQL via Supabase (free tier: 500MB, 2 projects)
- **Frontend**: Next.js 15+ with App Router
- **Auth**: Supabase Auth (free tier: 50K MAU)
- **Email**: Resend (free tier: 100 emails/day) or Supabase Edge Functions + SMTP
- **Deployment**: Vercel (free tier: 100GB bandwidth, serverless functions)
- **Testing**: Vitest for unit/integration, Playwright for E2E
- **Fuzzy Matching**: fuse.js or custom Levenshtein + Soundex/Metaphone implementation
- **List Parsing**: Custom XML/CSV parser (OFAC provides both formats)

## Development Workflow

1. Spec first — no code without a written spec
2. Tests describe behavior — write failing tests before implementation
3. Small commits — one logical change per commit
4. PR review — all code changes go through PR with description linking to spec
5. Ship daily — MVP iterates in 1-2 day cycles

## Governance

This constitution supersedes all other development guidance for the SanctionShield project. Amendments require documented justification and approval from the project lead (JD). Complexity must be justified against the Zero-Capital and Simplicity principles.

**Version**: 1.0 | **Ratified**: 2026-03-21 | **Last Amended**: 2026-03-21
