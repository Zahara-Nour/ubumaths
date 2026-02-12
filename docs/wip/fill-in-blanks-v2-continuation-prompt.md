# Prompt de continuation — Fill-in-Blanks Redesign v2

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Un premier plan (v1) a ete implemente (phases 1-7) puis entierement reverte (commit `0827fe24`) car plusieurs lacunes architecturales ont ete identifiees. Le code du v1 n'est PAS reutilisable — il a ete ecrit avec des hypotheses fausses. Tout sera reecrit a partir du design corrige.

Documents de travail :

- `docs/wip/fill-in-blanks-redesign.md` — doc d'architecture principal (CORRIGE et a jour)
- `docs/wip/fill-in-blanks-plan-v2-notes.md` — lecons de l'echec du v1, questions ouvertes (toutes RESOLUES)

## Ce qui a ete fait

### Session 1 (2026-02-11) — Corrections initiales

4 corrections appliquees au doc de redesign + 3 decisions supplementaires :

1. **Suppression du faux binaire "mode expression" vs "mode statement"** — Un seul chemin de rendu (parcours AST unifie). Convention `expression` geree via `expressions[]` sur QuestionInstance. (sections 3.4, 3.6, 4.7)
2. **`answerFormats` per-expression** — `answerFormats?: Record<string, string>` sur shared/variation. (sections 3.5, 4.3)
3. **Convention `expression*` clarifiee** — "Variable dont le nom commence par `expression`". (tout le doc)
4. **Validation per-blank** — Chaque trou porte sa propre config de validation. (section 3.7)
5. **`blanks[]` seule source de verite** — `solution` absent pour `fill_in_blanks`. (section 3.8)
6. **Structure template-side** — `blankDefaults` + overrides per-blank. (section 3.7)
7. **Lien expressions <> blanks** — Blanks explicites, `{{eval:...}}` pour expectedAnswer. (section 3.9)

### Session 2 (2026-02-12) — Revue approfondie + 6 gaps + validation + unites

#### 6 gaps identifies et resolus

| Gap                                      | Probleme                                                               | Decision                                                                                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Flash back expression                 | Comment reconstruire `expression = reponse` en flash back ?            | **Differe** — note dans section 4.7                                                                                                                                                       |
| 2. Interface composant                   | Le parent a besoin du LaTeX (pour constraints) en plus de l'ascii-math | **Deux tableaux** : `bind:values` (ascii-math) + `bind:valuesLatex` (LaTeX). Section 3.7                                                                                                  |
| 3. `solution` optionnel                  | Le champ existait mais n'etait pas marque optionnel                    | **`solution?: string \| string[]`** — absent pour fill_in_blanks. Sections 3.8, 4.4                                                                                                       |
| 4. Indexation blanks                     | Expression blanks etaient appendes apres les statement blanks          | **Ordre naturel** — blanks comptes dans l'ordre du document. Quand le composant rencontre un noeud expression, les `?` de l'answerFormat sont comptes a cet endroit. Section 3.9 reecrite |
| 5. Identification expressions dans l'AST | Le doc proposait du matching LaTeX (fragile)                           | **Tagging AST** — content-resolver insere `<<expr:NAME>>` avant la valeur resolue. Parser cree MathInlineNode/MathBlockNode avec `expressionName: string`. Sections 3.4, 4.7              |
| 6. Syntaxes `[_]` et `{{blank:N}}`       | Coexistence pas specifiee                                              | **Pas de mixing** — les deux sont supportees, mais pas dans le meme statement. Section 4.8                                                                                                |

#### Refonte validation : suppression de `validationType`

Apres etude approfondie du code actuel (`answer-validator.ts`, `src/lib/math/index.ts`, `src/lib/questions/units/validator.ts`) et comparaison avec TinyMath :

- **Suppression du champ `validationType`** (anciennement `exact | decimal | algebraic`)
- **Inference du mode depuis le contexte** :
  - Ni `precision` ni `unit` → **equivalence** (`areEquivalent()`)
  - `precision` present → **approximate** (`validateNumerical()`)
  - `unit.expected` present → **unites** (`validateQuantityAnswer()`)
  - `precision` + `unit.expected` → **unites + tolerance**
  - Trou texte → **fuzzy matching**

#### Config unites per-blank

