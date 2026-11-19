# Dependabot — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-19, ouverture du chantier._

- **État** : une seule PR Dependabot ouverte, **#2075** (`@getbrevo/brevo` 3.0.4 → 6.2.0, majeure, ouverte le 2026-11-01) : CI rouge sur Type Check et Types des tests (cliquet), état de fusion inconnu (base ancienne).
- **Prochaine action** : phase 0. Lire le journal des changements de Brevo 4, 5 et 6, compter les usages dans `src` (`grep -rn "@getbrevo/brevo" src`), puis dire à David ce qui change (envoi des courriels) avant de coder.
- **En attente de David** : rien.
- **Pièges en cours** : Dependabot ne monte pas `.nvmrc` (à la main, vide le cache ESLint jusqu'au nocturne suivant) ; typst.ts ignoré exprès (`.github/dependabot.yml`) ; l'envoi de courriels touche des adresses réelles → tests sans envoi.
- **Worktree / branche** : aucun (à créer : `ubumaths-wt-dependabot`).

---

## Origine

2026-11-19 : à la clôture du chantier `mises-a-jour` (`docs/archive/wip/mises-a-jour-progress.md`), #2075 et les autres versions en retard ont été laissées à Dependabot. David : « je vais relancer la session pour régler les dependabot ».

## Rappels

- Dependabot : lot mensuel (lundi, 06:00 Paris), mineures et patchs groupés, une PR par majeure, délai de 3 jours.
- Autres majeures en retard au 2026-11-18 (`pnpm outdated`) : vitest 5 (chemin dans la mémoire `project_vitest-5-chemin`), TypeScript 7, ESLint 10, marked 18, supabase CLI 3, tailwind-variants 4.
- v0.97.0 en prod le 2026-11-19 : CI de version 7 min 30, étape ESLint 39 s (cache réparé).
