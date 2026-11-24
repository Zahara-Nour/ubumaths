# Chantier `idees-1re-probas-cond` : probabilités conditionnelles de Première

## Reprendre ici

_Mis à jour le 2026-11-24, lot écrit et vérifié (b2dbe6db0, non poussé)._

- **État** : lot écrit : 4 modèles neufs (F2, F5, F6, F7, 14 variations) dans `scripts/questions/idees-1re-probas-cond-neufs/`, F1 et F3 ajoutés à la fin de 31096bae et 69a05f98 (`…-publies/`). Specs toutes vertes, `create-questions` en simulation vert, 3 128 formules passées à `validateLatex`, 0 problème. Page à cocher : https://claude.ai/artifact/GsJy6qx8vPfv2rJVbjNhhM.
- **Prochaine action** : base locale (`set -a; . ./.env.local; set +a` puis `create-questions --dir …-neufs --publier`, puis `git restore` des ids), jouer chaque modèle dans l'aperçu admin (serveur sur 5176+, `http://[::1]:<port>`), puis PR des fichiers (« revue : aucune, contenu », `Doc-inchangée: contenu`), un seul push.
- **En attente de David** : rien avant le `create-questions --publier` en prod.
- **Pièges en cours** : F2 est un modèle de 2de (`grades = ["2"]`, 2-390). `migration-contenu.ts` (pour les publiés) n'a pas de simulation : il écrit la migration et sa fixture, il se lance à l'étape 4, après les brouillons en prod. Dans l'aperçu de `question:specs`, les propositions d'un `choix` sont mélangées : l'index attendu suit l'ordre du fichier.
- **Worktree / branche** : `../ubumaths-wt-idees-1re-probas-cond` · `feat/idees-1re-probas-cond`.

## Historique

### 2026-11-24 : prise, relevé, phase 0

- Rubrique 1P1 (8 exercices) réservée sur `main` (70084dd54).
- Relevé : 1P10-1 à 1P14-2 lus dans le code (6 d'entre eux par un agent Sonnet, ses dires vérifiés
  par sondage dans le code : tirages de 1P12-1, 1P13-1 et 1P11-2, menus de 1P13-1). Comparaison avec
  21 modèles publiés de prod. Aucun brouillon sur ces points ; 1SPE-421 n'a aucun modèle.
- Fiches : F1 (variation de 31096bae), F2 (modèle neuf de 2de), F3 (variation de 69a05f98),
  F4 (rien), F5, F6 et F7 (modèles neufs de 1re).
- Aucun outil ne manque : les branches `?` de ` ```probtree `, les cellules `?` des tableaux et les QCM
  justifiés suffisent.

### 2026-11-24 : phase 0 validée

- David : « je valide tes propositions » (page à cocher sans verdicts : lu comme un oui à toutes les
  recommandations). Donc F1, F2, F3, F5, F6, F7 à écrire, F4 rien ; F5 sur **1SPE-340** (pas 421).
- 31096bae et 69a05f98 réservés dans le tableau de répartition (commit direct sur `main`).

### 2026-11-24 : lot écrit

- Écrit par un agent `pedagogy-expert`, relu par moi : `question:specs` relancé sur les 6 fichiers
  (100 tirages par variation, tout vert) ; tirages réels de F6 (QCM : index juste, propositions
  mélangées à l'affichage ; V3 entier) et de F7 (coiffure : valeurs recalculées, arbre du corrigé)
  relus.
- Écarts à la fiche, acceptés : F1 n'a que 2 erreurs prévues pour P(A ∩ B) et P_B(Ā) (tout se lit
  dans l'énoncé) ; F7 V1 sans P(A) = 50 % (l'erreur P(Ā) tomberait juste) ; F6 V2 garde les deux
  leurres de V1 ; les modèles neufs sans `cleanCoefficients` (il réécrit `P_{A}(B)`).
