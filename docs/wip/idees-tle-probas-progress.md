# Chantier `idees-tle-probas` : probabilités de Terminale spécialité, idées reprises d'ailleurs

## Reprendre ici

_Mis à jour le 2026-11-24, après #3106 et le `db:migrate`._

- **État** : en prod : 2 brouillons rangés et tagués (a3aa8f4a TSPE-510, 1220760b TSPE-619) et 8 variations
  ajoutées aux 5 publiés. Série de relecture écrite (`scripts/series/T_SPE-relecture-probabilites-publies.json`),
  simulée verte, pas encore enregistrée.
- **Prochaine action** : après la relecture de David, lire les verdicts « À revoir » en base
  (`question_template_reviews`, `reviewed_at` postérieur au 2026-11-24), corriger, puis `publier-lot.ts` en
  simulation pour les 2 brouillons ; commiter l'id de la série et ce journal dans la PR de fin.
- **En attente de David** : `creer-serie.ts --publier` (série des 5 publiés) ; relecture dans `/dev/modeles`
  (brouillons : `?titre=Loi binomiale`).
- **Pièges en cours** : niveau de F3 (6) égal à celui de 4ee9a359 sur le même nœud, sans effet bloquant.
- **Worktree / branche** : `../ubumaths-wt-idees-tle-probas` · `feat/idees-tle-probas-relecture`.

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

### 2026-11-24 : brouillons en prod, migrations

- David a lancé `create-questions --publier` : a3aa8f4a (F2, niveau 2), 1220760b (F3, niveau 6), brouillons, ids
  commités.
- `migration-rangement.ts` : `20261124193431_questions_idees_tle_probas_rangement_tags.sql` (nœud
  « Probabilités > Loi binomiale > expression de la loi », TSPE-510 et TSPE-619, déjà portés par a95a9c0d et
  f0c8c1fc sur ce nœud).
- `migration-contenu.ts` : `20261124193442_questions_idees_tle_probas_publies_contenu.sql` (+8 variations sur 5
  modèles, aucune corrigée).
- `test:integration` des deux tests de migration : 207 verts (toutes les fixtures du dossier, les deux neuves
  comprises).
- Défaut de rendu `P_A(G)` → « P_A G » : corrigé à part, PR #3103 (`fix/rendu-indice-parentheses`, cause :
  `cleanCoefficients`).
- `security-auditor` sur les deux migrations : aucun bloquant (seules `question_templates` et
  `question_template_points` écrites, gardes exactes, rollback en commentaire, quoting sûr). Non bloquant :
  le prénom « Noé » d'ecf4d46b v2, déjà en prod, personnage d'énoncé.
- Correctif #3103 mergé, worktree retiré, journal versé dans `docs/archive/wip/rendu-indice-parentheses/`.

### 2026-11-24 : merge et migrations en prod

- #3106 mergée (CI verte). `migration list --linked` : seules les 2 migrations du lot en attente ;
  `db:migrate` passé (4 conditions réunies). Relu au MCP : brouillons rangés et tagués, 0943e867 6 var.,
  4ee9a359 5, 7974722d 2, 95f73515 3, ecf4d46b 3.
- Série de relecture des 5 publiés écrite et simulée (5 questions, 5 min).
