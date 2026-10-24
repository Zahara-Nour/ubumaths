# Atelier → Python : journal du chantier

## Reprendre ici

_Mis à jour le 2026-10-24, PR du pont ouverte._

- **État** : phase 0 validée (Q1-Q4 = recos, plafond 13 actions) ; PR « Ouvrir dans Python »
  ouverte : `to-python.ts`, bouton des cartes, confirmation sur `/python`.
- **Prochaine action** : CI verte → merge, puis vérification manuelle (nouvel onglet, Q1).
- **En attente de David** : rien.
- **Pièges en cours** : `window.open(…, 'noopener')` rend toujours `null` — un onglet bloqué ne
  se détecte pas. Les cartes `f′` sont refusées (non prévu en phase 0, à rediscuter si besoin).
- **Worktree / branche** : `../ubumaths-wt-atelier-python` · `feat/atelier-python`.

## Origine

Conseil du 2026-10-24 : pas d'onglet Python dans l'atelier, mais un pont à sens unique
(décision consignée dans [atelier.md](../systeme/atelier.md#décisions)).
