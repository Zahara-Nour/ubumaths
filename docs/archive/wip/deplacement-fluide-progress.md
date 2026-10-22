# Déplacement fluide des points (atelier, vue Géométrie)

## Reprendre ici

_Mis à jour le 2026-10-22, après #1611._

- **État** : livré, #1611 mergée (pas en prod) · **Prochaine action** : aucune ; chantier à verser à la fin (doc système déjà à jour) puis journal à archiver · **En attente de David** : vérification manuelle (ligne #1611 de `verifications-manuelles.md`) · **Pièges en cours** : aucun · **Worktree / branche** : supprimés

## Décisions de David (2026-10-22)

1. Fluide = arrondi au pixel près selon le zoom (2 décimales au zoom habituel), pas deux décimales fixes.
2. Pas d'aimantation aux entiers en mode fluide.
3. Les points sur un objet suivent aussi le réglage (glisser et outil Point) ; le curseur de leur carte et les flèches (0,1) ne changent pas.

Défaut : aimanté (comportement d'avant). Retenu dans le navigateur (`chiphre-atelier-deplacement`).
