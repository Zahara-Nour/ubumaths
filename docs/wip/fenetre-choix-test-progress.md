# Chantier `fenetre-choix-test` — bouton « Commencer le test » hors d'écran

## Reprendre ici

_Mis à jour le 2026-11-04, à l'ouverture de la PR._

- **État** : correctif sur `fix/fenetre-choix-test` (PR à merger après CI verte).
- **Prochaine action** : merger, puis attendre le prochain `deploy:prod` de David.
- **En attente de David** : `deploy:prod` ; vérification manuelle (`docs/wip/verifications-manuelles.md`).
- **Worktree / branche** : `../ubumaths-wt-fenetre-choix-test` · `fix/fenetre-choix-test`.

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
- Vérifié dans Chrome en local (723 px) : fenêtre de 651 px qui défile, « Commencer le test »
  atteint, ouvre `/automaths/test?mode=interactive…`.
