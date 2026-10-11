# La commande `.factoriser`

> Chantier : `feat/atelier-factoriser` — worktree `../ubumaths-wt-factoriser`.
> Suite directe de `.simplifier` (#373), qui avait laissé l'intention
> `factoriser` inatteignable.

## Pourquoi elle manquait

Mesuré : les **34 commandes** du registre du moteur ne contiennent ni `factor`
ni `expand`. `.simplifier` travaille en intention `auto`, qui ne factorise rien
(`x² - 4` y reste `x² - 4`, et c'est voulu — « simplifier » ne dit pas
« factoriser »). L'intention `factoriser` de `pedagogical-simplify` n'était donc
atteignable **depuis aucune interface**, et la règle de mise en facteur commun
livrée en #372 était du code mort de fait.

## La première commande servie par l'atelier

`.factoriser` n'existe nulle part dans le moteur : l'envoyer à `engine.execute`
rendrait « Unknown command », en anglais. `runCommand` sort donc **avant**
d'appeler le moteur, sur la liste `ATELIER_ONLY_COMMANDS`.

⚠️ **Troisième catégorie**, à ne pas confondre avec `OFF_REGISTRY` : celle-là
désigne des commandes _branchées en dur dans le moteur mais absentes de son
registre_ (`.convertir`, `.stats`). Ici, le moteur ne les connaît pas du tout.

⚠️ **Sans moteur, il n'y a pas de repli.** Là où `.simplifier` garde la sortie
du moteur quand le module ne sait rien dire, `.factoriser` n'a que ce que le
module lui donne. `factorSteps` rend donc **trois** issues, et non « un résultat
ou `null` » — les distinguer oblige à écrire les trois phrases :

| issue        | ce que l'élève voit                          | ligne rouge ?                  |
| ------------ | -------------------------------------------- | ------------------------------ |
| `factorisee` | la forme factorisée + « Comment ? »          | non                            |
| `inchangee`  | « Je ne sais pas factoriser « 3x + 6 ». »    | **non** — la commande a tourné |
| `illisible`  | « « ### » n'est pas une expression valide. » | oui                            |

Deux silences très différents sont distingués : `(x+1)(x-1)` **n'est pas une
somme**, il n'y a rien à y factoriser ; `3x + 6` en aurait besoin. Renvoyer
l'entrée telle quelle ferait passer `3x + 6` pour une forme factorisée.

## Ce que la commande sait faire, mesuré

| saisie                          | résultat         |
| ------------------------------- | ---------------- |
| `.factoriser x^2-4`             | `(x + 2)(x - 2)` |
| `.factoriser x^2-6x+9`          | `(x - 3)²`       |
| `.factoriser exp(x)+x*exp(x)`   | `(x + 1)exp(x)`  |
| `.factoriser x*sin(x)+2*sin(x)` | `(x + 2)sin(x)`  |

Et ce qu'elle **ne sait pas** (toutes rendent « Je ne sais pas factoriser ») :

| saisie     | ce qu'on attendrait | pourquoi                                          |
| ---------- | ------------------- | ------------------------------------------------- |
| `3x+6`     | `3(x + 2)`          | pas d'extraction de facteur commun **numérique**  |
| `x^2+x`    | `x(x + 1)`          | idem, facteur commun non écrit                    |
| `6x^2+9x`  | `3x(2x + 3)`        | idem                                              |
| `4x^2-25`  | `(2x + 5)(2x - 5)`  | `diff-squares-numeric` ne voit pas le coefficient |
| `x^2-5x+6` | `(x - 2)(x - 3)`    | pas de factorisation par les racines              |
| `x^3-x`    | `x(x - 1)(x + 1)`   | facteur commun, puis identité                     |

⚠️ **C'est la limite du module, pas de la commande.** Le pattern `a·c + b·c`
exige que le facteur commun soit ÉCRIT dans les deux termes : `3x + 6` s'écrit
`3·x + 6`, pas `3·x + 3·2`, donc aucune règle de motif ne peut l'attraper — il
faut une extraction de PGCD, c'est-à-dire de l'arithmétique. `hasCommonFactor`
(`analysis/structures.ts`) fait ce calcul mais n'a **aucun appelant**.

## Défaut trouvé en chemin : la règle parlait anglais

Les deux règles `common-factor-*` avaient été ajoutées **sans leurs
descriptions**. Mesuré, l'élève lisait :

```
titre       : « Règle: common-factor-bare-term »
explication : (vide)
catégorie   : « autre »
```

Invisible jusqu'ici parce que l'intention `factoriser` n'était atteignable
d'aucune interface : la commande la met du même coup sous les yeux des élèves.
Ajouté dans `descriptions-fr.ts` (description neutre, titres et explications
lycée / collège / supérieur) et dans `RULE_CATEGORY_MAP` (`factorisation`).

L'explication du cas `c + b·c` dit d'où vient le `1`, qui est exactement
l'endroit où un élève décroche.

## Défaut trouvé en chemin : les parenthèses en trop

`.factoriser f(x)` rendait `((x + 2)(x - 2))`. La substitution des noms (§6 bis)
écrit `(x^2-4)` avec ses parenthèses — **nécessaires** à la relecture — et là où
dériver ou réduire remplacent le nœud racine et emportent l'enveloppe avec lui,
factoriser la laisse en place. `unwrapGrouping` retire les parenthèses de
GROUPEMENT en tête (jamais un intervalle : `[0;1]` garde les siennes).

## Tests

- `common-factor-descriptions.test.ts` (serveur, 11) — la règle se dit en
  français, à tous les niveaux
- `factoriser-commande.test.ts` (serveur, 17) — le catalogue, les trois issues,
  les refus
- `factoriser-depliage.svelte.test.ts` (Chromium, 7) — MathLive compose, le
  bouton déplie, la ligne « je ne sais pas » n'est pas rouge

Preuves rouges par **neutralisation depuis une COPIE** (jamais `git checkout`),
un garde à la fois : `unwrapGrouping` → 2 rouges ; `ATELIER_ONLY_COMMANDS` →
14 rouges ; les titres français → 3 rouges.

## À trancher

- **`.développer`** : l'intention `developper` reste inatteignable. Même
  plomberie, une entrée de plus dans `ATELIER_ONLY_COMMANDS`.
- **Un bouton « Factoriser » au panneau** : aujourd'hui seules `derive`, `solve`
  et `variations` en ont un. Le principe posé sur `.résoudre` (« le bouton et la
  commande doivent dire la MÊME chose ») s'appliquerait.
- **Le facteur commun numérique** (`3x + 6 → 3(x + 2)`) : c'est l'exercice le
  plus courant du collège et de seconde, et il demande un vrai chantier mathAST.
