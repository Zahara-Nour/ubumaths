# Prompt de continuation — Fill-in-Blanks Redesign v2

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Un premier plan (v1) a ete implemente (phases 1-7) puis entierement reverte (commit `0827fe24`) car plusieurs lacunes architecturales ont ete identifiees.

Deux documents de travail existent :

- `docs/wip/fill-in-blanks-redesign.md` — doc d'architecture principal (CORRIGE et a jour)
- `docs/wip/fill-in-blanks-plan-v2-notes.md` — lecons de l'echec du v1, questions ouvertes (toutes RESOLUES)

## Ce qui a ete fait (session du 2026-02-12)

4 corrections appliquees au doc de redesign + 3 decisions supplementaires :

### Corrections

1. **Suppression du faux binaire "mode expression" vs "mode statement"** — Le composant a un seul chemin de rendu (parcours AST unifie). La convention `expression` (variable dont le nom commence par `expression`) est geree via un champ `expressions[]` sur QuestionInstance. Le generateur extrait les metadonnees, le composant les utilise pour augmenter le noeud math en mode interactif (append `= answerFormat[\placeholder]`). En flash, le statement est rendu tel quel. (sections 3.4, 3.6, 4.7)

2. **`answerFormats` per-expression** — `answerFormats?: Record<string, string>` sur shared/variation, cle = nom de variable expression. Defaut `"?"` si absent. (sections 3.5, 4.3)

3. **Convention `expression*` clarifiee** — Plus de glob ambigu. "Variable dont le nom commence par `expression`". Toutes les occurrences mises a jour.

4. **Validation per-blank** — Chaque trou porte sa propre config de validation. Pipeline per-trou math : (1) validationRules ou validation par type (exact/decimal/algebraic), (2) checkRequiredForm, (3) applyConstraints. Trous texte : fuzzy matching. (section 3.7)

### Decisions supplementaires

5. **`blanks[]` seule source de verite pour fill_in_blanks** — `solution` n'est pas utilise. Flash back reconstruit les reponses depuis `blanks[i].expectedAnswer`. `solution` reste pour `multiple_choice` et `open_answer`. (section 3.8)

6. **Structure template-side des blanks** — `blankDefaults` au niveau question (defauts de validation), overridables per-blank. Le generateur fusionne et infere `type` (math/text) du contexte. (section 3.7)

7. **Lien expressions ↔ blanks** — Blanks explicites dans le template pour les questions expression. L'auteur specifie `expectedAnswer` avec `{{eval:...}}` pour les `?` de l'answerFormat. Pas d'auto-creation par le generateur. Le transformer de migration genere ces blanks depuis les anciennes `solutionss`. (section 3.9)

## Etat du doc de redesign

Le doc est **coherent et complet** sur le plan architecture/design. Toutes les questions ouvertes du v2-notes sont resolues. La section 7 "Prochaines etapes" liste les etapes d'implementation.

## Prochaine etape

Passer a l'**implementation** (plan v2). Les etapes sont listees dans la section 7 du redesign :

1. ~~Questions en suspens~~ FAIT
2. Definir les types TypeScript mis a jour
3. Ajouter le support de `[_]` dans le parser ubumark
4. Implementer le nouveau FillBlanksInput
5. Adapter le pipeline de generation
6. Adapter la validation
7. Mettre a jour le transformer de migration
8. Creer le dictionnaire de vocabulaire mathematique FR (deja fait, reverte mais recuperable)
9. Tests + import en DB

## Fichiers cles a lire

- `docs/wip/fill-in-blanks-redesign.md` — **LIRE EN PREMIER** — doc d'architecture complet
- `docs/wip/fill-in-blanks-plan-v2-notes.md` — contexte historique, code reutilisable du v1
- `src/lib/questions/types.ts` — types actuels a modifier
- `src/lib/questions/generator/instance-generator.ts` — pipeline de generation
- `src/lib/utils/answer-validator.ts` — pipeline de validation
- `src/lib/components/question-inputs/FillBlanksInput.svelte` — composant a refaire

## Consignes

- Lire le doc de redesign AVANT de proposer un plan
- Respecter le workflow TDD de CLAUDE.md (proposer comportements, attendre validation, ecrire tests, implementer)
- Code reutilisable du v1 recuperable via git (fuzzy-text-validator, legacy-type-mapper, blank-resolver, math-dictionary-fr, parser [_])
- Etudier `src/lib/questions/` pour comprendre le systeme actuel
