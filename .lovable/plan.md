# Plan: Mark app as Demo + Document accepted security posture

## Goal
Make it unmistakably clear that this is a **demo/MVP** and that the next iteration requires **Option 1 (full authentication + role-based access control)** to comply with **Kenya's Data Protection Act**.

## Changes

### 1. Demo Banner (Landing Page + Estate Detail)
Add a **fixed or persistent banner** at the top of both pages with:
- Label: "DEMO / MVP"
- Message: "This is a public demonstration. The next release will require secure login and role-based access to protect resident and committee data, in compliance with Kenya's Data Protection Act."
- Color: amber/gold warning tone (matching the existing green/gold palette, but clearly distinct as a warning)
- Dismissible on the landing page, but a shorter persistent strip remains on the estate detail page

### 2. Footer update (Landing Page)
Add a small line below the existing footer:
"Demo build. All data is publicly visible for testing purposes. Production deployment requires authentication and access controls per the Data Protection Act, 2019."

### 3. Security Memory Update
Write a `security--update_memory` document explaining:
- This is a demo/MVP for a residents association
- All data is intentionally public for testing
- Next iteration (Option A) will add: email/password + Google auth, `user_roles` table, `has_role()` security definer, and proper RLS policies scoped to estate committee members
- Why this is needed: Kenya Data Protection Act requires lawful processing, data minimisation, and security safeguards for personal data (resident phone numbers, emails, landlord contacts)

### 4. Ignore Remaining Security Findings
Use `security--manage_security_finding` to ignore the 4 remaining scan findings with the shared reason that this is an intentional demo/MVP and proper access control is planned for the next iteration.

---

## Acceptance criteria
- [ ] A visitor sees the demo banner immediately on load (landing page)
- [ ] The banner mentions Kenya's Data Protection Act and the need for secure login in the next iteration
- [ ] Estate detail page also shows a warning strip
- [ ] All 4 remaining security scan findings are ignored with documented rationale
- [ ] Security memory is updated