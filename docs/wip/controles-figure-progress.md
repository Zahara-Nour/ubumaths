---
status: relevé
---

# Chantier `controles-figure` — nouveaux contrôles de la figure à compléter (symétrique d'abord)

## Reprendre ici

_Mis à jour le 2026-11-02, ouverture du chantier._

- **État** : rien de codé. Chantier ouvert sur la ligne n° 1 de
  [outils-manquants.md](outils-manquants.md) (David, 2026-11-02 : « je te suis »).
- **Prochaine action** : relevé de l'existant (§ 2 à remplir), puis phase 0 (§ 3) à faire valider
  AVANT tout code ; worktree `git worktree add -b feat/controles-figure ../ubumaths-wt-controles-figure origin/main`
  seulement après la validation.
- **En attente de David** : rien.
- **Pièges en cours** : un contrôle ne doit jamais donner la réponse (masquage `verifier: ?` en évaluation,
  chantier `fuite-enonce`) ; géométrie = `geometry-expert` / `pedagogy-expert` ; revue Opus (correction des
  réponses).
- **Worktree / branche** : aucun.

---

## 1. Origine et périmètre

La case « figure » (` ```figure-a-completer `, `verifier:`) ne sait vérifier que `droite_par`, `carre`,
`rectangle` (`CONSTRUCTION_CHECK_KINDS`, `src/lib/ubumark/types/construction.ts`) avec deux outils élève,
`droite` et `segment`. Il manque, d'après [outils-manquants.md](outils-manquants.md) § 1 n° 1 et § 2 :

- **symétrique** (transformations, priorité) : axial — CE2-073, CM1-107, CM1-108, CM2-097 (axe vertical,
  horizontal ou diagonale du quadrillage), 6-180 (papier uni aussi) ; central — tracé en 5e ; image par
  translation en 3e (tracé) ;
- angle, triangle, cercle circonscrit, bissectrice, médiatrice, 4e sommet, point isolé :
  6-170, 172, 173, 207, 166 ; 5-131, 132, 068, 133 ; 4-038 ; CM1-167, 168.

Hors chantier : rotation, homothétie (absentes du BO au collège) ; rapporteur (outil n° 4).

## 2. Existant (à relever)

À lire : `docs/archive/wip/figure-et-choix-progress.md`, `docs/archive/wip/constructions-progress.md`,
`src/lib/ubumark/types/construction.ts`, `src/lib/questions/construction/judge.ts`, le parseur
`construction-parser.ts`, la doc `docs/systeme/` de la case « figure ».

## 3. Phase 0 (à proposer)

Écriture par le prof en exemples, comportements nominal / limite / erreur, questions à David.
