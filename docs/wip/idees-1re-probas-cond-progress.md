# Chantier `idees-1re-probas-cond` : probabilités conditionnelles de Première

## Reprendre ici

_Mis à jour le 2026-11-24, lot joué en local, PR des fichiers ouverte._

- **État** : lot écrit (F2, F5, F6, F7 neufs ; F1, F3 en fin de 31096bae et 69a05f98) et joué dans l'aperçu admin local : 19 variations, réponse juste → « Juste », fausse → « Faux », chaque `choix` de F6 a une seule proposition juste sur 4. PR des fichiers ouverte (`gh pr list --search head:feat/idees-1re-probas-cond`). Page à cocher : https://claude.ai/artifact/GsJy6qx8vPfv2rJVbjNhhM.
- **Prochaine action** : CI verte → `pnpm pr:merger <n>`. Puis étape 6 de `couvrir-un-niveau.md` : David lance `create-questions --dir scripts/questions/idees-1re-probas-cond-neufs --publier` en prod (brouillons), je commite les ids, puis rangement, relecture dans `/dev/modeles`, `migration-contenu.ts` pour F1 et F3.
- **En attente de David** : le `create-questions --publier` en prod, après le merge.
- **Pièges en cours** : F2 est un modèle de 2de (`grades = ["2"]`, 2-390). `migration-contenu.ts` (pour les publiés) n'a pas de simulation : il écrit la migration et sa fixture, il se lance à l'étape 4, après les brouillons en prod. `create-questions` ne touche jamais un modèle publié, même en local : F1 et F3 ont été copiés en base locale par un PATCH ponctuel. Dans l'aperçu, la variation affichée est numérotée à partir de 1.
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

### 2026-11-24 : lot joué en base locale

- 4 modèles neufs créés en brouillon dans la base locale (`create-questions --publier` avec `.env.local`), ids retirés des fichiers ensuite (`git restore`). F1 et F3 copiés dans 31096bae et 69a05f98 locaux (variations, `shared`, `test_specs`).
- Jeu automatique (Playwright, aperçu admin sur `http://[::1]:5178`) : une graine par variation, les 19 tirées. 17 variations à saisie : réponse attendue → « Juste », `0` → « Faux » (captures relues pour F7 v3 et F1, valeurs refaites à la main). 2 variations `choix` de F6 : chaque proposition essayée, une seule « Juste » sur 4.
- Seules erreurs de console : des 429 (limite de débit du serveur de dev, dus au rythme du script), aucune liée aux modèles.
