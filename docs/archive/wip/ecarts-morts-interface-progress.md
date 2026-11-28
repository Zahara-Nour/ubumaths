---
title: Chantier ecarts-morts-interface
date: 2026-11-28
status: clos (#3260, #3268 ; M48 passé au lot interface-prof)
---

# Chantier `ecarts-morts-interface`

## Reprendre ici

_Mis à jour le 2026-11-28, chantier clos._

- **État** : clos. M32, M33, M34, M47, M49, M52 (#3260) et M58 (#3268) faits · **M48** passé au lot `interface-prof` (décision de David, 2026-11-28) : `isTrivialHtmlWrapper` sera branchée par le correctif de V118, pas retirée · **Worktree / branche** : aucun

## Lot

M32, M33, M34, M47, M48, M49, M52, M58 (code mort, lot sans décision, `docs/wip/ecarts-lots.md`).

## Journal

### 2026-11-28

- Les 8 preuves rejouées : toutes rouges (écarts vrais).
- **M32** : la page Documents relisait le rôle ; le layout `dashboard/teacher` refuse déjà tout autre rôle
  que professeur (403), la garde « admin » n'était jamais atteinte. Lecture du profil retirée, la
  redirection vers la connexion gardée.
- **M33** : l'effet du layout racine ne faisait que lire trois réglages. Retiré ; les trois modules
  restent importés pour leur effet (à leur création ils appliquent thème, taille du texte, lecture
  facilitée). Vérifié dans Chromium : réglages enregistrés → `lecture-facilitee dark`, `--font-scale`
  1.25, au chargement et après navigation.
- **M34** : prop `riddlesSolved` de `RewardsBlock` retirée (et son passage depuis `StudentDashboard`).
  `data.riddlesSolved` reste lu ailleurs dans `StudentDashboard`.
- **M47** : mesures de performance du détecteur de gel jamais remplies (`reportWebVital`,
  `updateWebVitals` sans appelant) : champ, état, persistance et fonctions retirés. Le schéma serveur
  et la page admin gardent `webVitals` facultatif pour les anciens rapports.
- **M49** : `isAlreadyEscaped`, `escapeHtmlSafe` et leurs tests retirés.
- **M52** : prop `listNumberingOverride` retirée ; doc `utilitaires-et-demos.md` mise à jour.
- **M48** laissé : la fonction est celle qui servirait à corriger V118 (lot `interface-prof`, phase 0).
- **M58** laissé : `FontSelector.svelte` est supprimé par la branche `ecarts-morts-utilitaires` ; reste
  `exerciseFont.svelte.ts` et la règle CSS, après son merge.
- CI rouge (shard 1/4) : `side-effect-modules.test.ts`. Le build déclare les modules de `src/lib`
  sans effet sauf ceux de `scripts/side-effect-modules.ts` : un import nu des trois réglages
  aurait pu être élagué en prod (invisible en dev). Les trois y sont ajoutés.
- Vérifs : `check:incremental` 0 erreur, `types:cliquet` tenu, tests ciblés verts, `pnpm voir`
  `/dashboard` (élève) et `/dashboard/teacher/documents` (prof) : 0 erreur de console.
- **M58** : `stores/exerciseFont.svelte.ts` retiré (plus aucun importeur depuis la suppression de
  `FontSelector`, #3259). La règle CSS gardée : le registre la disait inerte, mais `--exercise-font-family`
  vaut Inter dans `app.css` et `.exercise-content p, li, td, th, h1…h6` l'emporte sur le Lora que
  `ExerciseDisplay.svelte` met sur le bloc ; la retirer passerait le texte des exercices en Lora.
  Commentaires corrigés, libellé de M58 rectifié dans le registre, `couvre:` de `exercices.md` mis à jour.
  Preuve verte, `check:incremental` 0 erreur.
