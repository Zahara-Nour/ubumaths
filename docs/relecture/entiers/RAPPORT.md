# Lot « Entiers » — rapport de relecture

187 questions TinyMath (#21–#24, #34–#95, #107–#227), du CP à la 6e. Relecture le 2026-09-26
(Claude, sept relecteurs en trois vagues, puis contrôle d'ensemble). Les 41 autres questions
Entiers sont celles de David (`docs/relecture/david/`).

> ⏳ **Rien n'est importé** : le feu vert d'import de David portait sur le lot Fractions. Les
> questions « à regarder » ci-dessous attendent sa décision.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 127    |
| Corrigée puis approuvée         | 60     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/entiers`) : **187 analysés,
0 non importable**, 778 specs vertes, 50 tirages par variation sans échec.

## Préparation du lot : défauts corrigés dans le code avant relecture

- #473 : `mod(a;b)` hors calcul ; exclusion contenant un calcul (#90) ; liste dans un tirage
  composé (#216, et #304/#310 : `$l{…}:1000`) ; expression à plusieurs cases `(7*?)+?` (#219) ;
  variable formule liée en syntaxe maison. 6 questions ne généraient pas ; il n'en reste aucune.
- #474 (**défaut de production**) : les codes couleur des corrections étaient groupés comme des
  nombres (`#FF5722` → `#FF5\,722`) : texte non coloré, ou rouge au lieu de bleu.
- #475 (**défaut de production**) : `\div`, produit par la touche ÷ du clavier
  des réponses, n'était pas lu : une réponse juste tapée avec ÷ était jugée fausse.

## Corrections notables

- **Tirages** : plages qui se chevauchent (`1..10|11..15|15..20`, le 15 tiré deux fois plus
  souvent : #79, #85, #152, #170) ; compléments trop courts pour « nombres à 2/3 chiffres » (#91,
  #95) ; tirage vide (#227) ; variables formules jamais calculées (#59, #60, #135).
- **Corrections** : variations 3 et 4 inversées (#181) ; ligne « = 800 = 800 » (#155) ; jaune
  illisible remplacé par une couleur de la palette (#131, #132, #156) ; règle du chiffre des unités
  ajoutée (#135) ; tabulations en tête de correction (#211–#213).
- **#226** : « le quotient de 9 par 3 » acceptait « 3 » (la valeur) ; la réponse attendue est
  l'expression `9:3`.
- **#220** : l'énoncé « 79 » seul affiche maintenant « 79 = □ ».
- Typographie de la source : « Utiiser », « Quelle est le tiers », « eudlienne », « se marrient »,
  « par coeur », majuscules et points finaux des titres.

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## À décider par David

1. ✅ **Copies #136–#147 — tranché par David (2026-09-27)** : TinyMath range la même question
   dans « Additionner » (#74–#85) et « Multiplier » (#136–#147). On garde **une copie par domaine** :
   correction additive d'un côté (« 9 + 9 = 18 »), multiplicative de l'autre (« 2 × 9 = 18 »),
   écrite pour les 7 paires qui n'en avaient pas (#78/#140 et #80/#142 l'avaient déjà). Signatures
   distinctes : #476. Même décision pour #629/#630 (Suites).
2. **#226, #227 « le quotient de… »** : seule l'écriture `a : b` est acceptée ; la fraction
   `\frac{a}{b}` (attendue par TinyMath pour #226) est refusée. Faut-il accepter les deux ?
3. **#227** : `b` passe de 2..9 à 4..9 pour éviter un tirage vide (b = 3 exclu aussi).
4. **#24 « Jusqu'au million »** : les nombres tirés vont jusqu'à 9 999 999 (renommer, ou limiter).
5. **Classes** : additions à retenue #48 (CM1), #49–#50 (CM2) ; paraissent tardives.
6. **#183–#188** (distributivité) : `a` tiré dans 0..9 (12 × 0, 19 × 1 triviaux).
7. **#139** : « Nombres de 1 à 15 », mais 10 n'est jamais tiré (comme TinyMath).

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. Plages TinyMath qui se chevauchent (`$e[11;15];$e[15;20]`) : valeur commune tirée deux fois.
2. Couleur nommée `yellow` recopiée (illisible) ; tabulations en tête des corrections.
3. Variable TinyMath formule sans `[_…_]` (`&3 = &1*1000+&2*100`) non calculée à l'affichage.
4. Sous-domaine « A trou » sans accent (clé de classement, laissée telle quelle).
5. Option TinyMath `exhaust` (parcourir toutes les variations) non reprise (#154, #177).
