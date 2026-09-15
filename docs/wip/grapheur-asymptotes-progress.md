# Grapheur — asymptotes horizontales, obliques et courbes (feat/grapheur-asymptotes)

Demandé par David le 2026-09-15, après la correction des asymptotes verticales
(#323). Deux décisions tranchées par lui avant le code : une asymptote
unilatérale n'est tracée **que de son côté**, et les asymptotes **courbes** sont
dans le périmètre.

## Ce qui était cassé — trois causes indépendantes

1. **`estimateLimit` rejetait une convergence exacte.** Le test « les écarts
   rétrécissent » s'écrit `diff >= prevDiff * 0.9`, et `0 >= 0` est vrai. Or
   `exp(-x)` vaut 0 au flottant près dès x = -750, la sigmoïde vaut 1 dès
   x = 40 : ces fonctions n'avaient **aucune** asymptote horizontale.
2. **L'ordonnée à l'origine des obliques était condamnée.** Elle se calculait
   par `f(x) − m·x` avec un `m` estimé, dont l'erreur est multipliée par x —
   jusqu'à 100 000. Une erreur de 1e-5 sur la pente suffisait. Conséquence :
   toute oblique dont l'ordonnée à l'origine n'est pas nulle était perdue,
   `(x²+3x)/(x-2)` comme `(2x²-x+1)/(x+1)`. Les cas à ordonnée nulle passaient,
   d'où l'illusion que la détection marchait.
3. **`direction` était calculée puis ignorée au rendu.** `arctan` affichait ses
   deux horizontales sur toute la largeur, chacune traversant la moitié du
   repère où elle est fausse.

## Méthode retenue

Une seule primitive pour les trois familles : `fitPolynomialBranch()` ajuste un
polynôme de degré donné sur `degré + 1` abscisses éloignées, **par
interpolation**, puis vérifie sa **stabilité** en recommençant quatre fois plus
loin.

Deux pièges rencontrés, tous deux réglés par la mesure :

- **Comparer des coefficients exprimés dans des bases différentes.** Les
  ajustements à deux échelles s'expriment en `x/1000` et `x/4000` ; il faut
  repasser en coefficients de `x` **avant** toute comparaison.
- **Exiger que deux ajustements coïncident est irréaliste.** L'écart à
  l'asymptote est en O(1/x) : l'ordonnée à l'origine de `(x²+3x)/(x-2)` est
  estimée à 5,0167 à x = 1000 et 5,0042 à x = 4000. Une **extrapolation de
  Richardson** — `(4·loin − près)/3` — élimine le terme en 1/x et rend 4,99999.
  La stabilité se vérifie alors entre deux extrapolations successives.

⚠️ Et un piège dans ma propre vérification : le test « l'écart à l'asymptote
décroît » se sabotait lui-même. À x = 100 000, c'est l'erreur résiduelle sur le
coefficient dominant (1e-8 × x) qui domine l'écart réel, lequel **remonte**.
`x + 1/x` était rejeté pour cette raison. Le test ne sert en fait qu'à
distinguer « f _tend vers_ le polynôme » de « f **est** le polynôme » — une
parabole n'est pas asymptote d'elle-même — et se mesure donc à une échelle
modérée, où l'écart est franc.

## Périmètre

- Degré borné à **2** par voie numérique — voir la revue plus bas : 4 était une
  promesse non tenue.
- Les degrés 0 et 1 restent rendus comme horizontale et oblique : pas de doublon.
- Nouveau type `PolynomialAsymptote` (coefficients croissants), pour ne pas
  toucher à `ObliqueAsymptote`, utilisé ailleurs.
- Rendu en polyligne de 64 segments, même pointillé que les obliques ; libellé
  `y = x^2 + 3.00x + 2.00`.

## Vérification

- 13 tests (`asymptotes-limites.test.ts`) : limite atteinte exactement, deux
  paliers d'une sigmoïde, obliques à ordonnée non nulle, paraboles asymptotes,
  et les non-régressions (`1/x`, `arctan`, `√(x²+1)`, `x + 1/x`, polynômes).
- **3806** tests geometry-core + grapheur verts ; `svelte-autofixer` sans
  remarque ; rendu relu dans l'application sur les trois familles.

## Revue — six findings, dont deux critiques

L'auditeur a balayé ~4100 fonctions, puis confirmé chaque finding contre le
vrai module. Verdict initial : **ne pas merger**. Ce qu'il a trouvé, et ce que
j'en ai fait.

### Deux régressions introduites par ma propre correction

Corriger le défaut n° 1 (« une convergence exacte était rejetée ») revenait à
accepter `diff === 0` comme convergence. Deux faux positifs sont nés de là :

- **`cos(πx/50)` déclarée d'asymptote `y = 1`.** Sa période vaut 100 : sondée
  sur 100, 1000, 10000, elle rend **exactement 1** à chaque fois. Les sondes
  sont désormais **non commensurables** — 137, 1373, 13729, 137299 — pour ne
  plus tomber sur une période décimale.
- **Une fonction constante recevait une asymptote sur elle-même**, le pointillé
  posé sur la courbe. Les obliques et les courbes refusaient déjà ce cas ;
  l'horizontale le fait maintenant aussi.

Et le défaut n° 1 lui-même **était redéposé** dans la nouvelle vérification :
`differsFromPolynomial` ne sondait qu'à x = ±100 et ±300, et confondait « je
n'ai rien pu mesurer » avec « la fonction EST le polynôme ». `√(x²−250000)`,
non définie avant 500, et `x + e⁻ˣ`, dont l'écart est sous l'ulp dès x = 100,
perdaient leur asymptote. Les deux situations sont désormais distinctes.

### L'extrapolation ne suffisait pas

`(x²+3x)/(x−20)` n'était pas détectée : l'écart à l'asymptote vaut
`A/x + A·a/x² + …`, et le premier niveau de Richardson ne tue que le terme en
1/x. Seuil mesuré : détecté jusqu'à un pôle en 10, perdu dès 20.

Un **second niveau** `(16·R2 − R1)/15` corrige, sur quatre échelles. Et le
critère de validation change : on vérifie que la suite **converge** — les écarts
successifs se resserrent d'un facteur net — au lieu d'exiger que deux
estimations **coïncident**. `√(x²−250000)` approche lentement (−230, −52, −13,
−3,3) : la convergence est franche, l'égalité ne viendra jamais.

Résultat : `(x²+3x)/(x−20)` → `y = x + 23`, `(x²+1)/(x−100)` → `y = x + 100`,
`x³/(x−20)` → `y = x² + 20x + 400`.

### Le périmètre annoncé n'était pas tenu

**Le degré 4 était une promesse en l'air** : au degré 3, le coefficient constant
se reconstruit par annulation catastrophique — à x = 16 000, x³ vaut 4e12 et
lire une unité dessus demande 16 chiffres significatifs. `(x⁴+1)/(x−1)` n'était
pas détectée, et `x³ + a₀ + 1/x` ne l'était que pour |a₀| ≳ 10. Les cinq tests
d'asymptotes courbes n'exerçaient que le degré 2 : l'écart était invisible.

Le degré est ramené à **2**, avec un test qui fige cette limite. La voie
symbolique la lèvera — c'est précisément ce qu'une division euclidienne fait
sans sondage.

### Trois points mineurs

- Le seuil sur le coefficient dominant devient **relatif** : une parabole plate
  (`x²/50000`) a bien une asymptote courbe, qu'un seuil absolu écartait.
- `getHorizontalPath` reçoit la garde de dégénérescence qui manquait : une
  branche entièrement hors cadre laissait un `<path>` vide et son infobulle.
- Un aller-retour inutile dans le tracé des courbes, et un commentaire faux.

### Deux limites intrinsèques, notées

- **Écart en O(ln x / x)** : `x + ln(x)/x` n'est pas détectée. L'extrapolation
  suppose une erreur en puissances de 1/x ; un logarithme y laisse un résidu que
  le test lit comme une instabilité.
- **Oscillation très lente** : `x² + sin(x/10⁶)` est vue comme `y = x²`. Les
  sondes plafonnent à 137 299 pour une période de 6,3e6. Inévitable avec des
  sondes fixes.

## Seconde passe de revue — quatre régressions, dont deux de mes correctifs

L'auditeur a rejoué ~21 000 fonctions. F1, F3, F5 confirmés clos, F2 assumé.
Mais deux de mes corrections avaient créé pire que ce qu'elles réparaient.

- **Le garde anti-constante tuait `tanh` et `exp(−x²)`.** `tanh(17)` vaut 1 à
  3,4e-15 près : un garde qui ne sonde qu'au loin conclut que la fonction EST
  la constante et supprime l'asymptote — **la famille même que ce chantier
  voulait servir**. `atan` et la sigmoïde survivaient par hasard, parce
  qu'elles convergent plus lentement : le garde discriminait sur la vitesse de
  convergence, pas sur la constance. On sonde désormais aussi **près de
  l'origine** (`tanh(1) = 0,76` tranche), et chaque direction est jugée
  séparément — la demi-constante `x < 0 ? null : 3` échappait au garde.
- **Le critère de convergence ouvrait 9 % de faux positifs sur les
  oscillations.** Avec trois échelles il ne restait qu'**un seul** rapport
  d'écarts à vérifier, et une suite quasi aléatoire le franchit souvent.
  Reproduction ronde : `x² + 3cos(x)` recevait une asymptote `y = x² + 5,656`,
  alors qu'elle oscille de ±3 indéfiniment. Cinq échelles désormais, et **deux
  resserrements consécutifs** exigés.
- **Le seuil du coefficient dominant comparait des grandeurs incomparables.**
  Des coefficients n'ont pas la même dimension : 5e-5 devant x² pèse plus que
  10 devant x dès que x dépasse 200 000. On compare maintenant leurs
  **contributions** à l'abscisse de sonde. Et le plancher `Math.max(…, 1)`
  ramenait le seuil relatif à un seuil absolu dès que tout est petit.

### Le libellé était inatteignable

Signalé par David en testant : rien ne s'affiche au survol. En effet — le
libellé vivait dans un `<title>` SVG, et la couche entière est en
`pointer-events="none"`, comme toutes les décorations du grapheur. L'infobulle
**ne pouvait jamais se déclencher**, et je l'avais annoncée sans la tester.

Décision de David : **étiquette permanente**. Elle réutilise `GraphLabel`, la
boîte déjà employée par le survol et les étiquettes épinglées, et rend le
**LaTeX** : l'élève lit `y = x² + 3x + 2` et non `y = x^2 + 3.00x + 2.00`. Les
étiquettes qui partagent une bande horizontale s'empilent.
