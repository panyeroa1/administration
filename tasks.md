# Important Notice to Developers

This is a crucial reminder regarding the branding and user interface guidelines for all front-end development work associated with the Eburon project. As a developer, it is essential that you adhere strictly to the following requirement:

**Use Eburon Branding Exclusively:**  
All front-end UI elements must exclusively feature Eburon branding. This means that every logo, icon, color scheme, and hyperlink visible to the user should be aligned with the Eburon brand identity. Under no circumstances should any other third-party or external brand names, logos, or identifiers appear in the UI. All links should also point to `eburon.ai` or related Eburon-controlled domains to maintain brand consistency.

This enforcement is vital to ensure a unified and professional brand image. The Eburon identity should be clear and consistent across all user-facing interfaces. Please prioritize this as a non-negotiable standard in your development workflow.

By enforcing this rule, we protect the integrity and recognition of the Eburon brand. Thank you for your attention to this detail and for ensuring that all front-end elements reflect this guideline.

------------------------------------------------------------
STANDARD TASK BLOCK
------------------------------------------------------------

Task ID: T-0001
Title: Setup Development Branch and Database Schema
Status: IN-PROGRESS
Owner: Miles
Related repo or service: esrealagent
Branch: development
Created: 2025-12-16 21:55
Last updated: 2025-12-16 21:55

START LOG

Timestamp: 2025-12-16 21:55
Current behavior or state:
- Project is on main branch (or detached).
- Missing node_modules (fixed).
- Database connection failing due to missing tables.
- No `tasks.md` file.

Plan and scope for this task:
- Create `tasks.md` to track work.
- Create `development` branch.
- Commit `schema.sql`, `scripts/test-db.ts`, and package updates.
- Push to origin.

Files or modules expected to change:
- tasks.md
- schema.sql
- scripts/test-db.ts
- package.json
- package-lock.json

Risks or things to watch out for:
- Database migration requires manual run on Supabase dashboard if API key lacks permissions.

END LOG

Timestamp: 2025-12-16 22:00
Summary of what actually changed:
- Created and switched to 'development' branch.
- Created 'schema.sql' containing definitions for missing tables ('listings', 'leads', 'properties', 'tasks', etc.).
- Created 'scripts/test-db.ts' to verify database connectivity.
- Updated '.gitignore' to track 'tasks.md'.
- Installed project dependencies.

Files actually modified:
- .gitignore
- tasks.md
- schema.sql
- scripts/test-db.ts
- package-lock.json

How it was tested:
- Ran 'scripts/test-db.ts' which confirmed tables are missing (PGRST205).
- Git operations checked: branch creation, commit, and push to 'origin/development' were successful.

Test result:
- PASS: Code and schema pushed successfully.
- PENDING: Database migration (SQL execution) pending user action on Supabase dashboard.

Known limitations or follow-up tasks:
- User must run the contents of 'schema.sql' in Supabase SQL Editor to fix the application's database errors.
