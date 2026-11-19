# Dependabot — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-19, après #2879._

- **État** : #2879 mergée (Brevo 3.0.4 → 6.2.0, `maxRetries: 0`, erreurs réduites au statut et au code) ; #2075 fermée. **Aucune PR Dependabot ouverte.** Rien de déployé (`deploy:prod` sur demande de David).
- **Prochaine action** : demander à David s'il clôt le chantier (versement + archivage du journal) ou le garde ouvert pour les prochaines PR Dependabot.
- **En attente de David** : clore ou garder ouvert.
- **Pièges en cours** : Dependabot ne monte pas `.nvmrc` (à la main, vide le cache ESLint jusqu'au nocturne suivant) ; typst.ts ignoré exprès (`.github/dependabot.yml`) ; l'envoi de courriels touche des adresses réelles → tests sans envoi (`fetch` simulé) ; la garde SECURITY DEFINER de la CI peut rater au démarrage de Docker (relancer le job).
- **Worktree / branche** : aucun (supprimés après #2879).

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
