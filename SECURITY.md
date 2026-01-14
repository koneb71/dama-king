# Security Policy

## Supported versions

This project currently supports security fixes on the latest code in the default branch.

## Reporting a vulnerability

Please **do not** report security vulnerabilities in public GitHub issues.

Instead, use one of the following:

1. **GitHub Security Advisories (preferred)**  
   If this repository is hosted on GitHub, go to the repository → **Security** → **Advisories** → **New draft security advisory**.

2. **Private contact**  
   If Security Advisories are not available, contact the repository owner/maintainers using the email (if any) listed on their GitHub profile.

When reporting, include:
- A clear description of the issue and impact
- Steps to reproduce (proof-of-concept if possible)
- Affected routes/features (e.g. matchmaking, chat, auth)
- Any suggested fix/mitigation

## Scope (what to report)

Examples of in-scope issues:
- Auth bypass, session/token leakage, privilege escalation
- RLS policy bypass or overly-broad access to `games`, `moves`, `chat_messages`, `players`
- SQL injection in RPCs, unsafe `security definer` functions
- Stored XSS via chat or profile fields
- Insecure direct object references (IDOR) across game IDs, replays, profiles
- Leaking secrets via logs or API routes

Out of scope:
- Social engineering
- DoS from excessive traffic (unless a clear, practical app-level issue exists)

## Coordinated disclosure

Please give maintainers a reasonable time to investigate and patch before public disclosure.
