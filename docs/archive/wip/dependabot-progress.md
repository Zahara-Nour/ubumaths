# Dependabot — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-19 : chantier clos par David._

- **État** : **clos.** #2879 mergée (Brevo 3.0.4 → 6.2.0), #2075 fermée, aucune PR Dependabot ouverte.
- **Versement** : rien de neuf à verser. `.nvmrc` à la main et typst.ts ignoré sont déjà dans `docs/pratiques/environnement-de-dev.md` ; la raison de `maxRetries: 0` est en commentaire dans `src/lib/server/email/brevo.ts`.
- **Prochaine action** : aucune. Prochaines PR Dependabot : nouveau chantier si une majeure demande du code.

---

## Origine

2026-11-19 : à la clôture du chantier `mises-a-jour` (`docs/archive/wip/mises-a-jour-progress.md`), #2075 et les autres versions en retard ont été laissées à Dependabot. David : « je vais relancer la session pour régler les dependabot ».

## Rappels

- Dependabot : lot mensuel (lundi, 06:00 Paris), mineures et patchs groupés, une PR par majeure, délai de 3 jours.
- Autres majeures en retard au 2026-11-18 (`pnpm outdated`) : vitest 5 (chemin dans la mémoire `project_vitest-5-chemin`), TypeScript 7, ESLint 10, marked 18, supabase CLI 3, tailwind-variants 4.
- v0.97.0 en prod le 2026-11-19 : CI de version 7 min 30, étape ESLint 39 s (cache réparé).

## 2026-11-19 — Brevo 6 (#2075)

- Phase 0 : un seul appelant (`src/lib/server/email/brevo.ts`, `sendTransacEmail`). La v4 a réécrit la bibliothèque (Fern) : `BrevoClient({ apiKey })`, `client.transactionalEmails.sendTransacEmail({...})`, réponse = `{ messageId }` directement. Plus de dépendances (axios, bluebird, rewire partis).
- La v6 réessaie seule 2 fois (408, 429, 5xx) → risque de courriel en double (lien de consentement). **David : `maxRetries: 0`** (comportement de la v3).
- Tests : imitations adaptées ; `brevo-vraie-bibliotheque.test.ts` passe par la vraie bibliothèque avec `fetch` simulé — vérifié rouge sans `maxRetries: 0` (4 tests), vert avec.
- Revue : code-reviewer et security-auditor sans bloquant ; message d'erreur v6 (corps de réponse, adresse possible) réduit au statut + code court (2e commit). Délai par défaut 60 s laissé : la v3 n'en avait aucun.
- #2879 mergée le 2026-11-19 (CI : garde SECURITY DEFINER relancée une fois, Docker de la CI).
