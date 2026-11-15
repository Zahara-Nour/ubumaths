---
title: Atelier — plein écran et « Mes objets » rétractable
date: 2026-11-15
status: clos (#2675, validé par David le 2026-11-15)
---

# Atelier — plein écran et « Mes objets » rétractable

## Reprendre ici

_Mis à jour le 2026-11-15, chantier clos._

- **État** : livré (#2675), validé par David sur le serveur de la branche le 2026-11-15 (« c'est parfait ») ; pas encore en prod · **Prochaine action** : aucune · **Doc durable** : `docs/systeme/atelier.md` · Worktree et branche supprimés.

## Demande (David, 2026-11-15)

1. Bouton « tout effacer » introuvable → c'est « Repartir de zéro » (masqué sur un lien reçu) : **rien à changer** (David).
2. Bouton plein écran à côté des réglages : tout l'atelier sans la barre du haut ni la barre latérale de Chiphre.
3. « Mes objets » rétractable.

## Phase 0 validée (2026-11-15, « ok pour le reste »)

- Plein écran : l'atelier recouvre la fenêtre (même mécanisme que « Agrandir le graphe ») ; le bouton devient « Quitter le plein écran » ; Échap en sort sauf si console, graphe agrandi ou fenêtre ouverts (ils passent d'abord) ; pas le plein écran du navigateur ; non retenu.
- Repli sur bureau : chevron dans l'en-tête, bande verticale avec bouton et compte, la vue prend la largeur ; vide = toujours déplié ; une carte qui prend la main le rouvre ; non retenu.

## Fait

- `AtelierContainer.svelte` : état `fullScreen`, bouton `Expand`/`Shrink`, classe `plein-ecran`, Échap.
- `ObjectPanel.svelte` : état `foldedWide`, bouton `replier-large`, classe `replie-large`.
- Tests : `plein-ecran-et-repli.svelte.test.ts` (5), `barre-icones` mis à jour.
- Doc : `docs/systeme/atelier.md`.
