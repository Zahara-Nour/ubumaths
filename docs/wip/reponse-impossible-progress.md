# Chantier `reponse-impossible` — journal

Outil n° 51 de [outils-manquants.md](outils-manquants.md) : une case « expression, ou bien :
impossible ». L'élève tape une expression, ou clique un bouton (« pas factorisable », « pas de
solution »…) quand la réponse n'existe pas. Né du chantier
[`idees-1re-second-degre`](../archive/wip/idees-1re-second-degre/idees-1re-second-degre-progress.md)
(Q1 : factoriser un trinôme quand Δ < 0, point 1SPE-253).

## Reprendre ici

_Mis à jour le 2026-11-23, après #3026._

- **État** : outil n° 51 mergé sur `main` (#3026 : case « expression, ou bien : impossible »,
  bouton à état propre), PAS encore en prod · **Prochaine action** : seconde PR du chantier (Q6 :
  variations Δ < 0 de « Factoriser un trinôme à l'aide de ses racines », 604f83b7), une fois
  l'outil en prod ; nouveau worktree · **En attente de David** : le `deploy:prod` qui livrera
  l'outil · **Pièges en cours** : `create-questions.ts` vise la PROD par défaut (lit `.env`) →
  `set -a; source ./.env.local; set +a` avant ; modèle d'essai local `632e3012` · **Worktree /
  branche** : aucun (retiré après #3026).

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

### 2026-11-23 — code, revue

- Contrat (`impossible-answer.ts`, champ `impossibleLabel`) posé, puis moteur (`pedagogy-expert`) et
  interface (`frontend-developer`) en parallèle. Prod vérifiée : aucun modèle n'attend
  `impossible` (témoin `frac` : 164).
- Revue Opus : erreur prévue `impossible` lue en lettres ; aller-retour MathLive non testé (’ → ')
  ; boutons parasites par `blankDefaults` ; casse ; message trompeur. Tout corrigé avant la PR.

### 2026-11-23 — bouton : état à part (décision de David)

- David, après essai : « quand je clique sur le bouton, le champ MathLive se remplit avec le contenu
  du bouton. ce n'est pas ce qu'on veut […] le juge doit d'abord regarder si le bouton a été
  activé ». Aujourd'hui le bouton écrit `\text{<texte>}` dans la case et le juge le reconnaît.
- Validé (« je valide les modifications ») :
  - clic → bouton enfoncé, case VIDÉE et GRISÉE (on ne tape plus dedans) ; second clic → bouton
    relâché, case libre et vide ;
  - juge : bouton enfoncé → juste si l'attendue est `impossible`, faux sinon, sans lire la case ;
    sinon la case est jugée comme aujourd'hui ;
  - enregistré : une marque réservée au bouton, impossible à taper ; le prof voit toujours le texte
    du bouton dans ses résultats (Q5 inchangée) ;
  - changement de la phase 0 : taper n'annule plus le bouton (case grisée tant qu'il est enfoncé).
- Conséquences à revoir : `isImpossibleAnswer` (plus de `\text{}` relu par MathLive, le test
  d'aller-retour ’ → ' change de sens), affichage de la réponse au prof, erreurs prévues
  `impossible`.

### 2026-11-23 — bouton : état à part, codé

- Marque réservée `IMPOSSIBLE_ANSWER` (`\u001Fimpossible`) enregistrée quand le bouton est enfoncé ;
  le texte du bouton tapé n'est plus le bouton. Case vidée et verrouillée (`setPromptState(…, true)`),
  état retrouvé au réaffichage ; `handleInputChange` ignore la case verrouillée relue vide.
- `blankViews` (`expected-result.ts`) montre la marque en texte du bouton. Tests rouges puis verts
  (44 serveur, 6 composant) ; suites voisines vertes ; specs du modèle d'essai local mises à jour.

### 2026-11-23 — revue de la refonte (Opus)

- Lint (`no-control-regex` dans un test) ; test « case vidée » qui ne remplissait pas la case
  (vérifié rouge sans le vidage, vert avec) ; frappe après un clic qui laisse le curseur dans la
  case (Safari) : mesuré, MathLive refuse l'insertion dans une case verrouillée, test ajouté ;
  aller-retour en vraie frappe ; doc : le verrouillage au réaffichage est une garde défensive.

### 2026-11-23 — #3026 mergée

- CI d'abord rouge (cliquet des types de tests : `getPromptRange` rend `Range | null`), corrigée ;
  puis PR en conflit avec `main` (tableau des natures, imports de `sign-table-case.ts`) : GitHub ne
  lançait plus la CI ; fusion de `origin/main`, CI verte, mergée à la main.
