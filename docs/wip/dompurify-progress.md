# DOMPurify 3.4.17 (faille critique qui bloque la CI)

## Reprendre ici

_Mis à jour le 2026-10-22, après #1614._

- **État** : livré, #1614 mergée (pas en prod) · **Prochaine action** : aucune ; journal à archiver · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : supprimés

## Constat

Le 2026-10-22, la tâche « Security Audit » de la CI échoue sur toutes les PR (#1612, #1613) : GHSA-cg2g-xh64-v4q7 (critique) et GHSA-mrv2-3pqr-j5jr (haute) sur dompurify ≤ 3.4.16, venu par `isomorphic-dompurify` et `jspdf`. Corrigé en 3.4.17 (publié le 2026-10-12).
