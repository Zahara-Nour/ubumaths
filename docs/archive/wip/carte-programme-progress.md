# Carte du programme — journal

## Reprendre ici

_Mis à jour le 2026-10-23, après #1644._

- **État** : chantier CLOS. Vue « Carte » mergée (#1641), essayée par David sur le serveur de la branche (« ça marche nickel ») ; type du point nommé sur chaque feuille (#1644, demandé par David). Pas encore en prod : partira au prochain `deploy:prod`.
- **Prochaine action** : aucune. Doc durable : `docs/systeme/cours-et-chapitres.md` (§ Programme, couverture, progression).
- **En attente de David** : rien. Doublon noté en revue : la page élève d'une notion a sa propre table de libellés des types (majuscules).
- **Pièges en cours** : aucun.
- **Worktree / branche** : supprimés.

## Demande

David (2026-10-23) : visualiser l'arbre des notions de chaque programme, avec branches, notions, sous-notions et points (ceux du programme et les approfondissements), en vrai arbre, façon carte mentale, comme le diagramme de l'arbre (`docs/wip/arbre-notions/arbre-notions.html`).

Maquette validée (« le rendu me va ») : https://claude.ai/artifact/RSZtjvdQKJ7bz9fNBYe5if (2de, données de prod du 2026-10-23).

## Comportements validés (phase 0)

- Bascule **Liste / Carte** sur `/dashboard/teacher/programme`, vue gardée dans l'adresse (`?vue=carte`), le niveau suit.
- L'arbre **complet** : branches → notions → sous-notions dans l'ordre de l'arbre, points du niveau en feuilles dans l'ordre du BO. Un point posé sur une notion est une feuille de la notion (derrière « N points sur la notion »).
- Approfondissements distingués (pointillé, mention « approfondissement »).
- Compteurs « N att. · M approf. » sur chaque nœud.
- Nœuds sans point du niveau **grisés** ; case « Masquer les nœuds vides ».
- Au départ, ouvert jusqu'aux sous-notions, points repliés ; « Tout déplier » / « Tout replier » (ne garde que les branches).
- Points archivés masqués ; nœud archivé montré seulement s'il porte encore un point (mention « archivé »).
- Erreur explicite si un nœud visé est introuvable, jamais d'arbre amputé en silence.
- Type du point affiché dans la feuille (« 2-231 · savoir-faire · approfondissement ») : tranché par David après #1641, livré en #1644.

## Fichiers

- `src/lib/utils/programme-map.ts` : construction de la carte, compteurs, filtre des vides, courbes.
- `src/lib/server/programme-tree.ts` : `getProgrammeMap` (arbre lu par pages de 1 000, nœuds archivés porteurs lus à part).
- `src/lib/components/programme/ProgrammeMap.svelte` : la carte.
- Page : `src/routes/(protected)/dashboard/teacher/programme/`.
