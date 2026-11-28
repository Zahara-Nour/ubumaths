# Chantier `fiche-verifier-images` — `fiche:verifier` avec des images locales

## Reprendre ici

_Mis à jour le 2026-11-13, après #2612 — chantier clos et archivé._

- **État** : clos. `fiche:verifier` compile une fiche dont les images ne sont pas encore en ligne (`scripts/fiches/images-locales.ts`, 7 tests) ; doc dans `docs/pratiques/fiches-exercices.md` § 2.4 ; outils-manquants n° 35 livré.
- **Prochaine action** : aucune.
- **En attente de David** : rien.
- **Pièges en cours** : aucun. (Vu en route : GitHub n'a pas créé le run `pull_request` de deux commits de la PR ; `gh workflow run quality.yml --ref <branche>` l'a remplacé.)
- **Worktree / branche** : retirés.

## Origine

Ligne n° 35 de `docs/wip/outils-manquants.md` (chantier `fiches-affines-2nde`, #2609) : une fiche en rédaction qui cite ses images par leur URL du bucket échoue à la compilation de l'énoncé (`failed to load file (access denied)`).

## Comportements (validés par « fais le correctif », 2026-11-13)

- Nominal : image citée `![…](URL)` présente dans `<dossier>/images/<nom du fichier de l'URL>` → copiée dans `<dossier>/virtual/images/<empreinte>` ; l'énoncé compile et se relit.
- Limite : même image citée plusieurs fois → une copie ; aucune image → rien n'est créé.
- Erreur : image citée absente en local → alerte nommant le fichier, `rendu-fiche` sort en échec.

## Journal

- 2026-11-13 : worktree créé ; tests rouges écrits.
- 2026-11-13 : correctif vert ; doc `fiches-exercices.md` (images locales ; `data/` est dans `.gitignore` → `git add -f`) ; chemins des commentaires `docs/wip/…` corrigés dans `data/fiches/fonctions-affines-2nde/`.
- 2026-11-13 : revue `code-reviewer` (Sonnet) : WebP local copié sous un nom `.png` sans conversion → refusé et signalé (« à convertir en PNG ») ; nom encodé (`%20`) décodé. 7 tests verts.
- 2026-11-13 : #2612 mergée (conflit `outils-manquants.md` avec main résolu : version de main + n° 35 livré) ; worktree et branche retirés ; journal archivé.
