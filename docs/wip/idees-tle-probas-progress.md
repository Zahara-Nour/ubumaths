# Chantier `idees-tle-probas` : probabilités de Terminale spécialité, idées reprises d'ailleurs

## Reprendre ici

_Mis à jour le 2026-11-24, gros lot écrit (pas encore en prod)._

- **État** : lot écrit et vérifié sur la branche (2 modèles neufs, 8 variations sur 5 publiés), rien en prod.
- **Prochaine action** : David lance `create-questions --publier` sur `scripts/questions/idees-tle-probas-neufs`
  (brouillons en prod) ; puis commiter les ids, migrations de rangement et de contenu (générées), PR.
- **En attente de David** : la création des 2 brouillons en prod (commande dans le message de fin de session).
- **Pièges en cours** : niveaux à relever en prod juste avant la migration de rangement ; `P_A(G)` rendu « P_A G »
  par le moteur (écrire `P_{A}\left(G\right)`), écart à signaler.
- **Worktree / branche** : `../ubumaths-wt-idees-tle-probas` · `feat/idees-tle-probas`.

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Relevé :
[idees-tle-probas-releve.md](idees-tle-probas-releve.md) · fiches :
[idees-tle-probas-fiches.md](idees-tle-probas-fiches.md) · page à cocher :
https://claude.ai/artifact/6kVwijQ36onX4iXNpsL1Ga

## Historique

### 2026-11-24 : relevé et phase 0

- Rubrique choisie par David : probabilités (TSP1 à TSP4, 11 exercices).
- Relevé lu dans le code de la copie locale ; nos modèles relevés en prod (MCP en lecture seule) :
  19 modèles de Tle spé et 5 de 1re spé comparés, variations lues.
- Verdicts : 4 ✅, 5 🟡, 2 ❌. Constat de fond : nos modèles de loi binomiale n'utilisent jamais la
  calculatrice (table ou n ⩽ 5), les leurs toujours. C'est Q1.
- Fiches : 2 modèles neufs (F2 calculatrice, TSPE-510 ; F3 vocabulaire avec une table, TSPE-619) et
  8 variations (F1 ecf4d46b, F4 4ee9a359 ×2, F5 7974722d, F6 0943e867 ×2, F7 95f73515 ×2).
- Question d'accès : personne ne gagne d'accès. Outil manquant : l'éditeur Python exécuté, déjà n° 49.
- À faire avant d'écrire : bornes de `docs/systeme/programmes/bornes/lycee/` pour les plages, règles du
  tag en base, réservation des 5 modèles publiés dans le tableau de répartition.

### 2026-11-24 : phase 0 validée, gros lot écrit

- David : « je valide tes recos » → toutes les fiches oui, Q1 oui (calculatrice pour F2).
- 5 modèles publiés réservés dans le tableau (ecf4d46b, 4ee9a359, 7974722d, 0943e867, 95f73515), exportés de
  prod dans `scripts/questions/idees-tle-probas-publies/`.
- Scripts : `docs/wip/questions/idees-tle-probas-neufs.py` (F2 : 4 variations, TSPE-510 ; F3 : 5 variations,
  TSPE-619, nœud « Probabilités > Loi binomiale > expression de la loi » pour les deux) et
  `idees-tle-probas-publies.py` (F1, F4 a, F4 b, F5, F6 a, F6 b, F7 a, F7 b, ajoutées à la fin).
- Bornes (`bornes/lycee/tspe.json`) : TSPE-510 et 619 prévoient le calcul « calculatrice ou algorithme ».
- Choix en écrivant :
  - F2 : réponse arrondie au millième (`precision` décimale, 3) ; erreurs prévues écrites arrondies.
  - F3 : une situation et une loi fixes par variation, table arrondie à 10⁻⁴, réponses calculées sur la
    table arrondie (comme f0c8c1fc).
  - F4 a : l'attendu est écrit en décimal (`1-0{,}9^n`) ; `1-(9/10)^n` donne « mauvaise forme »
    (p est donné en décimal). Avec l'attendu en fraction, c'était l'écriture décimale qui était refusée.
  - Variables : jamais `i` (lu comme l'unité imaginaire : « Complex numbers not supported »).
- Défaut trouvé : dans un énoncé, `$P_A(G)=0{,}7$` est rendu « P_A G = 0,7 » (parenthèses perdues), alors
  que `P_A(B)` reste juste ; `P_{A}\left(G\right)` passe. F1 l'évite. Modèle de prod 31096bae relu : ses
  `P_L(G)` sont dans des choix, non touchés. À entrer au registre des écarts (avec une preuve) : signalé à
  David.
- Vérifié : `question:specs` vert sur les 7 fichiers (28 specs neuves + 33 ajoutées, 1 400 tirages) ;
  `create-questions` en simulation vert (2 à créer) ; copies créées en base locale, F2, F3 et F5 (arbre)
  vues dans l'aperçu (`pnpm voir`, iPhone) ; brouillons d'essai supprimés de la base locale.
