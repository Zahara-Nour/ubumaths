# Atelier — vue Calcul (lot 3), progression

> Spécification : [`atelier-vue-calcul-phase0.md`](atelier-vue-calcul-phase0.md),
> validée le 2026-09-16. Q1 = B, Q2 = pages gardées + `/atelier` en navigation,
> Q3 = alias français côté atelier.

## Étape 1 — le moteur reflète les objets (fait)

`src/lib/atelier/engine.ts` : `syncEngine()` et `expressionOf()`.

**Q1 option B, mesurée avant d'être écrite.** Pousser dans l'`EvalState` suffit,
le moteur n'a aucune modification à subir : après `createFunctionBinding`,
`f(2)` rend `-1` ; après `setBinding`, `a + 1` rend `4`.

### Ce que la substitution répare

C'est le §6 bis, et il vient d'une mesure. Avec `f` défini comme `x^2-3x+1` :

| Appel                  | Résultat                                                  |
| ---------------------- | --------------------------------------------------------- |
| `.variations f(x)`     | « Derivee : f'(x) = f'(x) », « Points critiques : aucun » |
| `.variations x^2-3x+1` | « Points critiques : x = 3/2 », signe, sens de variation  |

Le premier n'émet **aucune erreur**. Un élève y lit un tableau de variations
d'apparence normale qui ne dit rien de sa fonction. D'où la règle : la vue
substitue la définition avant d'appeler une commande, **récursivement**.

La substitution s'appuie sur `substituteAll` + `substituteFunction` de
`mathAST/eval` — pas de parcours d'AST écrit à la main.

### Trois pièges évités, chacun mesuré

**`clearAllState` remet le mode à `exact`.** L'utiliser aurait ramené l'élève en
mode exact à chaque frappe, sans qu'il ait rien demandé. `clearBindings` +
`clearFunctions` séparément.

**Mes deux premiers tests de garde passaient pour la mauvaise raison.** Je
vérifiais que `f(2)` échoue ; or un objet en attente poussé **de force** échoue
aussi — sur « Evaluation error: Cannot evaluate: free variables: a », un message
technique en anglais. Neutralisation faite : les tests ne mordaient pas. Ce qui
distingue vraiment les deux cas, c'est que le moteur **ne connaisse pas le nom**,
d'où l'assertion sur `getFunctions()` et `getState().bindings`.

**`zzz(x)` ne nomme pas une fonction `zzz`.** En syntaxe custom il se lit
`z·z·z(x)` : l'atelier attend `z`, avec une offre de curseur. Le comportement est
le bon (attente, pas erreur), mais **l'exemple `zzz` du §2.5 N1 de la Phase 0
générale ne tient pas dans cette syntaxe** — `g(x) + 1` est le bon exemple, et
rend bien `{g, function}`, sans offre de curseur, conformément à L4.

> ⚠️ **Dette notée.** `syncEngine` efface les liaisons du moteur avant de les
> reposer : un `.let b = 5` tapé au clavier hors atelier ne survivrait pas à la
> frappe suivante. **Déclencheur : quand la vue Calcul câblera `.let`** — il
> devra créer un objet d'atelier, pas une liaison de moteur.

## Étapes suivantes

- [ ] Étape 2 — les commandes découvrables et françaises (§5, Q3)
- [ ] Étape 3 — la saisie : définition / calcul / commande (§2)
- [ ] Étape 4 — garder un résultat sous un nom (§4, D5)
- [ ] Étape 5 — les quatre actions du panneau (§6)
- [ ] Étape 6 — le rendu mathématique (§3, §6 ter)
- [ ] Étape 7 — `/atelier` en navigation (Q2)
