# Lot « Fractions » — rapport de relecture

58 questions TinyMath (#347–#404). Relecture le 2026-09-26 (Claude, trois relecteurs en parallèle
puis contrôle d'ensemble).

> Feu vert d'import donné par David le 2026-09-26 avant la relecture (« oui, feu vert pour
> l'import »). ✅ **57/58 importées en BROUILLON** (vérifié en base : reliées, statut draft).
> ⚠️ **#360 non importée** : même empreinte TinyMath que #356 alors que les deux questions sont
> distinctes (listes de fractions différentes) ; la clé unique du suivi l'empêche. Les points
> « à regarder » ci-dessous n'ont pas bloqué l'import ; ils demandent une décision de David.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 6      |
| Corrigée puis approuvée         | 52     |
| À arbitrer par David            | 0      |
| Rejetée                         | 0      |

Vérification indépendante sur le code de production (après #468) :
`pnpm question:specs --lot docs/relecture/fractions` → **58 importables, 0 non importable**,
357 specs toutes vertes, 50 tirages par variation sans échec. Contrôle d'ensemble : deux tirages
par variation de chaque question relus (énoncé, réponse attendue, correction).

## Corrections notables

- **Aucune fraction juste n'était acceptée** (#368–#373, #382–#404, soit une trentaine de
  questions) : la réponse attendue était calculée en décimal arrondi (`1.2857142857…`), donc
  `\frac{9}{7}` était refusé. Remplacée par la fraction exacte, irréductible par construction ou
  réduite par le pgcd.
- **Saisie MathLive refusée** (#347, #349–#351, #382, #398, #399) : la réponse attendue était écrite
  `a/b` ; le contrôle de forme refusait `\frac{a}{b}`. Réécrite en `\frac`.
- **Réponse = énoncé** (#363) : recopier le décimal était juste et `\frac{3}{4}` refusé.
- **Tirages faussés** : décimaux au lieu d'entiers (#354, #358 : `\dfrac{1.1}{100}`), exclusions de
  diviseurs communs perdues (#381, #397 : 6/4 apparaissait), numérateur nul (#352, #353, #357),
  résultat entier affiché « 2/1 » (#371, #373, #388).
- **Corrections cassées réécrites** (#374–#377 comparaison, #397 produit signé) : `{{if:…}}` non
  résolu, `<b>` et `[°…°]` affichés bruts, texte lu comme des maths.
- **Forme exigée ajoutée** (#349–#351 : entier + fraction ; #361 : décimal) : sans elle,
  `\frac{300}{100}+\frac{45}{100}` ou la recopie de la fraction étaient acceptées.
- Aide HTML TinyMath recopiée dans la consigne (#364) retirée ; typographie (« Écris », « Calcule »,
  « par cœur », points finaux).

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## À regarder par David (import non bloqué)

1. **Espace des milliers** : `1000` écrit sans espace est sanctionné (contrainte `spaces`), alors
   que nos propres énoncés l'écrivent ainsi. Désactivée pour #350 seulement. Faut-il accepter
   1000 sans espace dans tout le thème (ou partout) ?
2. **« Simplifie les signes »** (#372, #373) : `\frac{3}{-4}` est perfectible (demi-point), pas
   refusé. Passer `reducedFractions` en strict ? (`\frac{-3}{4}` serait alors refusé aussi.)
3. **Parenthèses dans l'énoncé** (#372, #373, #380, #390) : `\dfrac{(-3)}{4}`, `(\dfrac{2}{9}) × 27`
   — écriture d'origine conservée.
4. **Décomposition** (#349–#351) : la forme exigée ne peut pas imposer une fraction < 1 ;
   `2+\frac{145}{100}` passe encore pour juste (limite du motif de forme, `lt()`).
5. **Niveaux / descriptions** : #392–#393 « entier × fraction » au CM1 (gardé) ; description de
   #404 recopiée de #403 (« Division par un entier ») alors que la question divise un entier par
   une fraction.
6. #379 : ~13 % des tirages ont pour résultat `0/7` (comme dans TinyMath).

## Défauts de conversion relevés par ce lot

✅ Corrigés par #468 : `pgcd(a;b)` dans les calculs ; `10^$e[a;b]` ; variables mêlant texte et
calcul ; accolade LaTeX collée à un marqueur (`\dfrac{{{a}}…`).

⏳ Restent dans le convertisseur (corrigés à la main dans ce lot, toucheront les suivants) :

1. Réponse attendue `{{eval:{{expressionN}}}}` sur une fraction → décimal arrondi.
2. Fraction attendue écrite `p/q` ou `{p}/q` au lieu de `\frac{p}{q}`.
3. `$e[..]*k+$e[..]` → `1..9*10+1..9`, qui tire des décimaux.
4. Exclusion `;+-\{…}` / `\{cd(…)}` après un tirage relatif non convertie (perdue en silence).
5. `{{if:…}}` contenant des accolades (align multiligne) jamais reconnu ; `{{if:…}}`, `[°…°]` et
   `<b>` laissés bruts dans les corrections ; `{{solution:html}}` au milieu d'une phrase.
6. `result-type: decimal` perdu ; ancien champ `help` (HTML) recopié dans `exerciseInstruction`.
7. Fraction négative attendue `\frac{-a}{b}` jugée elle-même perfectible → écrire `-\frac{a}{b}`.
