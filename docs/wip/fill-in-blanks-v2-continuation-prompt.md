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
| 1. Flash back expression                 | Comment reconstruire `expression = reponse` en flash back ?            | **RESOLU session 3** — `expectedAnswerLatex` + meme pipeline que answerFormat. Section 4.7                                                                                                |
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

### Session 3 (2026-02-12) — Review approfondie du doc + corrections

#### 3 incoherences corrigees dans le doc

| Incoherence                                                        | Correction                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `validationType` fantome dans exemples sections 3.9 et 4.2         | Retire de tous les exemples (supprime en session 2, mais exemples pas mis a jour)                |
| Pipeline answerFormat non documente (resolution variables + LaTeX) | Nouvelle sous-section "Pipeline de resolution answerFormat" ajoutee en section 3.4               |
| Flash back non defini                                              | Section 4.7 mise a jour : `expectedAnswerLatex` sur chaque blank, meme pipeline que answerFormat |

#### Decisions supplementaires

| Decision                           | Details                                                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flash back                         | Le generateur fournit `expectedAnswerLatex` via meme pipeline que answerFormat (resolution variables + conversion LaTeX). Le composant remplace les `?` par les reponses resolues en mode flash back. |
| Indexation 0-based partout         | `blanks[]`, `BlankNode.index`, `InputState.index`, `\placeholder[N]{}` tous en 0-based. Plus de conversion +1/-1. `{{blank:0}}` = premier trou. Section 4.1 mise a jour.                              |
| Champ `position` retire des blanks | L'index = la position dans le tableau. Le champ `position` est redondant et disparu.                                                                                                                  |
| `solution` optionnel               | `solution?: string \| string[]` — absent pour `fill_in_blanks`. Cascade de changements dans resolveVariationWithShared, validateAnswer, resolveSolution.                                              |
| `expressions2` dans le transformer | Les 2 questions avec `expressions2` sont des QCM (pas fill-in). Le transformer creera `expression2` depuis `expressions2[i]`. Pas d'impact sur l'architecture fill-in.                                |
| answerField → fill_in_blanks       | Les 157 questions answerField sont converties en `fill_in_blanks` par le transformer. `\text{...}$$...$$` → `texte $?$`.                                                                              |

## Etat actuel du doc de redesign

Le doc est **coherent et complet** sur le plan architecture/design. **Toutes les questions ouvertes sont resolues.** Pas de lacune identifiee.

## Objectif de la prochaine session

**Passer a l'implementation.** Le doc de redesign est stable. Les prochaines etapes (section 7 du doc) :

1. ~~Trancher les questions en suspens~~ FAIT
2. **Definir les types TypeScript mis a jour** ← prochaine etape
3. Ajouter `[_]` et `<<expr:NAME>>` dans le parser ubumark
4. Implementer le nouveau FillBlanksInput
5. Adapter le pipeline de generation
6. Adapter la validation
7. Mettre a jour le transformer de migration
8. Creer le dictionnaire de vocabulaire mathematique FR
9. Tests + import en DB

### Changements de types a faire (etape 2)

- `QuestionType` : 7 types → 3 (`fill_in_blanks`, `multiple_choice`, `open_answer`)
- `QuestionVariation.blanks` : enrichir avec validation per-blank, retirer `position`
- `SharedVariationDefaults` : ajouter `blankDefaults`, `answerFormats`
- `QuestionInstance.blanks` : enrichir avec `type`, `expectedAnswerLatex`, validation per-blank
- `QuestionInstance.expressions` : nouveau champ
- `QuestionInstance.solution` : rendre optionnel
- `MathInlineNode`/`MathBlockNode` : ajouter `expressionName?: string`
- `BlankNode.index` : passer en 0-based
- `InputState.index` : passer en 0-based
- `validateBlanks()` : reecrire pour validation per-blank

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

- Lire le doc de redesign EN ENTIER avant de commencer
- Respecter le workflow TDD du CLAUDE.md (proposer comportements → validation → tests → implementation)
- Ne PAS recuperer de code du v1 (reverte, hypotheses fausses)
- Commencer par l'etape 2 (types TypeScript) sauf instruction contraire
