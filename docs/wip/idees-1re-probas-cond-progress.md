# Chantier `idees-1re-probas-cond` : probabilités conditionnelles de Première

## Reprendre ici

_Mis à jour le 2026-11-24, phase 0 validée par David._

- **État** : relevé et fiches écrits (`idees-1re-probas-cond-releve.md`, `-fiches.md`) ; page à cocher publiée : https://claude.ai/artifact/GsJy6qx8vPfv2rJVbjNhhM (collection `verdicts`).
- **Prochaine action** : un agent écrit le lot (scripts `docs/wip/questions/idees-1re-probas-cond-{neufs,publies}.py`, dossiers `scripts/questions/idees-1re-probas-cond-{neufs,publies}/`, non commités). Après un `/clear`, son rapport est perdu : relire ces fichiers dans le code, relancer `create-questions` (simulation) et `question:specs`, puis base locale, aperçu, PR des fichiers.
- **En attente de David** : rien avant le `create-questions --publier` en prod.
- **Pièges en cours** : F2 est un modèle de 2de (`grades = ["2"]`, point 2-390), pas 1_SPE. La session `idees-tle-probas` touche ecf4d46b (Terminale), pas nos modèles.
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
