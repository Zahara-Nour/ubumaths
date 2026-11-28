---
title: Lot d'outils second-tag — journal
date: 2026-11-28
status: outil 66 codé, PR à ouvrir
---

# Lot `second-tag` (outil 66)

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR._

- **État** : outil 66 (second tag d'un modèle dans `migration-rangement.ts`) codé, tests verts
  (unitaires + intégration). · **Prochaine action** : PR, revue, merge ; puis ligne 66 au § 4
  « Livré » d'`outils-manquants.md` et lot clos. · **En attente de David** : rien. · **Pièges en
  cours** : le tag 1TECHNO-095 du modèle d683e906 (« loi d'une variable aléatoire », chantier
  `idees-1re-variables-aleatoires`) n'est toujours pas posé en prod : c'est un modèle, hors du lot
  (règle 5 d'`outils-lots.md`), à poser par une session « questions » avec
  `{ "pointsAjoutes": ["1TECHNO-095"] }`. · **Worktree / branche** : `../ubumaths-wt-outil-second-tag`,
  `feat/outil-second-tag`.

## Phase 0 (validée par David le 2026-11-28 : « je te suis »)

Exemple réel : le modèle « loi d'une variable aléatoire » (1re spé + 1re techno) n'a que le tag
1SPE-355 ; il lui manque 1TECHNO-095.

1. **Modèle neuf** : `"point": ["1SPE-355", "1TECHNO-095"]` (une liste dans `point`, pas de champ
   neuf) ; un code seul reste valable.
2. **Modèle déjà rangé** : `{ "pointsAjoutes": ["1TECHNO-095"] }`, combinable avec
   `niveauxAjoutes` dans le même fichier (le niveau et le tag d'un programme ensemble). Mélange avec
   `noeud`/`point` refusé.
3. **Point déjà posé** (lot relancé) → ignoré.
4. **Refus de tout le lot** : deux points du même programme (tags déjà posés compris), point ni sur
   le nœud ni sur sa notion, point d'un niveau que le modèle n'a pas (niveaux en prod + ceux du même
   fichier). Ce dernier cas était une simple alerte : il devient un refus (choix de David).

## Fait

- `scripts/lib/migration-rangement.ts` : `points: string[]` partout, forme `ajouts`
  (niveaux + points), règles ci-dessus, SQL du rangement à table de tags `_qr_tags`, bloc « points
  ajoutés » (`_qt_ajouts`, garde « tags exactement ceux du relevé »), rollback qui ne retire que
  les tags posés, `lireFixture` pour les 37 fixtures d'avant (forme `point`).
- Tests : 83 unitaires (41 rouges sur l'ancien module), intégration 193 verts dont un cas
  synthétique « deux programmes sur un même nœud » et « tag ajouté à un modèle rangé ».
- Doc : `docs/pratiques/couvrir-un-niveau.md` § 6, skill `idees-rubrique`.
