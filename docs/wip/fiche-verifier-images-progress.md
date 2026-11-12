# Chantier `fiche-verifier-images` — `fiche:verifier` avec des images locales

## Reprendre ici

_Mis à jour le 2026-11-13, avant la PR._

- **État** : tests écrits (`scripts/__tests__/fiches-images-locales.test.ts`), correctif en cours.
- **Prochaine action** : `scripts/fiches/images-locales.ts` + appel dans `rendu-fiche.ts`, vérifier sur `data/fiches/fonctions-affines-2nde/applications`, PR.
- **En attente de David** : rien.
- **Pièges en cours** : le pre-commit (lint-staged) laisse l'index en désaccord avec le commit sur les `.md` reformatés : vérifier `git status` après chaque commit.
- **Worktree / branche** : `../ubumaths-wt-fiche-verifier-images`, `fix/fiche-verifier-images`.

## Origine

Ligne n° 35 de `docs/wip/outils-manquants.md` (chantier `fiches-affines-2nde`, #2609) : une fiche en rédaction qui cite ses images par leur URL du bucket échoue à la compilation de l'énoncé (`failed to load file (access denied)`).

## Comportements (validés par « fais le correctif », 2026-11-13)

- Nominal : image citée `![…](URL)` présente dans `<dossier>/images/<nom du fichier de l'URL>` → copiée dans `<dossier>/virtual/images/<empreinte>` ; l'énoncé compile et se relit.
- Limite : même image citée plusieurs fois → une copie ; aucune image → rien n'est créé.
- Erreur : image citée absente en local → alerte nommant le fichier, `rendu-fiche` sort en échec.

## Journal

- 2026-11-13 : worktree créé ; tests rouges écrits.
