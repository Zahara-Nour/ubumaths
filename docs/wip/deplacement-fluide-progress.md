# Déplacement fluide des points (atelier, vue Géométrie)

## Reprendre ici

_Mis à jour le 2026-10-22, avant la PR._

- **État** : réglage « Déplacement des points » (Aimanté / Fluide) codé, tests verts · **Prochaine action** : PR, revue `code-reviewer`, merge · **En attente de David** : vérification manuelle à la souris · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-deplacement-fluide` / `feat/atelier-deplacement-fluide`

## Décisions de David (2026-10-22)

1. Fluide = arrondi au pixel près selon le zoom (2 décimales au zoom habituel), pas deux décimales fixes.
2. Pas d'aimantation aux entiers en mode fluide.
3. Les points sur un objet suivent aussi le réglage (glisser et outil Point) ; le curseur de leur carte et les flèches (0,1) ne changent pas.

Défaut : aimanté (comportement d'avant). Retenu dans le navigateur (`chiphre-atelier-deplacement`).
