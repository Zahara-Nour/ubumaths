# Database (Supabase)

## Workflow migrations

The database workflow follows a structured approach to maintain consistency and proper version control:

1. **Claude crée** `.sql` migrations dans `supabase/migrations/`
   - Format: `<timestamp>_<description>.sql`
   - Example: `20250228143022_add_assessment_analytics.sql`

2. **User push** les migrations via `pnpm db:migrate`
   - Applies all pending migrations to local/remote Supabase

3. **Update** related files
   - `src/lib/types/database.ts` - TypeScript types auto-generated from schema
   - `docs/architecture/database-schema.md` - Documentation of schema changes

## Important notes

- **NE PAS modifier le schéma dans Supabase Dashboard** - Always use migrations
- **Toujours créer migrations timestampées** - Ensures correct ordering
- **Garder la documentation synchronisée** - Update docs with schema changes
- Migrations are version-controlled and reproducible

## Useful Commands

```bash
# Start local Supabase development environment (requires Docker)
pnpm db:start

# Stop local Supabase development environment
pnpm db:stop

# Push migrations to Supabase
pnpm db:migrate

# Run database trigger tests (requires local Supabase)
pnpm test:triggers
```

## Detailed Information

For comprehensive information about the database schema, table structures, and relationships, see:

[Database Schema Documentation](../architecture/database-schema.md)

---

[← Back to Claude Docs](./README.md)
