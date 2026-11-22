# Chantier `idees-1re-suites` — journal

Idées reprises d'ailleurs, rubrique « Suites numériques » de Première spécialité (codes 1AL1,
19 exercices), selon le skill `idees-rubrique`. Relevé : [idees-1re-suites-releve.md](idees-1re-suites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, rubrique prise._

- **État** : relevé fait, phase 0 publiée (page à cocher
  https://claude.ai/artifact/6ijd2FYjXxh9xx6dszdKnx, Q1-Q3 et fiches 1-16) · **Prochaine action** :
  lire les verdicts (`ArtifactData list verdicts`), puis écrire le lot · **En attente de David** :
  verdicts de la phase 0 · **Pièges en cours** : `hint` et
  `expectedErrors` lus par la prod seulement après le `deploy:prod` qui livre #2962 et #2991 (pas
  de brouillons en prod avant) · **Worktree / branche** : `ubumaths-wt-idees-1re-suites`,
  `feat/idees-1re-suites`.

## Historique

### 2026-11-22 — rubrique prise

- Pause des rubriques levée par David le même jour ; rubriques de Première ajoutées au tableau de
  répartition (leurs 10 rubriques de spécialité telles quelles, 8 d'automatismes).
- Existant en prod relevé (MCP lecture seule) : environ 90 modèles tagués sur les points de suites
  de 1re spé (1SPE-211 à 1SPE-380), dont une trentaine de brouillons « Cours : … ». Détail dans le
  relevé.

### 2026-11-22 — relevé et phase 0

- Relevé des 19 exercices : 3 ✅, 12 🟡, 2 ❌ (placer des termes en 1re spé, somme écrite en
  extension), 1 ✅ seulement en Terminale (arithmético-géométrique), 1 doublon (1AL11-8QCM). Détail : [idees-1re-suites-releve.md](idees-1re-suites-releve.md).
- Phase 0 : https://claude.ai/artifact/6ijd2FYjXxh9xx6dszdKnx. Trois questions d'ensemble
  (Q1 arithmético-géométrique en 1re : non recommandé ; Q2 monotone « à partir d'un rang » : oui ;
  Q3 questions enchaînées sur un même contexte : idée d'outil, plus tard). Seize fiches :
  4 nouveaux modèles (3, 11, 12, 13), 10 fiches de variations sur 14 modèles publiés (1, 2, 4 à 10, 14),
  1 « plus tard » (15), 1 « non » (16).
- Modèles publiés à réserver au tableau dès les verdicts : 45da9678, 7703e625, cea65372, 84114cb2,
  d2943133, 727fb88a, cf51cb93, 85afd455, 65e96f31, e67b1cbd, 44b32cad, b72fae4a, 5042401b,
  19961e67 (seulement ceux que David retient).

### 2026-11-22 — verdicts de la phase 0

- David : « je valide toutes tes recommandations dans la page à cocher » (message du 2026-11-22 ;
  la base de la page est restée vide). Donc : Q1 non (pas d'arithmético-géométrique avec suite
  auxiliaire en 1re), Q2 oui (monotone à partir d'un rang), Q3 plus tard (questions enchaînées :
  rien dans `outils-manquants.md`) ; fiches 1 à 14 oui, 15 plus tard, 16 non.
- Les 14 modèles publiés sont réservés au tableau ; export de prod dans
  `scripts/questions/1re-suites-publies/` (commit 2a85b7b809).
- Lot : `scripts/questions/1re-suites-a/` (4 nouveaux modèles : fiches 3, 11, 12, 13, script
  `docs/wip/questions/lot-1re-suites-a.py`) et variations ajoutées à la fin des 14 fichiers publiés
  (fiches 1, 2, 4 à 10, 14).
