# Chantier `fiches-affines-2nde` — fiches « Fonctions affines », Seconde

## Reprendre ici

_Mis à jour le 2026-11-12, après #2609 — chantier clos et archivé._

- **État** : clos. Fiches en prod (brouillons) : technique `18a394e6` (7 sections, 16 ex.), applications `e9bfec01` (4 sections, 9 ex.), 5 images ; script `scripts/create-fonctions-affines-2nde.ts` et sources `data/fiches/fonctions-affines-2nde/` mergés (#2609) ; doc versée dans `docs/pratiques/fiches-exercices.md` § 1.
- **Prochaine action** : aucune. Reliquats : commentaires d'usage de `assert_all.py` et `gen-svg.mjs` qui citent encore `docs/wip/…` (chemin d'avant le déplacement, à corriger dans une PR de passage) ; outils-manquants n° 35.
- **En attente de David** : relire et publier les deux brouillons (ligne #2609 de `docs/wip/verifications-manuelles.md`).
- **Pièges en cours** : aucun (prettier et ubumark : règle versée dans `fiches-exercices.md`).
- **Worktree / branche** : retirés (`feat/fiches-affines-2nde` supprimée).

## Décisions (2026-11-12)

- Grade `2`, thème « Fonctions affines » (nouveau topic).
- Côté fonctions seulement : équations de droite, parallélisme, vecteur directeur → future fiche « Droites du plan ».
- Tableaux de signes : mx + p seulement (produits et quotients → future fiche « Tableaux de signes »).
- Plan : technique 7 sections, 15 neufs + `b5390946` ; applications 4 sections, 9 exercices, 3 illustrations.

## Journal

- 2026-11-12 : étape 1 (base prod, lecture seule) — aucune fiche affine en Seconde ; `b5390946` « Antécédents par une fonction affine » (thème `Fonctions`, dans « Fonctions : généralités ») à inclure sans modification.
- 2026-11-12 : script `scripts/create-fonctions-affines-2nde.ts` écrit (deux fiches, `--racine`, existant `b5390946` en fin de S2, images `affine-*.png`) ; simulation verte sur un faux dossier, `check:incremental` 0 erreur. Même description pour les deux fiches.
- 2026-11-12 : rédaction rendue (2 agents Opus), relue page par page ; corrigés : T07 (trois droites concourantes → D₃ : x/2 + 2), T13 (2/(−4)), A02 (espaces insécables avant °C/°F). Pre-commit : prettier a réécrit les listes des sources commitées sous `docs/wip/` ; originaux repris de l'index, sources déplacées sous `data/fiches/fonctions-affines-2nde/`.
- 2026-11-12 : `--publier` (accord de David) : 5 images, 24 exercices, fiches `18a394e6` et `e9bfec01` ; `regen-depuis-base` + `compile-prod` : 12 PDF OK, 0 débord ; images servies par le bucket (relu en anglais).
- 2026-11-12 : #2609 mergée (CI verte, `code-reviewer` Sonnet : aucun finding bloquant ; mineurs non corrigés : charset des clés du plan, résultat des suppressions du retour arrière non lu). Worktree et branche retirés ; journal et CONVENTIONS archivés.
