# Python exercises — Starter code à zones verrouillées — Progress

> Mode d'édition pour les exercices où l'élève ne peut modifier que des
> zones précises du `starter_code`, le reste étant read-only dans Monaco.
> Empêche la triche paresseuse type `return 7` sur les exos parameterless.

## Décisions de design (validées avec l'utilisateur)

- **Single-line uniquement** (V1). 100% des `# à compléter` des starters BAC actuels sont sur une seule ligne.
- **Marqueurs inline dans `starter_code`** : `{{id}}` ou `{{id | "default"}}`. Pas de schéma DB additionnel.
- **Placeholder visible avec contenu par défaut** : le code starter reste runnable au chargement (`while False:` au lieu de `while {{cond}}:`), zones surlignées pour signaler éditables.
- **Boutons « Réinitialiser cette zone » + « Tout réinitialiser »** (avec confirmation pour le global).
- **Tout côté frontend** : reconstruction du code complet juste avant l'envoi au worker Pyodide. Pas de validation serveur (impossible dans le contexte free-tier Vercel).
- **Pas d'anti-bypass fort** : verrouillage UI uniquement, sécurité contre la triche paresseuse. Un élève motivé peut bypasser via DevTools — c'est OK car aucun résultat n'a de poids académique.
- **Substitution telle quelle** (pas de trim). Python tolère les espaces ; trim pourrait masquer une intention.
- **Zone vide à la soumission** : substituée par chaîne vide, Python lève une SyntaxError remontée à l'élève via la stack trace.
- **Validation Zod côté schema** : `createExerciseSchema` refuse les marqueurs malformés à la création teacher.

## Compatibilité

- Orthogonal aux 5 stratégies de validation (`output`, `unit_test`, `variable_check`, `reference_solution`, `ast_requirements`) — c'est un **mode d'édition**, pas une 6ème stratégie.
- Rétro-compatible : un exo sans marqueurs continue de fonctionner en édition libre.

## Phases

| Phase | Description                                | Statut                  |
| ----- | ------------------------------------------ | ----------------------- |
| 1     | Parser + reconstruction (utilitaires purs) | ✅ Complétée (38 tests) |
| 2     | CodeMirror zones éditables côté élève      | À faire                 |
| 3     | Surlignage + boutons reset                 | À faire                 |
| 4     | UI teacher (prévisualisation + aide)       | À faire                 |
| 5     | Zod refine + tests intégration             | À faire                 |
| 6     | Quality checks finaux + doc finale         | À faire                 |

> **Note** : éditeur de code = **CodeMirror** (pas Monaco). Mentions « Monaco » dans les phases ci-dessus à interpréter comme CodeMirror.

## Phase 1 — état final

### Fichiers

- `src/lib/utils/locked-zones.ts` (290 lignes) — `parseTemplate`, `reconstructCode`, `renderDefaults` + helpers privés.
- `src/lib/utils/locked-zones.test.ts` (38 tests).

### Findings du code-reviewer adressés

- **BLOCKER #2** — `{{x | "foo"bar}}` silently accepted → fix : scan du quote fermant avec gestion `\<quote>` + vérification qu'il n'y a rien après le quote (sinon `unquoted-default`). Tests ajoutés.
- **IMPORTANT #3** — Test mixte valid + malformed + valid ajouté pour `reconstructCode`. Confirme que les marqueurs cassés sont laissés littéralement entre deux marqueurs valides sans casser le découpage.
- **IMPORTANT #5** — _À reprendre en Phase 2/3_ : quand `parseTemplate` retourne des erreurs, `renderDefaults` retombe en mode "template inchangé + zones vides". Côté UI, il faudra signaler visuellement à l'élève (banner rouge « cet exercice est mal configuré ») et au teacher (validation Zod en Phase 5 catchera ça avant la publication).
- **NIT #7** — Documenté : `unescapeString` et `findClosingBraces` sont couplés sur l'absence de `\n` dans les defaults. Si V2 ajoute multi-line, les deux doivent être étendus ensemble.
- **NIT #9** — `parseTemplate` est appelé en interne par `reconstructCode` et `renderDefaults`. Pour V1 (~10 markers max), overhead négligeable. À garder en tête si la Phase 2 fait du re-rendering sur chaque keystroke.
- **NIT #10** — UTF-16 vs CodeMirror position model : à vérifier à l'intégration Phase 2.

### API publique (résumé)

```typescript
parseTemplate(code: string): { markers: Marker[]; errors: ParseError[] }
reconstructCode(template: string, values: Record<string, string>): string
renderDefaults(template: string): { rendered: string; zones: RenderZone[]; errors: ParseError[] }
```

## Fichiers modifiés (au fur et à mesure)

- ✅ `src/lib/utils/locked-zones.ts`
- ✅ `src/lib/utils/locked-zones.test.ts`
- ✅ `docs/wip/python-locked-zones-progress.md`
