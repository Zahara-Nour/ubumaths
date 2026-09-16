# Prompt — corriger 5 défauts de mathAST

> Document écrit le 2026-09-16. Chaque mesure ci-dessous a été **exécutée**, pas
> supposée. Le script de reproduction est en fin de fichier : le lancer d'abord,
> il doit rendre exactement les sorties citées. Si ce n'est pas le cas, quelque
> chose a bougé depuis — s'arrêter et le dire.

---

## Le prompt à coller

Cinq modules de `src/lib/mathAST/` rendent des résultats faux ou inutilisables.
Ils sont indépendants : **une branche + une PR par défaut**, dans l'ordre
ci-dessous. Ne pas les regrouper.

Pour chacun, dans cet ordre : (1) écrire le test qui échoue **et le voir rouge**,
(2) corriger, (3) le voir vert, (4) `pnpm test:server` ciblé sur le module entier
pour vérifier qu'aucun test existant ne casse.

⚠️ Deux des cinq (`units`, `numtype`) posent une **question de produit** avant
toute ligne de code. Elles sont marquées ❓ : poser la question à David et
attendre sa réponse. Les trois autres sont purement techniques.

---

### 1. `taylor` — l'affichage écrit « + - » · fix vérifié, ~1 ligne

`taylorExpand` calcule **juste**. C'est le rendu qui est faux :

```
sin(x)    ->  x + -\dfrac{1}{6} x^3        au lieu de   x - \dfrac{1}{6} x^3
cos(x)    ->  1 + -\dfrac{1}{2} x^2
ln(1+x)   ->  x + -\dfrac{1}{2} x^2 + \dfrac{1}{3} x^3
```

La somme sort de `taylor/expand.ts` sans passer par la normalisation cosmétique
des signes. **Correctif vérifié** : `removeSignsAST` (de
`src/lib/mathAST/cosmetic-transforms.ts`) appliqué au résultat rend exactement
la forme attendue, sur les trois cas :

```
sin(x)  -> x - \dfrac{1}{6} x^3
cos(x)  -> 1 - \dfrac{1}{2} x^2
ln(1+x) -> x - \dfrac{1}{2} x^2 + \dfrac{1}{3} x^3
```

Question à trancher en lisant le code : appliquer la normalisation **dans**
`taylorExpand` (tout appelant en profite, mais le module rend alors un arbre
cosmétiquement transformé) ou **chez l'appelant qui affiche**. Regarder ce que
font les autres modules d'affichage du dépôt avant de choisir, et dire lequel a
été retenu et pourquoi.

Test : `src/lib/mathAST/taylor/__tests__/taylor.test.ts` (existe déjà).

Note sans rapport avec le bug : `terms: 4` compte les **ordres**, pas les termes
affichés — `sin` n'en montre que 2, les ordres pairs étant nuls. C'est correct,
ne pas « corriger ».

---

### 2. `pedagogical-arithmetic` — toute addition de fractions boucle · cause identifiée

`generatePedagogicalArithmeticSteps` rend **51 étapes** pour `2/3+3/4`. Ce n'est
pas un cas isolé : **toute addition de fractions boucle.**

```
2/3+3/4        -> 51 étapes
1/2+1/4        -> 51 étapes
1/2+1/3+1/6    -> 51 étapes
2/3*3/4        ->  2 étapes   (la multiplication, elle, va bien)
```

La cause est visible dans la liste des règles appliquées : deux règles se
défont l'une l'autre, indéfiniment.

```
 1. to-common-denominator
 2. reduce-fraction          <- annule la 1
 3. reduce-fraction
 4. to-common-denominator    <- refait la 1
 5. reduce-fraction
 ...
49. to-common-denominator
50. reduce-fraction
51. evaluate-final
```

