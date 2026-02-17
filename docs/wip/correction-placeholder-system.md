# Correction Placeholder System - Progression

> Document de progression pour le systeme de resolution des placeholders dans les corrections.

## Etat actuel : Phases 1-2 completees

### Decisions prises

| Decision           | Choix                                                           |
| ------------------ | --------------------------------------------------------------- |
| `{{solution}}` QCM | Texte du choix correct (pas l'index)                            |
| `{{expression}}`   | Alias de variable `expression` (si existe), sinon `expression1` |
| Approche           | Pseudo-variables injectees avant `resolveMarkdownContent`       |
| `{{answer}}`       | Non resolu a la generation, preserve pour le client             |
| Format sortie      | `ResolvedMarkdown`                                              |

### Fichiers crees/modifies

| Action  | Fichier                                                   | Description                               |
| ------- | --------------------------------------------------------- | ----------------------------------------- |
| CREE    | `src/lib/questions/generator/correction-resolver.ts`      | Module de resolution des corrections      |
| CREE    | `src/lib/questions/generator/correction-resolver.test.ts` | 24 tests unitaires                        |
| MODIFIE | `src/lib/questions/generator/instance-generator.ts`       | Integration apres blanks/choices          |
| MODIFIE | `src/lib/questions/generator/instance-generator.test.ts`  | Fix test-pair-bug-2 + 4 integration tests |

### Architecture

Pipeline de `resolveCorrectionContent()`:

```
1. escapeClientPlaceholders(template)
   - {{answer}}, {{answer:N}} → token unique
   - {{if:cond|then|else}} → token unique
   ({{color:...}} passe naturellement, tokenizer l'ignore)

2. preprocessCorrectionSyntax(escaped)
   - {{solution:N}} → {{solution_N}}
   - {{solution:html}} → {{solution}}
   - {{expression:raw}} → {{expression}}

3. buildEnrichedVariables(resolvedVariables, context)
   - Ajouter: solution, solution_0, solution_1, ...
   - Ajouter: expression (si pas deja dans resolvedVariables)
   - Les pseudo-variables NE remplacent PAS les variables existantes

4. resolveMarkdownContent(preprocessed, enrichedVariables, seed)
   → resolution variables + couleurs + conversion LaTeX

5. restoreClientPlaceholders(resolved, tokens)
   → reinjecter {{answer}}, {{if:...}}
```

### Integration dans `instance-generator.ts`

Ordre de resolution (nouveau):

1. Variables → 2. Statement → 3. CorrectChoiceIndex → 4. Blanks → 5. Choices → **6. buildCorrectionContext()** → **7. resolveCorrectionContent()** → 8. Instance

### Tests

- 24 tests unitaires dans `correction-resolver.test.ts`
- 4 tests d'integration dans `instance-generator.test.ts`
- Test `test-pair-bug-2` corrige (attendait `success: false`, maintenant `success: true`)

---

## Prochaines etapes (non implementees)

### Phase 3 : Resolution cote client (correction interactive)

- [ ] Fonction `resolveClientPlaceholders(template, { answers, colors, conditions })` pour la phase post-reponse
- [ ] Integration dans FlashCard ou composant de correction
- [ ] Gerer `{{answer}}`, `{{answer:N}}`, `{{color:...}}`, `{{if:...}}`

---

## Fichiers de reference

| Fichier                                              | Role                                           |
| ---------------------------------------------------- | ---------------------------------------------- |
| `src/lib/questions/correction-placeholders.ts`       | Types, parsing, validation des placeholders    |
| `src/lib/questions/generator/correction-resolver.ts` | **NOUVEAU** Resolution serveur des corrections |
| `src/lib/questions/generator/instance-generator.ts`  | Pipeline de generation (enrichi)               |
| `src/lib/questions/generator/content-resolver.ts`    | Resolution du contenu markdown/expressions     |
| `src/lib/questions/types.ts`                         | `QuestionCorrection`, `ResolvedCorrection`     |
