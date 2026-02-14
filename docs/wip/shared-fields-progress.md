# Champs partagés (SharedVariationDefaults) - Progression

## État : Terminé

## Résumé

Ajout de tous les champs `SharedVariationDefaults` dans le formulaire `QuestionTemplateForm.svelte`.
Auparavant, seules les variables partagées (`shared.variables`) étaient gérées. Tous les champs du type sont maintenant éditables.

## Champs ajoutés

| Champ                        | Éditeur                                 | État |
| ---------------------------- | --------------------------------------- | ---- |
| `statement`                  | MarkdownEditor                          | OK   |
| `variables`                  | VariableEditor (déplacé dans le groupe) | OK   |
| `solution`                   | AnswerEditor                            | OK   |
| `correction`                 | MarkdownEditor                          | OK   |
| `choices`                    | AnswerEditor (via bind:choices)         | OK   |
| `requiredForm`               | MySelect + Input custom                 | OK   |
| `blankDefaults.precision`    | PrecisionEditor                         | OK   |
| `blankDefaults.requiredForm` | MySelect + Input custom                 | OK   |
| `blankDefaults.unit`         | MyCheckbox + Input                      | OK   |
| `validationRules`            | Textarea JSON                           | OK   |
| `answerFormats`              | Textarea JSON                           | OK   |

## Architecture UI

- Card "Champs partagés" (fermée par défaut) remplace l'ancienne Card "Variables partagées"
- 8 sous-sections collapsibles avec séparateurs `border-b`
- Chaque sous-section réutilise les éditeurs existants

## Fichier modifié

- `src/lib/components/QuestionTemplateForm.svelte`

## Décisions prises

- RequiredForm: MySelect avec options prédéfinies + option "custom" pour pattern personnalisé
- BlankDefaults: combinaison de PrecisionEditor, MySelect, MyCheckbox et Input
- JSON fields (validationRules, answerFormats): textarea avec styling monospace
- `placeholder="{}"` corrigé en `placeholder={'{}'}` pour éviter le parse error Svelte

## Vérifications effectuées

- [x] Prettier formatage OK
- [x] ESLint 0 erreurs
- [x] Svelte autofixer exécuté (erreur détectée et corrigée: placeholder)
- [x] Patterns identiques au code existant (Collapsible, bind, $state, etc.)
