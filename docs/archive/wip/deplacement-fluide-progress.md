# Déplacement fluide des points (atelier, vue Géométrie)

## Reprendre ici

_Mis à jour le 2026-10-23, clôture._

- **État** : CLOS. #1611 mergée ; vérification manuelle faite par David ; le durable est dans
  `docs/systeme/atelier.md` (« Vue Géométrie » et réglage « Déplacement des points »).
- **Prochaine action** : aucune. **En attente de David** : rien.
- **Worktree / branche** : retirés.

## Décisions de David (2026-10-22)

1. Fluide = arrondi au pixel près selon le zoom (2 décimales au zoom habituel), pas deux décimales fixes.
2. Pas d'aimantation aux entiers en mode fluide.
3. Les points sur un objet suivent aussi le réglage (glisser et outil Point) ; le curseur de leur carte et les flèches (0,1) ne changent pas.

Défaut : aimanté (comportement d'avant). Retenu dans le navigateur (`chiphre-atelier-deplacement`).
