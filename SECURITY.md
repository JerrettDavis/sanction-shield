# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please report security vulnerabilities privately via one of these methods:

1. **GitHub Security Advisories** (preferred): Use the "Report a vulnerability" button on the [Security tab](https://github.com/JerrettDavis/sanction-shield/security/advisories/new)
2. **Email**: Contact the repository owner directly

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Depends on severity, typically within 14 days for critical issues

## Security Practices

- API keys are SHA-256 hashed at rest
- Test keys are blocked in production environments
- Row-Level Security enforces tenant data isolation
- Audit logs are append-only with database trigger enforcement
- No secrets are stored in the repository or local development environment
- All production secrets are managed via Vercel environment variables
- Dependencies are monitored via Dependabot