50 = `DEFAULT_MAX_ITERATIONS` (`pedagogical-arithmetic/pipeline.ts`, ligne ~310).
La boucle ne s'arrête donc jamais d'elle-même : elle tape le plafond
d'itérations, puis `evaluate-final` conclut. Le résultat final est juste — c'est
le chemin qui est absurde.

**Pourquoi la suite est verte malgré ça** — à lire avant de toucher quoi que ce
soit, c'est le vrai piège :

- `__tests__/fractions.test.ts` teste chaque règle **en isolation** via
  `applyRule()`. Il ne traverse jamais le pipeline, donc ne voit pas le cycle.
- `__tests__/pipeline.test.ts` traverse le pipeline mais n'assert qu'une **borne
  inférieure** : `expect(result.steps.length).toBeGreaterThanOrEqual(1)`. 51
  passe.

Le test à écrire est donc une **borne supérieure** sur le nombre d'étapes d'une
addition de fractions (`2/3+3/4` tient en 3 étapes : mise au même dénominateur,
addition des numérateurs, réduction), plus une assertion qu'aucune règle
n'apparaît deux fois de suite en alternance. Le voir rouge avant de corriger.

Piste : `reduce-fraction` s'applique aux fractions **intermédiaires** que
`to-common-denominator` vient de produire (`8/12` se « réduit » en `2/3`). Soit
elle ne doit pas s'appliquer tant que l'addition n'est pas faite, soit le
pipeline doit détecter qu'il revient sur un état déjà vu. Ne pas se contenter de
baisser `DEFAULT_MAX_ITERATIONS` : ça masquerait le cycle sans le supprimer.

---

### 3. `variations` — aucun extremum n'est jamais trouvé · DEUX causes distinctes

```
x^2-3x+1   extrema = 0   | intervalles : decreasing constant increasing
-x^2+4x    extrema = 0   | intervalles : increasing constant decreasing
x^3-3x     extrema = 0   | intervalles : increasing constant decreasing constant increasing
x^2        extrema = 0   | intervalles : unknown
```

Quatre cas de manuel, zéro extremum. Mais **les quatre ne cassent pas de la même
façon** — c'est le point à ne pas rater :

**Cause A — l'intervalle dégénéré (3 cas sur 4).** Le calcul est juste :
`computeVariations('x^2-3x+1')` trouve la dérivée `2x-3` et son zéro **exact**
`3/2`, et découpe correctement en décroissant puis croissant. Seulement, un
intervalle réduit à un point s'est glissé entre les deux, étiqueté `constant` :

```
  decreasing   ]-inf ; 3/2[
  constant     [3/2 ; 3/2]     <- un seul point
  increasing   ]3/2 ; +inf[
```

`findExtrema` (`variations/extrema.ts`) classe un point critique en comparant
les intervalles **adjacents** : décroissant → croissant = minimum. Ici les deux
ne sont pas adjacents, le `constant` les sépare, et la détection du changement
de signe échoue. `x^3-3x` a le même défaut, deux fois.

**Cause B — `x^2` ne produit qu'un seul intervalle, `unknown`.** Pas de
découpage du tout, donc rien à comparer. Le cas le plus simple du programme est
aussi celui qui échoue le plus tôt : l'analyse de signe de la dérivée `2x`
n'aboutit pas. Chercher pourquoi dans `variations/monotonicity.ts` et
`derivativeSign` — c'est un défaut **différent** de la cause A, et corriger A ne
le corrigera pas.

Écrire donc **deux** tests rouges, pas un : `x^2-3x+1` doit rendre un minimum en
`3/2`, et `x^2` un minimum en `0`. Vérifier que les deux sont rouges avant de
toucher au code, puis que les deux passent — sinon on aura corrigé une moitié en
croyant avoir tout fait.

Pour la cause A, deux correctifs possibles — choisir et justifier : ne pas
émettre d'intervalle pour un point isolé (`variations/monotonicity.ts`), ou
faire sauter les intervalles dégénérés dans `findExtrema`. Le premier est plus
propre si rien d'autre ne dépend de ces intervalles ; le vérifier par `grep`
avant de trancher.

