# Titre d'exercice en anglais — journal

## Reprendre ici

_Mis à jour le 2026-11-25 : chantier clos, livré en v0.108.0, journal archivé._

- **État** : clos. #3129 mergée, migration jouée, livrée en prod (v0.108.0, avec #3124 et #3104) · **Suivi possible** : export / import d'un exercice sans titre anglais ; écrans du prof en français

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
- `types:cliquet` tenu ; tests ciblés verts (2 108 serveur, 17 client).
- Revue de code : aucun bloquant, aucun important. Audit de sécurité : aucun bloquant ; personne ne
  gagne ni ne perd d'accès (policies de `exercises` relues en prod). Corrigé : une forme inattendue
  en base n'affiche plus « [object Object] » dans l'éditeur.
- À l'écran (Playwright, compte prof local, données fictives « ZZ ») : la case « Titre en anglais »
  s'affiche, se charge, s'enregistre, survit au rechargement et s'efface ; l'aperçu PDF de la fiche
  anglaise imprime « ZZ Using formulas » sous « Compute 3 × 4. ». L'écran de l'élève n'a pas été
  vu (pas d'affectation locale) : couvert par le test de la route élève, même champ `title`.

## Laissé de côté (non bloquant, relevé par la revue)

- L'export / import d'un exercice (`exercise-import-export.ts`) ne porte pas le titre anglais : un
  exercice exporté puis réimporté le perd.
- Écrans du prof (liste des exercices de la fiche, gestion des corrections) : titre français.
- Aucun CHECK en base sur la forme de `translations` (comme les autres colonnes `translations`) ;
  la lecture (`asRowTranslations`) neutralise une forme farfelue.

## Après le merge

- #3129 mergée le 2026-11-25 (un dépassement de délai sans rapport, `forfait-palotin.test.ts`,
  relancé une fois). `db:migrate` : seule migration en attente, jouée ; colonne lue en prod.
