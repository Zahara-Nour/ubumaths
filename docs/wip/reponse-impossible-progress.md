# Chantier `reponse-impossible` — journal

Outil n° 51 de [outils-manquants.md](outils-manquants.md) : une case « expression, ou bien :
impossible ». L'élève tape une expression, ou clique un bouton (« pas factorisable », « pas de
solution »…) quand la réponse n'existe pas. Né du chantier
[`idees-1re-second-degre`](../archive/wip/idees-1re-second-degre/idees-1re-second-degre-progress.md)
(Q1 : factoriser un trinôme quand Δ < 0, point 1SPE-253).

## Reprendre ici

_Mis à jour le 2026-11-23, chantier ouvert._

- **État** : relevé du code fait, phase 0 écrite (ci-dessous) · **Prochaine action** : coder
  après les réponses · **En attente de David** : réponses aux questions Q1 à Q6 de la phase 0 ·
  **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-reponse-impossible`,
  `feat/reponse-impossible`.

## Historique

### 2026-11-23 — chantier lancé

- David : « lance le chantier du 51 », après la clôture de `idees-1re-second-degre`.

### 2026-11-23 — relevé du code

- Une case a déjà une réponse qui dépend du tirage : `{{if:delta<0|…|…}}` dans `expectedAnswer`
  (`instance-generator.ts`, résolu avant la normalisation).
- Rien d'existant pour « impossible » : ∅ n'existe que pour les cases d'intervalles (touche du
  clavier), `?rien` que dans les tableaux de signes ; aucun bouton posé à côté d'une case.
- Chemin de la réponse : `FillBlanksInput.svelte` (valeurs = chaînes LaTeX) →
  `validateAnswer` → `validateBlanks` → `validateSingleBlank` (`answer-validator.ts`, aussi la
  variante sans ordre) ; résultat attendu : `expected-result.ts`.
- Champs d'une case : types `TemplateBlank` / `BlankDefaults` / `InstanceBlank` (`types.ts`), Zod
  souple et strict (`template-schema.ts`), formulaire du prof (`QuestionTemplateForm.svelte`,
  éditeur des cases).

### 2026-11-23 — phase 0

Comportements :

- Nominal : « Factorise 2x² + 3x + 5. » La case a, à côté, un bouton « pas factorisable ». L'élève
  clique : la case se grise et affiche « pas factorisable ». Juste, puisque Δ < 0. Sur un tirage
  où Δ > 0 (« Factorise x² − 5x + 6 »), le même bouton est là ; s'il le clique : faux, et la
  correction montre (x − 2)(x − 3).
- Limite : il a cliqué puis se ravise : un second clic, ou taper dans la case, annule le bouton.
  Jamais les deux à la fois.
- Erreur : il tape une expression alors que la réponse est « pas factorisable » : faux, la
  correction affiche « pas factorisable ». Rien de tapé et pas de clic : case vide, comme
  aujourd'hui (Valider grisé).

Questions (recommandation entre parenthèses) :

- Q1 Le bouton est-il là sur TOUS les tirages, même quand la réponse existe ? (oui, sinon il donne
  la réponse)
- Q2 Le texte du bouton : choisi par le prof pour chaque modèle (« pas factorisable », « pas de
  solution », « n'existe pas »), « impossible » par défaut ? (oui)
- Q3 Le prof l'écrit comment : une option de la case dans le formulaire (« bouton impossible » +
  son texte) ; la réponse attendue vaut `impossible` sur les tirages où elle n'existe pas, avec le
  `{{if:…}}` qui existe déjà. (oui)
- Q4 Quelles cases : les cases ordinaires (expression, nombre) seulement ; pas les intervalles (∅
  existe déjà), ni les blocs à geste. (oui)
- Q5 Dans les résultats du prof (évaluations, statistiques), la réponse de l'élève s'affiche avec le
  texte du bouton, « pas factorisable ». (oui)
- Q6 Les variations Δ < 0 de « Factoriser un trinôme à l'aide de ses racines » (604f83b7) : dans
  ce chantier, en seconde PR, une fois l'outil en prod ? (oui)

### 2026-11-23 — phase 0 tranchée

- David : « je valide » (après la reformulation en français) : Q1 à Q6 oui, comme recommandé.
