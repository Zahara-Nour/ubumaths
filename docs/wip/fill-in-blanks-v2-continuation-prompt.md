# Prompt de continuation — Fill-in-Blanks Redesign v2

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Un premier plan (v1) a ete implemente (phases 1-7) puis entierement reverte (commit `0827fe24`) car plusieurs lacunes architecturales ont ete identifiees. Le code du v1 n'est PAS reutilisable — il a ete ecrit avec des hypotheses fausses. Tout sera reecrit a partir du design corrige.

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

7. **Lien expressions <> blanks** — Blanks explicites dans le template pour les questions expression. L'auteur specifie `expectedAnswer` avec `{{eval:...}}` pour les `?` de l'answerFormat. Pas d'auto-creation par le generateur. Le transformer de migration genere ces blanks depuis les anciennes `solutionss`. (section 3.9)

## Etat du doc de redesign

Le doc est **coherent** sur le plan architecture/design. Toutes les questions ouvertes du v2-notes sont resolues. Mais la reflexion n'est peut-etre pas terminee — il peut rester des points de design a discuter avant de passer a l'implementation.

## Objectif de cette session

**Continuer la reflexion architecture/design.** Lire le doc de redesign, identifier d'eventuelles lacunes ou incoherences, et les discuter avec l'utilisateur. NE PAS lancer l'implementation sans accord explicite.

Pistes a explorer (non exhaustif) :

- Le design couvre-t-il bien les 633 questions existantes ? Verifier avec des exemples concrets de `.claude/old-questions.json`
- La structure `blanks` template-side est-elle suffisante pour tous les cas de migration ?
- Le composant FillBlanksInput : comment gere-t-il le flash back (reconstruction des reponses dans le statement) ?
- Le type `open_answer` : comment est-il utilise ? Quels cas concrets ?
- Y a-t-il des cas limites non couverts (questions avec a la fois des `?` dans le statement ET des expressions avec answerFormats) ?

## Fichiers cles a lire

- `docs/wip/fill-in-blanks-redesign.md` — **LIRE EN PREMIER** — doc d'architecture complet
- `docs/wip/fill-in-blanks-plan-v2-notes.md` — contexte historique
- `src/lib/questions/types.ts` — types actuels
- `src/lib/questions/generator/instance-generator.ts` — pipeline de generation
- `src/lib/utils/answer-validator.ts` — pipeline de validation
- `.claude/old-questions.json` — donnees des 633 questions TinyMath

## Consignes

- Lire le doc de redesign AVANT de proposer quoi que ce soit
- Etudier `src/lib/questions/` pour comprendre le systeme actuel
- Proposer des corrections/clarifications section par section — attendre validation avant de modifier
- Ne PAS lancer d'implementation
- Ne PAS recuperer de code du v1 (reverte, hypotheses fausses)