Tests existants : `variations/__tests__/extrema.test.ts` et `compute.test.ts`
(ils passent aujourd'hui — comprendre ce qu'ils assertent réellement).

---

### 4. ❓ `units` — deux bugs distincts, dont un qui demande une décision

**4a. `format` perd l'unité que l'élève a écrite.** Tout est ramené au SI :

```
km/h   -> m.s^-1        (indistinguable de m/s, qui rend la même chose)
km     -> m
mL     -> L
cm^2   -> m^2
```

Un élève qui écrit `45 km/h` se voit répondre en `m.s^-1`. **Question à David
avant de coder : `format` doit-il conserver l'unité d'origine, ou existe-t-il un
appelant qui dépend justement de cette normalisation SI ?** Greper les appelants
de `format` (`units/formatter.ts`) et les lister dans la question — la réponse
dépend de qui s'en sert.

**4b. Conversion litre ↔ volume cubique : rend `null`.** Celui-là est un bug
franc, pas une question de produit :

```
L    -> dm^3    = null      (le facteur vaut 1)
mL   -> cm^3    = null      (le facteur vaut 1)
km/h -> m/s     = 0.2777…   OK
km   -> m       = 1000      OK
h    -> min     = 60        OK
t    -> kg      = 1000      OK
```

Les conversions ordinaires marchent. Ce qui casse, c'est le passage entre un
volume écrit en litres et le même volume écrit comme un cube de longueur — une
conversion de 6ᵉ. Regarder comment `L` est déclaré dans `units/definitions.ts`
(probablement dans `SPECIAL_UNITS`, sans lien dimensionnel vers `m^3`).

**4c.** `kWh` n'est pas reconnu du tout (`Invalid unit string: kWh`). À signaler
à David, pas forcément à corriger dans la même PR.

---

### 5. ❓ `numtype` — `2,5` est classé « réel », et il n'existe pas de type décimal

```
2.5      -> real            <- faux pour le collège
0.1      -> real            <- faux
-2.5     -> real            <- faux
3/4      -> rational        OK
7        -> integer         OK
1.0      -> integer         OK
sqrt(2)  -> irrational_algebraic   OK
```

`2.5` est rationnel (5/2), et même décimal. Le module le classe « réel ». Deux
choses distinctes :

- **le bug** : un nombre à virgule finie est rationnel, `inferType` devrait le
  dire (`numtype/infer.ts`) ;
- **le manque** : l'union `MathType['base']` (`numtype/types.ts`, ligne ~34) n'a
  pas de valeur `decimal`. Or ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ est _la_ chaîne d'inclusions
  enseignée au collège.

