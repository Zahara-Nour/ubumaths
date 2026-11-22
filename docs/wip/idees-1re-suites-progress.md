# Chantier `idees-1re-suites` — journal

Idées reprises d'ailleurs, rubrique « Suites numériques » de Première spécialité (codes 1AL1,
19 exercices), selon le skill `idees-rubrique`. Relevé : [idees-1re-suites-releve.md](idees-1re-suites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, lot écrit (pas encore de PR)._

- **État** : lot écrit et poussé sur `feat/idees-1re-suites` : 4 nouveaux modèles
  (`scripts/questions/1re-suites-a/`, `create-questions` simulation 4 ✓, 88 specs) et 26
  variations ajoutées à 14 modèles publiés (`scripts/questions/1re-suites-publies/`, 303 specs
  vertes, `migration-contenu` 14/14 acceptés, migration non gardée). · **Prochaine action** :
  essai en base locale (`.env.local`, `create-questions --publier` en local, puis `git restore`
  des ids) et modèles joués dans l'aperçu admin ; puis PR des fichiers (revue : aucune, contenu).
  · **En attente de David** : rien. · **Pièges en cours** : `lot-1re-suites-publies.py` repart de
  l'export 2a85b7b809 (le relancer réécrit les ajouts, ne les double pas) ; la migration de contenu
  se régénère juste avant sa PR (prod relue à ce moment). · **Worktree / branche** :
  `ubumaths-wt-idees-1re-suites`, `feat/idees-1re-suites`.

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

### 2026-11-22 — lot écrit

- Deux agents (pedagogy-expert) ; fichiers relus : anciennes variations des 14 publiés identiques,
  seuls variations, specs et description changent ; chaque nouvelle variation a son `hint`.
- Modèle 02 : la fiche 11 (« raison négative ») donnait toujours la même réponse. David, le
  2026-11-22 : mêler les raisons. Devenu « Sens de variation d'une suite géométrique, quelle que
  soit sa raison » (8 variations : 3 négatives, 4 positives selon q et u₀, q = 1).
- Signalé par l'agent, **non vérifié** : le juge refuse `\frac{(n+2)4^n}{4^{n+1}(n+1)}` (produit
  collé derrière une puissance) alors que la valeur est juste ; les specs « non simplifié » de 03
  sont écrites avec ×. À vérifier dans l'Atelier avant de le classer comme bogue de mathAST.
- Limites assumées : deux erreurs prévues (pas trois) sur la 2e case des variations à deux cases
  de 45da9678 ; dans 7703e625, `14/12` reste « forme non optimale » (réglage du modèle, que
  `migration-contenu` ne change pas) ; 01 v3 (u² − c) n'a que 6 tirages différents.
