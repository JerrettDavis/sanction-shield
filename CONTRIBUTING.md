# Contributing to SanctionShield

Thank you for your interest in contributing to SanctionShield.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Seed OFAC data: `npx tsx scripts/seed-ofac.ts`
4. Run dev server: `npm run dev`
5. Run tests: `npm test`

No cloud secrets or external services are required for local development.

## Pull Request Process

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass: `npm run test:ci`
4. Ensure linting passes: `npm run lint`
5. Ensure build succeeds: `npm run build`
6. Fill out the PR template completely
7. Request review

## Code Standards

- TypeScript strict mode
- All API changes must include audit logging
- Security-sensitive code requires review from a maintainer
- No secrets in code — use environment variables
- Tests required for matching algorithm changes

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `test:` — test additions/changes
- `refactor:` — code restructuring
- `chore:` — maintenance tasks