Apres etude approfondie du systeme d'unites existant (`src/lib/mathAST/units/`, `src/lib/questions/units/`) :

```typescript
unit?: {
  expected: boolean;          // true = l'eleve doit fournir l'unite
  required?: string;          // unite imposee (ex: "m"). Si absent → libre
  requireSameSymbol?: boolean; // true = symbole exact (pas de conversion)
}
```

Distinction syntaxe custom dans les templates :

- `$5[km] = ?[m]$` → unite dans l'expression, blank ne contient pas d'unite, pas de config `unit` necessaire
- `$5[km] = ?$` → eleve doit fournir l'unite → `unit: { expected: true }`

Analyse dimensionnelle (`checkDimensionalConsistency()`) a la validation, pas au rendu.

## Etat actuel du doc de redesign

Le doc est **coherent et complet** sur le plan architecture/design. Toutes les questions ouvertes sont resolues sauf le flash back des expressions (differe).

## Objectif de cette session

**Continuer la reflexion architecture/design.** Lire le doc de redesign EN ENTIER, identifier d'eventuelles lacunes ou incoherences, et les discuter avec l'utilisateur. NE PAS lancer l'implementation sans accord explicite.

### Pistes a explorer (non exhaustif)

1. **Flash back des expressions** (gap 1 differe) — Comment reconstruire `expression = reponse` quand on affiche la solution ? Le composant doit-il stocker le LaTeX de la reponse validee ? Faut-il un format special dans `blanks[].expectedAnswer` ?

2. **Couverture des 633 questions** — Verifier avec des exemples concrets de `.claude/old-questions.json` que le design couvre bien tous les cas. En particulier :

   - Les 15 questions avec `answerFormats` non-trivial (`10^?`, `?*10^?`, `&1^?`)
   - Les 2 questions avec `expressions2` (2 expressions simultanees)
   - Les questions answerField (phrase avec trous math)

3. **Migration transformer** — Le transformer doit generer les `blanks[]` depuis les anciennes `solutions`. Est-ce que le mapping est clair pour tous les cas ?

4. **Cas limites** :

   - Questions avec a la fois des `?` dans le statement ET des expressions avec answerFormats
   - Expressions en mode inline vs bloc — impact sur le rendu
   - Blanks texte avec autocompletion + pool — comment le pool est-il defini ?

5. **Types TypeScript** — Le doc decrit les structures mais les types formels ne sont pas encore definis. Verifier la coherence avant de passer a l'etape de definition des types (section 7, etape 2).

6. **Composant FillBlanksInput** — Architecture detaillee du composant de rendu. Comment gere-t-il le parcours AST, les prompts MathLive, les inputs texte, les events ?

## Fichiers cles a lire

- `docs/wip/fill-in-blanks-redesign.md` — **LIRE EN PREMIER** — doc d'architecture complet
- `docs/wip/fill-in-blanks-plan-v2-notes.md` — contexte historique
- `src/lib/questions/types.ts` — types actuels
- `src/lib/questions/generator/instance-generator.ts` — pipeline de generation
- `src/lib/questions/generator/content-resolver.ts` — resolution des variables (ou le marqueur `<<expr:NAME>>` sera insere)
- `src/lib/utils/answer-validator.ts` — pipeline de validation
- `src/lib/questions/units/validator.ts` — validation des unites
- `src/lib/math/index.ts` — `areEquivalent()`, `evaluateExpression()`
- `src/lib/ubumark/types/ast.ts` — types AST (MathInlineNode, MathBlockNode, BlankNode)
- `src/lib/components/question-inputs/FillBlanksInput.svelte` — composant actuel (a reecrire)
- `src/lib/components/markdown/nodes/MathPrompt.svelte` — prompts MathLive
- `.claude/old-questions.json` — donnees des 633 questions TinyMath

## Consignes

- Lire le doc de redesign EN ENTIER avant de proposer quoi que ce soit
- Etudier `src/lib/questions/` pour comprendre le systeme actuel
- Proposer des corrections/clarifications section par section — attendre validation avant de modifier
- Ne PAS lancer d'implementation
- Ne PAS recuperer de code du v1 (reverte, hypotheses fausses)
- Verifier la coherence interne du doc (les decisions des 2 sessions sont-elles bien refletees partout ?)