❓ **Question à David avant toute ligne de code : faut-il ajouter `decimal` à
l'union, ou se contenter de classer `2,5` en `rational` ?** Ajouter un membre à
l'union est une décision d'architecture, pas un détail : ⚠️ **élargir une union
casse tous les `else` implicites** qui supposaient les membres précédents, et le
typecheck seul ne les montre pas tous (leçon #343, 4 fichiers cassés). Si David
choisit d'ajouter `decimal`, greper l'exhaustivité (`switch` sur `base`,
`format-fr.ts`, `predicates.ts`, `algebra.ts`) **avant** d'écrire le code, et ne
pas s'arrêter au premier trouvé.

---

## Contraintes de travail (non négociables)

- ⛔ **NE JAMAIS lancer** `pnpm check`, `pnpm check:fast`, `svelte-check` sans
  `--incremental`, `pnpm build`, `pnpm lint`, `npx tsc --noEmit` — crash mémoire
  (M1 8 Go). Utiliser `pnpm check:incremental` (un seul à la fois) et
  `pnpm lint:fast`.
- **Un chantier = un worktree frère**, pas le dépôt principal :
  `git worktree add -b fix/<sujet> ../ubumaths-wt-<sujet> origin/main`, puis
  copier `.env` / `.env.local` et `pnpm install --prefer-offline`.
- **Workflow git** : branche → PR → CI 100 % verte → `gh pr merge --merge` →
  suppression de branche. Jamais de code direct sur `main`. Header de commit
  ≤ 100 caractères, sujet en minuscule.
- **Aucune mention de Claude / Anthropic** dans les commits — David est seul
  auteur. (L'éventuelle ligne `Claude-Session:` demandée par le harnais reste
  autorisée.)
- **Tests d'abord, vus ROUGES.** Pour neutraliser un correctif afin de prouver
  qu'un test mord : restaurer **depuis une copie**, jamais
  `git checkout -- <fichier>` (efface le travail non commité).
- `pnpm test:server <chemin>` pour les tests ciblés. Ne pas lancer la suite
  entière.

---

## Script de reproduction

À lancer **avant** de commencer, pour vérifier que les cinq défauts sont
toujours là. Écrire ce fichier dans le répertoire temporaire de la session puis
`npx tsx <le fichier>` depuis la racine du dépôt. ⚠️ Les imports doivent être des
**chemins absolus** : `tsx` ne résout ni `$lib` ni les extensions `.ts`.

```ts
import { parseCustomSafe } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/parser/custom/index';
import { computeVariations } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/variations/index';
import { inferType } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/numtype/index';
import {
	parseOrThrow,
	format,
	getConversionFactor
} from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/units/index';
import { taylorExpand } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/taylor/index';
import { toLatex } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/latex-generator';
import { generatePedagogicalArithmeticSteps } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/pedagogical-arithmetic/pipeline';

const ast = (s: string) => (parseCustomSafe(s) as any).ast;

console.log('--- 1. taylor (affichage) ---');
for (const s of ['sin(x)', 'cos(x)', 'ln(1+x)'])
	console.log(
		' ',
		s,
		'->',
		toLatex(taylorExpand(ast(s), { variable: 'x', center: 0, terms: 4 } as any))
	);

console.log('--- 2. pedagogical-arithmetic (boucle) ---');
for (const s of ['2/3+3/4', '1/2+1/4', '2/3*3/4']) {
	const r: any = generatePedagogicalArithmeticSteps(ast(s), { schoolLevel: 'college' } as any);
	console.log(
		' ',
		s,
		'->',
		r.steps.length,
		'etapes :',
		r.steps
			.slice(0, 6)
			.map((x: any) => x.rule)
			.join(' / ')
	);
}

console.log('--- 3. variations (extrema) ---');
for (const s of ['x^2-3x+1', 'x^2', 'x^3-3x', '-x^2+4x']) {
	const v: any = computeVariations(ast(s), { variable: 'x' } as any);
	console.log(
		' ',
		s,
		'-> extrema =',
		v.extrema.length,
		'| intervalles :',
		v.monotonicIntervals.map((m: any) => m.monotonicity).join(' ')
	);
}

console.log('--- 4. units ---');
for (const s of ['km/h', 'm/s', 'km', 'mL', 'cm^2'])
	console.log(' format', s, '->', format(parseOrThrow(s)));
for (const [a, b] of [
	['L', 'dm^3'],
	['mL', 'cm^3'],
	['km/h', 'm/s'],
	['h', 'min']
])
	console.log(' ', a, '->', b, '=', getConversionFactor(parseOrThrow(a), parseOrThrow(b)));

console.log('--- 5. numtype ---');
for (const s of ['2.5', '0.1', '-2.5', '3/4', '7', '1.0'])
	console.log(' ', s, '->', (inferType(ast(s)) as any).base);
```

⚠️ Piège du parseur, pour écrire les cas de test : en syntaxe custom, `pi` se
lit `p × i` (variable `p` fois l'imaginaire), **pas** le nombre π. Ne pas s'en
servir comme cas de test, et ne pas le prendre pour un bug de `numtype`.
