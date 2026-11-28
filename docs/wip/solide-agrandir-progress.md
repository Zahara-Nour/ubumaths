---
title: Chantier solide-agrandir — bouton « Agrandir » du bloc solide
date: 2026-11-28
status: en cours
---

# Chantier `solide-agrandir` — bouton « Agrandir » du bloc solide

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture de la PR._

- **État** : une seule PR (bouton, fenêtre, tests, doc), ouverte ; rien d'autre de prévu.
- **Prochaine action** : PR mergée → clore le chantier (journal archivé, lien de `docs/systeme/ubumark.md`
  vers l'archive).
- **En attente de David** : l'essai sur son téléphone (doigt réel) ; dire si le gain d'une figure à tourner
  (environ un tiers sur téléphone, à cause du cadre fixe de la rotation) lui suffit.
- **Pièges en cours** : la grande et la petite figure partagent la même rotation (`figures` dans
  `createEspaceRotation`) ; pas de bouton dans un élément que l'on touche (`CLICKABLE_PARENT`).
- **Worktree / branche** : `../ubumaths-wt-solide-agrandir`, `feat/solide-agrandir`.

## 1. D'où l'on part

Suite du chantier [solides-3d](../archive/wip/solides-3d-progress.md) (clos le 2026-11-28). David, le
2026-11-28 : « est-ce qu'il serait intéressant de pouvoir zoomer dans les blocs solides ? ». Réponse : un zoom
libre (pincer) coûte cher (le doigt tourne déjà la figure, il faudrait aussi déplacer la figure grossie) ; un
bouton « Agrandir » rend presque le même service. David : « ok ajoute le bouton agrandir ».

## 2. Phase 0 — comportements (validés par David le 2026-11-28 : « je te suis »)

Exemple suivi : le cube avec la droite (IG), le plan (BDE) et le point K, sur téléphone.

### Nominal

1. Un petit bouton « Agrandir » apparaît sous la figure, à côté de « Vue de départ ».
2. Un appui ouvre la figure en grand par-dessus la page : toute la largeur de l'écran sur téléphone, une
   grande fenêtre sur ordinateur.
3. La grande figure s'ouvre sous le même angle que la petite. Si elle est à tourner, elle tourne au doigt, à
   la souris et au clavier, avec son bouton « Vue de départ ».
4. On ferme par la croix, par Échap ou par un appui à côté. La petite figure reprend l'angle qu'on a laissé
   dans la grande.
5. Agrandir ne compte pas dans la réponse, comme tourner.

### Limites

6. Les noms, les traits et les cotes grossissent avec la figure, sans être replacés.
7. Fiche PDF et chat des élèves : rien ne change, pas de bouton.
8. Lecteur d'écran : le bouton se lit « Agrandir la figure », la fenêtre a la même description que la figure.
9. Une nouvelle question referme la fenêtre si elle était ouverte.

### Erreurs

10. Aucune nouvelle erreur d'auteur : pas de réglage à écrire.

### Questions (réponse du 2026-11-28 : « je te suis » — la recommandation à chacune)

- **(a) Quelles figures ?** Tous les blocs `solide` sans geste, qu'ils tournent ou non ; pas les `cubes`.
- **(b) Toujours là, ou au choix de l'auteur ?** Toujours là, sans réglage.
- **(c) Figures à geste** (`tracer: vecteur`) : pas de bouton dans ce lot.

## 3. Ce qui est fait (2026-11-28)

- `Solide.svelte` : le `<svg>` est un snippet dessiné deux fois (page, fenêtre `Dialog`), depuis la même
  rotation ; `enlargedSource` (le bloc agrandi : un autre bloc referme) ; bouton sous la figure.
- `solide-rotation.svelte.ts` : `attach` tient la liste des `<svg>` (`figures`) ; avant, la fenêtre refermée
  laissait la figure de la page sans capture du pointeur ni retour du clavier.
- Tests : `SolideAgrandir.svelte.test.ts` (12, rouges avant le code : 9 sur 12, les 3 autres disent « pas de
  bouton ») ; `SolideTourner.svelte.test.ts` : la figure fixe a maintenant un bouton, « Agrandir ».
- Doc : `docs/systeme/ubumark.md` (paragraphe « Bouton Agrandir »), catalogue (`block-catalog/solide.ts`).
- **Écarts avec la phase 0, à dire à David** :
  - **pas de bouton quand la figure est dans un choix à cocher** (ou une carte que l'on touche) : le choix
    est lui-même un bouton, « Agrandir » y cocherait le choix ;
  - Échap sur une grande figure **tournée** ramène d'abord la vue de départ (règle du chantier `solides-3d`),
    un second Échap ferme ;
  - **gain mesuré sur téléphone (390 px)** : une figure fixe presque × 2 ; une figure à tourner environ × 1,3
    seulement, parce que son cadre réserve la place de la rotation.
- Vu à l'écran par la session : captures Chromium du composant (téléphone 390 px, figure à tourner et figure
  fixe, page et fenêtre ; ordinateur 1280 px) ; page d'aide du bloc solide en Safari grand écran (`pnpm voir`,
  bouton sous le cylindre, le cône et la boule, 0 erreur de console). **Pas vu** : la fenêtre ouverte en
  Safari, le thème sombre, le doigt sur un vrai téléphone.
