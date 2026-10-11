# Relecture du dictionnaire contre les programmes officiels (2026-10-09)

Demandée par David : vérifier `src/lib/data/math-dictionary-fr.ts` **en lisant** les programmes du
BO, pas par mots-clés. Détail terme par terme : [relecture-bo-detail.md](relecture-bo-detail.md) ;
données complètes avec toutes les citations : [relecture-bo.json](relecture-bo.json).

## Décor

- **Textes lus en entier**, six portées en parallèle (un agent chacune) : cycle 2 (Annexe 4 +
  livrets CP, CE1, CE2) · cycle 3 (programme + livrets CM1, CM2, 6e) · cycle 4 (Annexe 2, BO n° 10
  du 5 mars 2026 ; **pas** les documents eduscol 2019 de l'ancien programme) · 2de + 1re spé ·
  Tle spé + Tle comp. + Maths expertes (annexe fournie par David le 2026-10-09) · 1re ens. sci.
  - 1re techno + Tle techno. Chaque agent a lu aussi les 417 entrées du dictionnaire.
- Règle d'apparition : le mot **dans son sens mathématique**, employé avec l'élève (pas « en
  fonction de », pas « la suite orale des nombres », pas un paragraphe adressé au professeur).
  Fusion : la première apparition, tous programmes de la voie générale confondus, l'emporte.
- **Citations vérifiées** : 1 832 citations du BO ; 1 809 retrouvées mot pour mot dans les
  textes ; les 23 autres sont dans des tableaux à deux colonnes que l'extraction entrelace (3
  contrôlées à la main). Cinq constats recoupés à la main : combinaison, convexe, extremum,
  calculatrice exclue au cycle 2 (`c2.txt` l. 295), « aucune formule n'est enseignée » (`c2.txt`
  l. 1934).
- Les verdicts de définition sont des jugements d'agent : à relire, pas à appliquer tels quels.

## Constat n° 1 — un bug, pas 205 erreurs

**Le niveau des définitions est décalé d'une entrée** : pour 367 des 374 entrées qui ont une
définition, `definitions.items[0].grade` vaut le niveau de l'entrée **précédente** (aucune ne
porte un troisième niveau). Introduit par le refactor `b5ad54933` (2026-04-19, passage au
`GradedField`) : avant, « moyenne » était au niveau 6 ; après, sa définition est rangée en T_SPE.
Conséquence : des termes sans définition visible à leur niveau (cercle visible en 3e, médiatrice
en 5e, probabilité en T_SPE). Les « 89 définitions invisibles » et « 116 définitions antérieures »
de l'état des lieux viennent de là. **Correction mécanique** : remettre chaque définition au
niveau de son terme ; le test « première définition au niveau du terme » l'aurait attrapé.

## Niveaux d'apparition (367 termes principaux)

| Accord | Dictionnaire trop tard | Dictionnaire trop tôt | Absent des programmes (voie gén.) |
| ------ | ---------------------- | --------------------- | --------------------------------- |
| 145    | 108                    | 89                    | 25 (dont 2 vus en voie techno)    |

96 écarts d'au moins deux niveaux. Les plus nets : solides (cube, cône, cylindre, pavé, face,
arête) dès le CP-CE1 ; fraction, numérateur, dénominateur au CE1 ; probabilités (expérience
aléatoire, issue, équiprobabilité) et division euclidienne au CM1 ; calcul littéral (équation,
inconnue, développer, factoriser) en 5e ; ensembles et contraposée en 4e ; exponentielle et limite
en 1re. À l'inverse, **exclusions explicites du BO** : calculatrice au cycle 2, tableau de
proportionnalité et produit en croix au cycle 3, pourcentages « plus abordés au cours moyen ».

Plusieurs « trop tard » sont des **sens plus simples du même mot** (suite de symboles au CP, rang
dans une file, somme d'argent) : ils appellent une **définition de plus, de niveau inférieur**,
pas un déplacement du terme — c'est exactement la définition par niveau.

**Absents de tout programme de la voie générale** : rotation, homothétie, PPCM, monôme,
troncature, produit en croix, hypoténuse (le mot n'est plus dans le cycle 4 de 2026), octogone,
convention, base (de puissance), série (somme d'une suite), partie décimale, ellipse, le
vocabulaire du chiffrement, et « shisma » (intervalle musical, hérité de Mathémo).

## Définitions (346 termes jugés, 131 avec au moins un défaut)

- **Fausses (14)** : nombre relatif (réduit à ℤ), inconnue (confondue avec la solution), surface
  (« synonyme d'aire »), proportion (« égalité de deux rapports » ≠ part d'un tout), exposant (« la
  base multipliée par elle-même n fois »), ordonnée à l'origine, extremum (« f′(a) = 0 »),
  exponentielle (sans f(0) = 1), combinaison (un nombre ≠ une partie), norme, convexe et concave
  (inversées pour une fonction), propriété (« démontrée » ≠ « admise ou démontrée »), shisma.
- **Circulaires (10)** : addition / soustraction / multiplication / division ↔ somme / différence
  / produit / quotient ; dérivée ↔ nombre dérivé ↔ tangente ; symétries ; coefficient directeur.
- **Inadaptées au niveau (73)** : lettres avant le cycle 4 (« Ce n'est qu'au cycle 4 que les
  lettres seront introduites de manière formelle »), division pour définir moitié / pair / quart
  avant le CE2, degrés pour les angles du cycle 2, formule du périmètre, formalisme écarté par le
  BO (« On s'abstient de tout formalisme »).
- **Trop étroites (34) / trop larges (14)** : surtout des **homonymes** — au clic, l'élève
  obtiendrait l'autre sens : racine (d'un polynôme), premier (degré), base (de vecteurs),
  réciproque (fonction), série (statistique), image (complexe), cube (le solide), croissant
  (ordre croissant), quotient (exact a/b en 6e), sommet / arête / degré (graphes), suite
  arithmétique → « arithmétique », logarithme décimal → « décimal ».

## Vocabulaire du BO absent (471 expressions, dédoublonnage approximatif)

Par niveau d'apparition : CP 26 · CE1 12 · CE2 7 · CM1 34 · CM2 11 · 6e 26 · 5e 27 · 4e 18 · 3e
17 · 2de 56 · 1re spé 29 · Tle spé 71 · Tle comp. 17 · Expertes 46 · 1re ens. sci. 19 · 1re techno
34 · Tle techno 21. Exemples : boule, disque, contenance, unités (g, kg, L, h, min) ; corde,
angle plat, « une chance sur deux », programme de calcul ; demi-tour, priorités opératoires,
algorithme, boucle ; nombre réel, discriminant, forme canonique, colinéarité, probabilité
conditionnelle ; nombres complexes, graphes, matrices, loi binomiale, récurrence.

## Élèves concernés aujourd'hui (prod, comptes élèves approuvés par niveau)

6e 37 · 1re générale (`1_GEN`, maths de l'enseignement scientifique) 19 · Tle spé 17 · 2de 4 ·
1re spé 1 · sans niveau 2. Aucun élève du CP au CM2. **Le dictionnaire ne classe aucun terme en
`1_GEN`** : ces 19 élèves ne voient que le vocabulaire jusqu'à la 2de.

## Signalé hors sujet

Six libellés de points 1re spé introuvables tels quels dans le texte du BO (1SPE-221, 243, 247,
250, 354, 364) — à vérifier par la session « arbre » (peut-être les points gardés exprès, ou
reformulés par la passe « points vagues »).
