# Chantier `tidy-conditions` — la variante `{ result, conditions }` de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-26, ouverture du chantier (rien de codé)._

- **État** : chantier ouvert, worktree et journal seulement. Aucune phase 0 faite.
- **Prochaine action** : phase 0. D'abord trouver le **premier appelant** (c'est faute d'appelant que la variante a été reportée deux fois, Q2 du lot 4a puis Q20 de simplify-carte) ; sonder ce qu'il affiche aujourd'hui ; puis comportements en français (nominal / limite / erreur) et questions à David.
- **En attente de David** : rien (il a demandé le chantier le 2026-10-26).
- **Pièges en cours** : la convention d'équivalence autorise `x/x → 1` pour COMPARER (domaines intersectés) ; le problème n'est que pour AFFICHER (ADR 0006, 0032).
- **Worktree / branche** : `../ubumaths-wt-tidy-conditions` · `feat/tidy-conditions`.

## Contexte

Décision **S3** de simplify-carte (David, 2026-10-22) : par défaut, `tidy` ne fait aucune simplification qui perd le domaine (`x/x` reste) ; avec des hypothèses déclarées (énoncé, domaine de f, type de la variable, ADR 0012), il la fait ; **une variante explicite rend `{ result, conditions }` pour afficher « pour x ≠ 0 »**. Les deux premières parties sont codées (lot 4a, 2026-10-23 ; extension aux sommes `ln x − ln x`, `1/x − 1/x`, `√x − √x` le 2026-10-24) ; la variante, non.

À lire (dans cet ordre, seulement ce qu'il faut) :

- `docs/systeme/mathast/tidy-spec.md` § A (contrat, « Jamais de changement de domaine ») et les lignes « S3 » de son historique.
- `docs/adr/0032-la-forme-affichee-se-choisit-par-le-but.md`.
- Journal archivé `docs/archive/wip/simplify-carte-progress.md` : § 6 (S3, l. ~158-174), § 12 (identités et convention d'équivalence), § 21 (factoriser au milieu d'un calcul, condition affichée `x ≠ −1`), § 36 (lot 4a), § 49-50 (Q20 reportée), § 64 (sommes), Q28 (`x^0`).
- `docs/systeme/mathast/convention-equivalence.md`.

Cas déjà relevés qui attendent la variante (README mathAST, points ouverts) :

- `x/x` → « 1, pour x ≠ 0 » ; `ln x − ln x` → « 0, pour x > 0 » ;
- `x(1/x − 1)` développé → `−x + x/x` au lieu de « `1 − x`, pour x ≠ 0 » (normalize-usages) ;
- `\frac{e^{2x}x}{eˣx} → \frac{x eˣ}{x}` (`.simplifier`, le `x/x` reste visible) ;
- `1/(1/x) → x` : un `x⁻¹` sous une barre échappe au suivi du domaine (bug de `tidy`, à part).

Pistes d'appelants à vérifier (rien d'affirmé) : l'Atelier (Calcul, `.simplifier`, `.développer`), les conditions déjà produites par le moteur pédagogique (Q4 / § 21 : elles viennent de lui, pas de `tidy`).

## Historique
