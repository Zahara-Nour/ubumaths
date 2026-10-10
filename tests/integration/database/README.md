# tests/integration/database/

Tests des **triggers PL/pgSQL** (profils, `updated_at`, jeu, chat, messagerie, monitoring
d'erreurs, synchronisation, modèles, nettoyage, devoirs) et filtres des cartes VIP, lancés par la
suite d'intégration (`pnpm test:integration`, Supabase local).

- `*-triggers.test.ts`, `vip-card-filters.test.ts` — les tests
- `test_academic_periods_migrations.sql`, `test_minesweeper_reference_times.sql` — scripts SQL
  manuels, qu'aucun runner n'exécute

Helpers (`tests/helpers/database/`) et règles : [docs/pratiques/tests.md](../../../docs/pratiques/tests.md).
