# Titre d'exercice en anglais — journal

## Reprendre ici

_Mis à jour le 2026-11-25, avant la PR._

- **État** : code + tests sur la branche, PR pas encore ouverte · **Prochaine action** : revue (code-reviewer + security-auditor), rendu à l'écran, PR, merge, puis `db:migrate` (migration additive, 4 conditions) · **En attente de David** : rien · **Pièges en cours** : chaque schéma Zod de réponse doit connaître `translations` (sinon retiré en silence, cf. #3124) · **Worktree / branche** : `ubumaths-wt-titre-exercice-anglais` · `feat/titre-exercice-anglais`

## Origine

Suite du chantier `sections-pdf-anglais` (#3124) : une fiche anglaise imprimait le titre de
chaque exercice en français (« Calculer avec les formules »). Le titre est une colonne
(`exercises.title`) ; les traductions d'un exercice ne portaient que énoncé, corrigé, réponses et
indices (dans `variations`). David, 2026-11-25 : « oui on le fait ».

## Phase 0 — validée (David, 2026-11-25 : « je te suis »)

Réponse donnée à la phase 0 entière et à ses deux questions, qui portaient chacune une
recommandation :

1. **Où ranger le titre anglais** : colonne `exercises.translations` (`{"en": {"title": …}}`), même
   forme que fiches, sections et consignes. Migration additive.
   **Question d'accès** : personne ne gagne d'accès (la colonne suit les droits de la ligne).
2. **Avertissement « exercices non traduits »** : ne signale PAS un titre manquant (il retombe sur
   le français, ce n'est pas un trou).

Comportements :

- Nominal : case « Titre en anglais » sous « Titre » dans l'éditeur d'exercice ; une fiche réglée en
  anglais affiche ce titre dans le PDF (énoncé, corrigé, réponses), sur l'écran de l'élève et dans
  l'aperçu d'affectation.
- Limites : pas de titre anglais, ou vide → titre français ; fiche française → toujours le
  français ; bibliothèque et recherches du prof restent en français.
- Erreur : titre anglais > 200 caractères → refusé (même borne que le français).

## Fait

- Migration `20261125055853_exercices_titre_anglais.sql` (colonne `translations jsonb`, rollback en
  commentaire) + `pnpm db:types`.
- `localizedExerciseTitle` (`worksheet-copy.ts`) : PDF de la page de la fiche, corrigé du prof,
  vue élève (écran + PDF), aperçu d'affectation. `translations` ajouté aux `select` des quatre
  routes et au schéma de réponse de `GET /api/worksheets/[id]`.
- Écriture : `exerciseRowTranslationsSchema` (strict, `en.title` ≤ 200) sur la création et la mise
  à jour ; schéma de réponse de l'exercice le garde (sinon l'éditeur le perdait).
- Éditeur : case « Titre en anglais » ; vide → `translations: null`.
- Sauvegarde admin des exercices : JSON, SQL et restauration gardent le titre anglais (une
  sauvegarde antérieure à la colonne ne l'efface pas à la restauration).

## Vérifications

- Tests rouges avant, verts après : `titre-exercice-anglais.test.ts` (11), routes élève / aperçu /
  corrigé, sauvegarde.
- Intégration `tests/integration/exercices-titre-anglais.test.ts` : 4/4 rouges sans la migration
  (« Could not find the 'translations' column »), 4/4 verts avec.
- `check:incremental` 0 erreur.
