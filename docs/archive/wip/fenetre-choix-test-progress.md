# Chantier `fenetre-choix-test` — bouton « Commencer le test » hors d'écran

## Reprendre ici

_Mis à jour le 2026-11-04, après #2377 (`e9c638928`). **Chantier clos, journal archivé.**_

- **État** : #2377 mergée, pas encore en prod.
- **En attente de David** : `deploy:prod` ; vérification manuelle #2377 (`docs/wip/verifications-manuelles.md`).

---

## Constat (2026-11-04, prod 0.70.0)

David : « quand je clique sur Entraînement pour lancer la série, rien ne se passe ».
Reproduit dans Chrome sur chiph.re (fenêtre de 723 px de haut) : la fenêtre de choix du panier
(`TestModeDialog`) fait 1 128 px, sans hauteur maximale ni défilement ; le bouton « Commencer le
test » est sous le bord de l'écran, inatteignable. Cliquer une carte ne fait que la choisir.
Présent depuis la 4e carte (Flash-cards, `3b8b5887c`, 2026-09-30), sans lien avec #2376.

## Fait

- `TestModeDialog.svelte` : `max-h-[90vh] overflow-y-auto` (convention des autres fenêtres) ;
  cartes en `text-left` (texte et puces centrés de travers sur la capture de David).
- 2026-11-04 — David : « normalement j'avais demandé à changer ça pour que ça lance directement
  quand on a choisi » (demande introuvable dans les journaux et la mémoire). Fait : un clic sur une
  carte lance la série ; la Course aux nombres garde le temps imparti puis « Commencer le test »
  (seule forme qui demande un réglage). Tests d'abord (5 rouges), puis verts (7/7).
- Vérifié dans Chrome en local (723 px) : fenêtre de 651 px qui défile, « Commencer le test »
  atteint, ouvre `/automaths/test?mode=interactive…` ; après le second correctif, un seul clic sur
  « Entraînement » ouvre le test.
