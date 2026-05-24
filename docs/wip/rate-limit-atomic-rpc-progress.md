# Rate Limit Atomic RPC — Progress

**Date** : 2026-05-24
**Statut** : Livré (prêt à commit, en attente de `pnpm db:migrate` côté utilisateur)

## Contexte

Logs Postgres Supabase remplis régulièrement de `duplicate key value violates unique constraint "rate_limits_key_key"`, surtout sur les clés `notification_mark:<uuid>`.

### Cause racine

`src/lib/server/rateLimiter.ts` faisait :

1. `SELECT … WHERE key = X AND expires_at >= NOW()` → `null` quand fenêtre expirée
2. `INSERT … (key, count, expires_at)` → collision sur la contrainte UNIQUE car l'entrée expirée occupait toujours la clé
3. Retry 3× puis DELETE-then-INSERT

Résultat : 1 à 4 lignes d'erreur Postgres par opération rate-limitée d'un utilisateur qui revient après expiration de sa fenêtre. La fonctionnalité marchait, mais les logs étaient pollués et la latence dégradée.

`cleanup_expired_rate_limits()` existait mais n'était **planifiée nulle part** (aucun `pg_cron` job).

## Solution

### 1. Nouvelle RPC atomique

`supabase/migrations/20260524133645_atomic_check_and_increment_rate_limit.sql`

```sql
INSERT INTO rate_limits AS rl (key, count, expires_at)
VALUES (p_key, 1, v_new_expires)
ON CONFLICT (key) DO UPDATE
SET
    count = CASE
        WHEN rl.expires_at < v_now THEN 1
        ELSE rl.count + 1
    END,
    expires_at = CASE
        WHEN rl.expires_at < v_now THEN EXCLUDED.expires_at
        ELSE rl.expires_at
    END
WHERE rl.expires_at < v_now OR rl.count < p_max_count
RETURNING rl.count, rl.expires_at INTO …;
```

Quatre cas couverts en un seul statement :

- Pas d'entrée → INSERT (allowed=true, count=1)
- Entrée expirée → UPDATE reset (allowed=true, count=1)
- Entrée valide, count < max → UPDATE +1 (allowed=true)
- Entrée valide, count >= max → WHERE filtre → 0 lignes (allowed=false)

Le WHERE sur `DO UPDATE` est évalué sous le verrou exclusif acquis par PostgreSQL pendant la résolution du conflit → pas de TOCTOU.

### 2. Refactor `rateLimiter.ts`

`src/lib/server/rateLimiter.ts` — `checkRateLimit()` passe de ~135 lignes (SELECT + UPDATE atomique + re-check + INSERT + retry + cleanup) à ~50 lignes (un seul appel RPC).

API publique inchangée (`checkLoginRateLimitByIP`, `checkNotificationMarkRateLimit`, etc.).
Sémantique fail-open préservée.

### 3. Cleanup automatique

`supabase/migrations/20260524134151_extend_cleanup_all_with_rate_limits.sql`

Étend `run_cleanup_all()` (job pg_cron quotidien existant à 02:00 UTC) pour purger les entrées `rate_limits` expirées en plus du cache et des notifications.

### 4. Tests

`src/lib/server/rateLimiter.test.ts` :

- Mock réécrit pour intercepter `rpc('check_and_increment_rate_limit')` au lieu de `from('rate_limits').insert/select/update`
- Toutes les 1243 lignes de tests préservées
- 2 nouveaux tests de régression dans `describe('Expired entry handling (regression: 23505 log spam)')`
- 1 fix pour test pré-cassé (OAuth 10→100, divergence présente depuis commit `3117e9148`)

**Résultat : 67/67 tests passent.**

## Revues

- **code-reviewer** : "Ready to merge". Suggestions mineures appliquées (nullabilité du type `CheckAndIncrementRow`, commentaires SQL clarifiés).
- **security-auditor** : Atomicité confirmée correcte. Aucun nouveau vecteur de bypass. Pas d'injection SQL. PII bien masquée (`maskKey()`).

## Fichiers modifiés

| Fichier                                                                        | Changement                                          |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `supabase/migrations/20260524133645_atomic_check_and_increment_rate_limit.sql` | **Nouveau** — RPC atomique                          |
| `supabase/migrations/20260524134151_extend_cleanup_all_with_rate_limits.sql`   | **Nouveau** — purge rate_limits dans cron quotidien |
| `src/lib/server/rateLimiter.ts`                                                | Refactor `checkRateLimit()`                         |
| `src/lib/server/rateLimiter.test.ts`                                           | Mock RPC + 2 tests régression + fix test OAuth      |

## Validation

- ✅ Tests : 67/67 pass
- ✅ ESLint : clean sur fichiers modifiés
- ✅ `pnpm check:incremental` : baseline préservé (9 ERRORS / 46 WARNINGS — inchangé)
- ⏳ `pnpm db:migrate` (utilisateur) puis `pnpm db:types` pour régénérer `database.ts` et retirer le cast `(supabase.rpc as CallableFunction)` (optionnel — pattern identique à `tutor-rate-limiter.ts`)

## Documents produits

- `docs/wip/rate-limit-atomic-rpc-progress.md` (ce fichier)
