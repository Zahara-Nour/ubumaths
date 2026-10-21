# « Mes objets » replié sur téléphone — journal

## Reprendre ici

_Mis à jour le 2026-10-19, après #1546._

- **État** : chantier **clos** — #1546 mergée (pas en prod) ; durable versé dans
  `docs/systeme/atelier.md` (« Mes objets » sur téléphone) ; vérification manuelle notée
  (`docs/wip/verifications-manuelles.md`) · **Prochaine action** : aucune · **En attente de
  David** : vérification au vrai téléphone · **Worktree / branche** : retirés

## Phase 0 (validée le 2026-10-19)

Décision : [atelier.md § À venir](../../systeme/atelier.md), journal
[atelier-geometrie-progress.md](atelier-geometrie-progress.md). Avec deux objets,
« Mes objets » ramenait la toile de Géométrie à 160 px ; Graphe aussi.

Réponses de David (recos) : **A** seuil 720 px (passage en une colonne) · **B** boutons « + »
cachés une fois replié · **C** pas de souvenir du choix · **D** toutes les vues (même panneau).

1. ≤ 720 px, au moins un objet : panneau replié, une barre « Mes objets · N objets ▾ ».
2. Le bouton (`aria-expanded`, `aria-controls`) déplie et replie.
3. Replié, la vue prend la hauteur libérée.
4. Le compte reste visible et suit les créations.
5. > 720 px : rien ne change, pas de bouton.
6. Vide : déplié ; un premier objet créé par « + » le laisse déplié, créé ailleurs le replie.
7. Redevenu vide : déplié.
8. Repassé sous 720 px : l'état d'avant.
9. Charger / lien : état inchangé.
10. Focus après suppression : le titre « Mes objets », toujours dans la barre.
11. Pas de flash : repli en CSS, sans `matchMedia`.
12. Sans media queries : déplié (comportement d'avant).
13. Pas de `localStorage`.
14. **Ajouté en cours de route** (relevé par le test B3 de `/grapheur`) : une carte qui prend la
    main (`selected` non nul : carte prête à taper de `/grapheur`, f′ après « Dériver ») déplie le
    panneau — sinon le champ qui a le focus était caché. À signaler à David dans la PR.
