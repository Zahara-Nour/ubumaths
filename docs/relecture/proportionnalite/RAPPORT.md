# Lot « Proportionnalité » — rapport de relecture

28 questions TinyMath (#483–#510), 6e–4e : tableaux de proportionnalité, pourcentages, variations
en pourcentage, échelles, vitesse. Relecture le 2026-09-28 (Claude, trois relecteurs puis contrôle
d'ensemble).

> ✅ **Feu vert de David le 2026-09-28 : 27 questions importées en BROUILLON** (vérifié en base :
> reliées au suivi, statut draft, 27 emplacements distincts) ; #510 rejetée. David les publie lui-même.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 2      |
| Corrigée puis approuvée         | 25     |
| Rejetée                         | 1      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/proportionnalite`) : **28
analysés, 0 non importable**, 50 tirages par variation sans échec. Rendu (5 tirages par variation) :
aucun marqueur brut, aucun `%` non échappé.

## Préparation : le moteur a appris les pourcentages (#491)

`20 %` était lu `20 × %` (variable), `20\%` (saisie MathLive) refusé, `{{eval:10%*50}}` en échec.
mathAST a maintenant un vrai pourcentage (lu, affiché « 20 % », valeur exacte, corrigé) ; décisions
de David appliquées : `0,2` pour `20 %` perfectible, `20` faux avec « N'oublie pas le symbole % »,
`710 %` pour 7,1 refusé (mauvaise forme). 19 → 24 questions générables avant relecture.

## Corrections notables

- **Réponses et tirages** : #486 attendait `3/9` non réduit (que le correcteur jugeait lui-même
  perfectible) → `1/3` ; #490 ne générait pas (`€` dans un calcul) → réponses en euros avec unité ;
  #493 (`{{if}}` imbriqués) réécrite ; #508 v0 (variable manquante) réparée ; #509 correction cassée.
- **Unités lues comme des lettres** : « 1 cm » affiché « 1 c m » (#506–#509), `\,kg`, `\,L` en
  italique (#490) → unités déclarées.
- **Corrections** : `{{solution}}` hors formule (fraction en LaTeX brut, « 7.1 » avec un point,
  « 34% » sans espace) sur une quinzaine de questions ; `%` non échappé (commentaire LaTeX) dans les
  descriptions (#494–#499).
- **Pourcentages vérifiés par des specs** : #492, #504, #505 (`34 %` juste, `0,34` perfectible,
  `34` faux) ; #496 (`710 %` refusé).
- #489 : `acceptDecimal` (13,5 juste pour 27/2).
- Consignes à l'impératif (« Donne », « Calcule », « Écris ») au lieu de questions ; « multiplité »,
  « coefficent », `\texgt`.

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Rejetée

- **#510** (vitesse moyenne) — **supprimée (décision de David, 2026-09-28 : doublon de #470)** : source TinyMath incohérente — « Une voiture parcourt … en » suivi d'une
  question d'échelle copiée de #506, sans durée ni solution. À réécrire, pas à convertir.

## Décisions de David (2026-09-28) — tout validé

1. **#485, #486** : précision ajoutée « pour passer de la première ligne à la deuxième ? » — sans elle,
   le coefficient entre colonnes est aussi une bonne réponse, refusée. → Gardée.
2. **#491** (« fraction de dénominateur 100 ») : `1/2` est jugé juste pour 50 % (fractions non
   réduites acceptées dans la source). → **Perfectible** (forme exigée `u/100`, acceptable `u/v`).
3. **#493** (fraction simplifiée d'un pourcentage) : pour 100, 200, 300, 400 %, la réponse est un
   entier. → Tirages gardés.
4. **#503, #505** : diminution de 100 % (coefficient multiplicateur 0) gardée, comme TinyMath. → Gardée.
5. **#502** : `3/2` refusé (mauvaise forme) quand le coefficient décimal `1,5` est attendu. → Validé.
6. **#509** : toute unité équivalente acceptée (`900 cm` pour 9 m). → Validé.
7. **#490** : « 5 fois plus que » (source) gardé.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. `{{solution}}` / `{{solution:html}}` placé hors de la formule.
2. Unités littérales en LaTeX (`$1 cm$`, `\,kg`) lues comme des produits.
3. `%` non échappé dans les descriptions ; `€` dans un calcul.
4. `\frac{{{x}}}{{{y}}}` (accolades collées) ; appel de fonction non évalué dans une variable
   (`gcd(a, 100)`) ; variable présente dans certaines variations seulement.
5. Consignes TinyMath en question, espace avant « ? » manquante.
