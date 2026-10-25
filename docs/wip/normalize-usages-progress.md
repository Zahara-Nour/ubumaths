# Chantier `normalize-usages` — développer sans `normalize`, nommer ses usages internes

## Reprendre ici

_Mis à jour le 2026-10-25, ouverture (rien de codé)._

- **État** : chantier ouvert par David le 2026-10-25, suite du chantier clos `simplify-carte` (point 1 de son bilan). Rien de sondé ni de codé.
- **But** : finir la décision du § 9 / § 23 de `simplify-carte` ([ADR 0032](../adr/0032-la-forme-affichee-se-choisit-par-le-but.md), point 3) — (a) « développer » à l'écran passe par le moteur pédagogique, plus par `normalize` (aujourd'hui `expand-steps.ts:350` et `:357` tirent le résultat de `denormalize(normalize())`) ; (b) les 98 `denormalize(normalize(...))` hors tests (mesuré le 2026-10-25) deviennent des fonctions qui disent ce qu'elles font (`polynomialCoefficients`…) quand ce sont des calculs internes.
- **Prochaine action** : phase 0 — relevé des 98 appels (montré / interne / comparer), sonde de `.développer` sans `normalize` sur le panel, comportements en français à faire valider par David avant tout code.
- **En attente de David** : la phase 0.
- **Pièges connus** : pas de `pnpm math` pour sonder (moteur de l'Atelier) ; `normalize` garde son nom (Q5) ; sans variable, `normalize` calcule la valeur exacte (voulu, `exactValueToShow` écrit) ; `développer` doit garder les décimaux (S1) et ne rien faire d'autre que développer (pas de dénominateur commun, pas de simplification de fraction).
- **Worktree / branche** : aucun encore (`ubumaths-wt-normalize-usages` au premier code).

## Contexte

Journal de départ : `docs/archive/wip/simplify-carte-progress.md` (§ 9, § 12, § 22, § 23). Carte des besoins : `docs/systeme/mathast/README.md` § « Quelle fonction pour quel besoin ».
