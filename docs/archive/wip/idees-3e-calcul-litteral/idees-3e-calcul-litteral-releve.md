# Relevé « calcul littéral, équations » de Troisième (en cours, 2026-11-23)

Chantier [`idees-3e-calcul-litteral`](idees-3e-calcul-litteral-progress.md). 47 exercices d'une
autre plateforme (codes 3L10 à 3L16, anciennes versions exclues), lus dans leur code source par
quatre agents. Verdicts face à nos modèles : § Verdicts, en fin de fichier ; fiches de phase 0 dans le
journal.

## Notes de lecture brutes

### Lot A (3L10 à 3L11-5), lu le 2026-11-23

Communs : saisie libre en une ou plusieurs lignes d'étapes (`'etapes'` : chaque étape vérifiée,
la dernière réduite) ; entiers relatifs non nuls seulement ; lettre souvent tirée (x, y, z, a, b, c).

- **3L10** — Supprimer les parenthèses puis réduire : `±(ax+b)`, `±(ax²+bx+c)`, sommes et différences
  de deux parenthèses (degré 1 ou 2, 10 cas). a, b ∈ [−9 ; 9], c à f ∈ [−11 ; 11]. Réponse réduite.
- **3L10-1** — k ± (ax + b) et kx ± (ax + b). k ∈ [−11 ; 11], a, b ∈ [−9 ; 9]. Réponse réduite (ax,
  constante seule possible).
- **3L10-2** — 3L10 réduit aux cas 5 à 10 (deux parenthèses).
- **3L11** — Simple distributivité : `k(ax+b)`, `(ax+b)k`, `kx(ax+b)`, `(ax+b)kx`, `k(ax+b)+c`,
  `c+k(ax+b)`. k ∈ [2 ; 11] (signé au niveau 3), a, b, c ∈ [1 ; 9] distincts, signés dès le niveau 2.
  Consigne « Développer » (forme développée non réduite attendue, `k × ax + k × b`) ou « Développer
  et réduire » (réduite exigée).
- **3L11-0** — `c(ax+b)`, `(ax+b)c`, `cx(ax+b)`, `(ax+b)cx` ; signes de a, b, c réglables. a, b ∈
  [1 ; 9], c ∈ [2 ; 9]. Réduite exigée.
- **3L11-1** — Double distributivité : `(x+b)(x+d)`, `(ax+b)(cx+d)`, `(ax−b)(cx+d)`, `(ax−b)(cx−d)`.
  a, b, c, d ∈ [2 ; 9] (c ≠ a, d ≠ b) ; `(x+b)(x+d)` : b ∈ [2 ; 10], d ∈ [2 ; 12]. Réduite exigée.
  Terme en x nul possible (ad = bc).
- **3L11-1b** — `(ax+b)(cx+d)`, signes réglables, valeurs ∈ [1 ; 9]. Réduite exigée, étapes.
- **3L11-2** — Réduire si possible : `ax+b` (déjà réduit), `ax+bx`, `ax+bx²` (déjà réduit), `ax×b`,
  `b×ax`, `ax+b+cx+d`, `b+ax+d+cx`, `ax+b+x`, `ax×bx`. Valeurs ∈ [−11 ; 11]. Réduite exigée ;
  résultat 0 ou constante seule possible.
- **3L11-3** — Distributivité et réduction : `cx+e(ax+b)`, `ex+(ax+b)(cx+d)`, `e+(ax+b)(cx+d)`,
  `e−(ax+b)(cx+d)`, `(ax×b)(cx+d)`, `e(ax+b)−(d+cx)`, `k(ax+b)(cx+d)`. Valeurs ∈ [−11 ; 11] ;
  k ∈ {−3, −2, 2, 3}.
- **3L11-3b** — P ± Q, P et Q parmi `c(ax+b)`, `cx(ax+b)`, `(cx+d)(ax+b)`. Valeurs ∈ [−9 ; 9].
  Réduite exigée, étapes. Correction : signe et grandes parenthèses autour de Q mis en évidence.
- **3L11-4** — Factoriser : `ka + nkb` (7a + 21b), `nka ± mkb` (14a + 21b), `nkx ± mkx²`,
  `nx² + x`, `nx² + mx`. k ∈ {2, 3, 5, 7, 11}, (n, m) premiers entre eux de 2 à 10. Par défaut une
  seule lettre (7a + 21). Jugé « factorisé ».
- **3L11-5** — Calcul mental par la distributivité ou une identité remarquable : 103², 98², 302 × 298
  (a·10 ou a·100 ± b, a ∈ [2 ; 9], b ∈ [1 ; 4] pour les carrés, [1 ; 9] pour le produit). Réponse
  numérique. Correction : les deux méthodes côte à côte.

### Lot B (3L11-6 à 3L11-17), lu le 2026-11-23

- **3L11-6** — Factoriser avec un facteur commun apparent : `c(ax+b) ± x(ax+b)`, `(ax+b)(cx+d) ±
(ax+b)(ex+f)` (4 ordres des facteurs). a ∈ [1 ; 3], b ∈ ±[1 ; 5], c ∈ [2 ; 5], d ∈ ±[2 ; 5],
  e ∈ [1 ; 6], f ∈ ±[1 ; 5]. Jugé « factorisé » (égal, pas une somme). Correction : facteur commun
  en vert.
- **3L11-7** — `(ax+b)²`, `(b+ax)²`, `(ax−b)²`, `(b−ax)²` par la double distributivité ; a, b ∈
  [1 ; 11], lettre tirée. Jugement laxiste (une forme non développée passe).
- **3L11-8** — Yohaku multiplicatif 2 × 2 : cases `ax+b` (a, b ∈ [1 ; 10]), produits des lignes et
  des colonnes donnés ; remplir la grille (plusieurs solutions). Seuls les produits sont vérifiés.
- **3L11-9** — Rose multiplicative : valeurs `ax+b` autour d'un cercle, produits deux à deux à
  calculer (ou facteurs à retrouver). Figure en rose.
- **3L11-10** — Table de double distributivité : `(x+b)(x+d)`, `(ax±b)(cx±d)` ; a, b, c, d ∈ [2 ; 9].
  Table 2 × 2 à remplir, puis développement, puis développement réduit.
- **3L11-11** — Sommes de monômes à plusieurs lettres (x, y, z, a, b, c, k), degré 2 à 3,
  coefficients entiers [−10 ; 10] ou fractions ; réduite exigée, fractions irréductibles.
  (Programme suisse.)
- **3L11-12** — Produit de 2 ou 3 monômes à plusieurs lettres (ex. 3x²y × (−2xy³)) ; réduit exigé.
- **3L11-13** — `(P) + (Q)`, `(P) − (Q)`, `−(P) ± (Q)`, polynômes à plusieurs lettres, degré ≤ 3 ;
  réduit exigé.
- **3L11-14** — Distributivité simple et double sur des polynômes à 2 lettres, degré ≤ 2, signe
  moins devant possible ; réduit exigé.
- **3L11-15** — Identités remarquables : `(x±a)²`, `(x+a)(x−a)`, `(ax±by)²`, `(ax+by)(ax−by)` (et
  `(x+a)(x+b)`, suisse) ; coefficients [1 ; 10] ou fractions. Réduite exigée, sans ×.
- **3L11-16** — Identité à trous : `x² + …… + 9 = (……)²` ; trouver le terme central puis la forme
  factorisée ; `(x±a)²`, `(ax±b)²`, coefficients [1 ; 12] ou fractions.
- **3L11-17** — Table de simple distributivité `a(bx+c)`, `ax(bx+c)` (1 ligne, 2 colonnes) puis
  développement réduit sans ×.

### Lot C (3L12 à 3L13-5), lu le 2026-11-23

- **3L12** — Factoriser `x² − a²`, `b²x² − a²`, `(n/d)²x² − a²` ; a ∈ [1 ; 9], b ∈ [2 ; 9] premiers
  entre eux ; fraction n/d < 1, d ≤ 10. Jugé « factorisé » (produit égal, ordre libre).
- **3L12-1** — Développer `(L − a)(L + a)`, `(bL − a)(bL + a)`, `(n/d L − a)(n/d L + a)` ; lettre
  tirée ; a ∈ [1 ; 9]. Jugement laxiste (forme non développée acceptée).
- **3L12-2** — Factoriser par mise en évidence et/ou identité remarquable (dont « somme-produit »
  (x+s1)(x+s2), hors programme français), plusieurs lettres ; facteur extérieur ∈ {±2, ±3, ±5, −1}.
  Factorisation stricte : chaque facteur a le même nombre de termes que l'attendu.
- **3L12-3** — Factoriser par groupements (ax + ay + bx + by), plusieurs lettres. Hors programme
  français. Factorisation stricte.
- **3L12-4** — 3L12-2 avec la seule lettre x : facteur commun, identité, facteur commun puis
  identité (ex. 2x² − 18 = 2(x − 3)(x + 3)), somme-produit. Factorisation stricte.
- **3L13** — Équations du 1er degré (ax + b = 0, ax + b = c, ax = b, x + b = c, ax + b = cx + d,
  x/a = b, ax/b = c), coefficients ∈ ±[2 ; 13], solutions presque toujours fractionnaires. Saisie dans
  un « solveur » : l'élève écrit les équations successives, chaque ligne est contrôlée, conclusion
  x = fraction simplifiée.
- **3L13-0** — Mêmes formes, solutions entières (∈ [−9 ; 9] hors 0, ±1) ; une case « x = ».
- **3L13-1** — `ax + b = cx + d`, `k(ax + b) = cx + d`, `k − (ax + b) = cx + d` ; a, b, d ∈ ±[1 ; 9],
  k ∈ [2 ; 9] ; fractions fréquentes (case « solutions entières »). Solveur à étapes.
- **3L13-2** — Équation de proportion (x/b = a/c, b/x = c/a…), x = ab/c ; entiers, relatifs,
  décimaux ; inconnue parfois une longueur (GO, AB…). Solveur.
- **3L13-3** — 13 problèmes à mettre en équation : basket (paniers à 2 et 3 points), achats,
  polygone, deux programmes de calcul égaux, tarifs (inéquation), spectacle, triangle isocèle,
  Thalès (2), somme de nombres consécutifs, âges père / fils. Réponse numérique (avec unité pour les
  longueurs, liste pour consécutifs et âges). Figures pour isocèle et Thalès.
- **3L13-4** — Rectangle aux côtés en x : côtés opposés égaux (ax + b = cx + d) ou périmètre donné,
  puis aire. Figure du rectangle, réponse « Aire = … cm² ».
- **3L13-5** — Deux programmes de calcul équivalents ? Tester avec deux nombres (4 cases), puis
  exprimer chacun en x (2 cases) ; formes ax + b = a(x + b/a), (x + a)² = x² + 2ax + a²,
  (x + a)(x − a) = x² − a², (x + a)² − x², (x + a)² − a² = x(x + 2a). a, b ∈ ±[2 ; 5].

### Lot D (3L13-6 à 3L16), lu le 2026-11-23

- **3L13-6** — Problèmes résolus par une équation : parking (véhicules à 2 et 4 roues, total
  20-49), cinéma (adultes 50-89, enfants 30-59, prix enfant 4-9 €, écart 2-7 €), fleurs (trois
  sortes). Solution entière, une case numérique. Correction : « Soit x… », équation, résolution.
- **3L13-7** — Motifs itératifs (hérite d'un exercice de 4e) : 4 motifs dessinés ; nombre de formes
  du motif suivant, du motif 10, du 100, expression en n, puis numéro du motif qui utilise N formes
  (« plus grand motif construit avec 2026 formes » : partie entière de la solution). Cases numériques,
  expression en n jugée par calcul formel.
- **3L14** — Produit nul : `(x±b)(x+d)`, `(x±b)(cx+d)`, `(ax+b)(cx±d)` ; solutions entières
  (b, d ≤ 20 ; a, c ∈ [2 ; 6]) ou fractionnaires (a, c ∈ [2 ; 9]) ; jamais de solution double. Une
  case « sol1 ; sol2 », ordre libre, fractions simplifiées.
- **3L14DNB-0** — Brevet 2024 : programme de calcul et Scratch ; résultat pour un nombre, expression
  en x, vérifier `(x+a)(x−b)`, nombres donnant 0 (produit nul), compléter le Scratch. Aucune saisie.
- **3L14DNB-1** — Brevet 2024 : programme A (carré, ×2, + 2bx, − 2c) et programme B (Scratch,
  (x + x1)(x − x2)) ; résultat avec un départ négatif, choisir l'expression de B parmi trois,
  démontrer A = 2B. Aucune saisie.
- **3L14DNB-2** — Brevet 2024 : schéma à deux branches multipliées ; résultats pour deux départs,
  choisir les expressions justes parmi quatre (deux justes), départs donnant 0, développer et
  réduire. Aucune saisie ; schéma en boîtes et flèches.
- **3L15** — Second degré ramené au premier : `ax² + bx = 0`, `a²x² − b² = 0`, `a²x² = b²`,
  `(ax+b)² = 0`, `bcx² + a = bx(cx+d)`, `(ax+b)(cx+d) = acx²`. Niveau facile = positifs. Solutions
  fractionnaires possibles ; une case « x1 ; x2 ».
- **3L15-1** — x² = a : a = k² (k ≤ 20), a = carré d'une fraction (dénominateur ≤ 10), a non carré
  (2-50, réponse √a et −√a). Jamais sans solution. Une case « a ; −a ».
- **3L15-2** — ±(1 à 3)x² + c = 0 : solutions entières, fractionnaires ou en racine, **ou aucune**
  (saisir ∅). Une case, liste ou ∅.
- **3L15-3** — Synthèse : une question tirée parmi 3L13, 3L14, 3L15 selon un niveau (facile,
  moyen, difficile).
- **3L16** — Ratio d'un motif itératif (hérite de la 4e) : ratio « a : b : c » au rang suivant, au
  rang +2, puis au rang n (expressions en n). Une case par terme.

## Verdicts (2026-11-23)

Comparés aux modèles de prod (MCP, lecture seule, variations et variables lues) : les 18 modèles de
3e des points 3-008, 3-011 à 3-016, 3-054, 3-058 et « Réduire une somme » (sans point), plus les
voisins de 4e (4-022 à 4-025, 4-055, 4-070, 4-071, 4-081), de 5e (5-036, 5-039) et de 2de.
Bornes : `docs/systeme/programmes/bornes/cycle4.md`. En 3e, **aucun point d'équation du premier
degré** : ax + b = c, ax + b = cx + d et la mise en équation sont des points de 4e (4-024, 4-025,
4-071) ; une idée de leur 3e qui en relève va donc à un modèle de 4e. Fiches (F = variation d'un
modèle publié, N = modèle neuf) : journal, § Phase 0.

Vérifié dans leur code avant verdict : 3L15-2 fait bien saisir ∅ (`\emptyset`) ; 3L11-16 est un
texte à trous (`\ldots\ldots` remplacés par des champs).

| Id        | Nos modèles                                                                                        | Verdict                                                                                                 | Fiche  |
| --------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| 3L10      | c32ebff9 (3-011 : q·k ± (r·m + s), deux lettres différentes, sans réduire) ; 843c3186, aeb86af9    | 🟡 manque « supprimer les parenthèses **puis réduire** », la différence de deux parenthèses, le degré 2 | F1     |
| 3L10-1    | c32ebff9                                                                                           | 🟡 même manque (k ± (ax + b), kx ± (ax + b) réduits)                                                    | F1     |
| 3L10-2    | c32ebff9                                                                                           | 🟡 même manque (deux parenthèses)                                                                       | F1     |
| 3L11      | 54107079, 32a81f6f (4-022 : k(a + bx) dans les deux ordres, signés ; x(a + bx) avec x seul devant) | 🟡 manque kx(ax + b) avec k ≠ 1 et k(ax + b) + c                                                        | F2     |
| 3L11-0    | 54107079                                                                                           | 🟡 même manque                                                                                          | F2     |
| 3L11-1    | 1703620c (positifs), 9fefb94c (signés), 3-013                                                      | ✅                                                                                                      | —      |
| 3L11-1b   | 9fefb94c                                                                                           | ✅                                                                                                      | —      |
| 3L11-2    | 93a5f7a9 (3-012 : nombre × nombre × lettre) ; 77b82211 (deux lettres, degré 1)                     | 🟡 manque ax × bx = abx² et l'expression déjà réduite (ax + bx²)                                        | F3, F4 |
| 3L11-3    | 9fefb94c (double produit seul)                                                                     | ❌ développer **et réduire** une expression composée : e − (ax + b)(cx + d), k(ax + b)(cx + d)…         | N1     |
| 3L11-3b   | aucun                                                                                              | ❌ P ± Q, avec le signe moins devant un produit                                                         | N1     |
| 3L11-4    | 2120ce5f, d7f2568a, dac2e771, 11607586 (4-070, dont abx² + acx)                                    | ✅ (deux lettres 7a + 21b absentes, sans intérêt propre)                                                | —      |
| 3L11-5    | aucun                                                                                              | ❌ calculer 103², 98², 302 × 298 avec une identité remarquable                                          | N2     |
| 3L11-6    | dcaabf69 (3-054, 5 variations)                                                                     | 🟡 manque la forme d'entrée c(ax + b) ± x(ax + b) et le « moins » avec le facteur commun en second      | F5     |
| 3L11-7    | 18e2afca v2 à v4 ((ax ± b)², a ∈ [2 ; 5])                                                          | 🟡 manque l'ordre inversé (b − ax)², (b + ax)²                                                          | F6     |
| 3L11-8    | aucun                                                                                              | ❌ grille à contraintes (plusieurs solutions) : outil, même famille que le n° 53                        | —      |
| 3L11-9    | 1703620c, 9fefb94c                                                                                 | ✅ pour l'idée (des doubles produits) ; la rose est une forme, rien à reprendre                         | —      |
| 3L11-10   | aucun                                                                                              | ❌ développer avec un tableau 2 × 2 à remplir (nos tableaux ont des trous)                              | N3     |
| 3L11-11   | 77b82211 (degré 1)                                                                                 | 🟡 manque les termes en x² et en xy ; les coefficients fractionnaires (programme suisse) : rien         | F4     |
| 3L11-12   | 93a5f7a9                                                                                           | 🟡 manque le produit de monômes (exemple du BO (a²b) × (bc))                                            | F3     |
| 3L11-13   | c32ebff9                                                                                           | 🟡 (P) ± (Q) : même idée que 3L10                                                                       | F1     |
| 3L11-14   | 9fefb94c (une lettre)                                                                              | 🟡 deux lettres, (2x + 3y)(x − y) : une variation de N1, si David la veut                               | N1     |
| 3L11-15   | 18e2afca, 32cf5766, a6a6c491                                                                       | ✅ pour une lettre ; (ax + by)² : même variation à deux lettres que N1                                  | —      |
| 3L11-16   | aucun en 3e ; d1648508 (2de, 2-262)                                                                | ❌ factoriser a² ± 2ab + b² (au programme : 3-058, « les trois identités »), et l'identité à trous      | N4     |
| 3L11-17   | 54107079                                                                                           | 🟡 le tableau de simple distributivité                                                                  | F2     |
| 3L12      | ff8082bd (x² − a²), ff9bb2fb ((bx)² − a²)                                                          | ✅ (le coefficient fractionnaire est rare au collège : rien)                                            | —      |
| 3L12-1    | 32cf5766, a6a6c491, 18e2afca v4                                                                    | ✅                                                                                                      | —      |
| 3L12-2    | ff9bb2fb, dcaabf69                                                                                 | 🟡 facteur commun **puis** identité (2x² − 18) ; « somme-produit » hors programme : rien                | F7     |
| 3L12-3    | aucun                                                                                              | factorisation par groupements : hors programme → rien                                                   | —      |
| 3L12-4    | ff9bb2fb, dcaabf69                                                                                 | 🟡 même idée (facteur commun puis identité) ; le mélange des méthodes = une série, pas un modèle        | F7     |
| 3L13      | c81c5852 (4-024, solutions fractionnaires), dcf060e6, 53834a24, 779ee55a                           | 🟡 manque x/a = b et ax/b = c ; le « solveur » ligne par ligne = outil                                  | F8     |
| 3L13-0    | dcf060e6, c81c5852, e32c95b0                                                                       | ✅                                                                                                      | —      |
| 3L13-1    | 779ee55a, 8c173562 (4-025 : ax + b = cx + d seul) ; 834c734f v2 (2de)                              | 🟡 manque k(ax + b) = cx + d et k − (ax + b) = cx + d                                                   | F9     |
| 3L13-2    | 44a3062b (4-055, quatrième proportionnelle en tableau)                                             | 🟡 manque l'égalité de quotients écrite (x/4 = 3/5, 4/x = 5/3)                                          | F10    |
| 3L13-3    | 5e2db3d1 (4-071 : choisir l'équation parmi trois, 3 contextes)                                     | ❌ résoudre le problème jusqu'au nombre (âges, entiers consécutifs, basket, périmètre…)                 | N5     |
| 3L13-4    | aucun                                                                                              | ❌ rectangle aux côtés en x : même modèle                                                               | N5     |
| 3L13-5    | 43c4f21f v2, v3 (4-023, programmes A et B du premier degré), 15dd2a0f                              | 🟡 programmes équivalents **avec une identité remarquable** ((x + a)² − x²…) : 3e                       | N6     |
| 3L13-6    | 5e2db3d1                                                                                           | ❌ parking, cinéma, fleurs : même modèle                                                                | N5     |
| 3L13-7    | aucun                                                                                              | motifs itératifs : idée de 4e-5e, hors de cette rubrique → « Idées en attente »                         | —      |
| 3L14      | 2ab49a6f (3-015, 5 variations, solutions fractionnaires comprises)                                 | ✅                                                                                                      | —      |
| 3L14DNB-0 | 15dd2a0f, 43c4f21f, 2ab49a6f                                                                       | 🟡 rien à saisir chez eux ; l'idée « quels nombres de départ donnent 0 ? » (produit nul)                | F11    |
| 3L14DNB-1 | 43c4f21f                                                                                           | même idée que N6 (démontrer A = 2B)                                                                     | N6     |
| 3L14DNB-2 | 15dd2a0f                                                                                           | même idée que F11                                                                                       | F11    |
| 3L15      | 2ab49a6f v3 (x(ax + b) = 0), v4 (facteur commun puis produit nul)                                  | 🟡 manque ax² + bx = 0, a²x² − b² = 0, (ax + b)² = 0 ; les cas où x² s'élimine : rien (pas de point)    | F11    |
| 3L15-1    | 3806ee3d (3-008 : n² ≤ 144, a non carré ≤ 23, 0 ou négatif)                                        | 🟡 manque x² = carré d'une fraction (49/9)                                                              | F12    |
| 3L15-2    | 3806ee3d v2 (x² = −n → ∅)                                                                          | 🟡 manque kx² + c = 0 (se ramener à x² = a), ∅ compris                                                  | F12    |
| 3L15-3    | —                                                                                                  | synthèse tirée d'autres exercices : une série, pas un modèle                                            | —      |
| 3L16      | aucun                                                                                              | ratio d'un motif : avec 3L13-7, « Idées en attente »                                                    | —      |
| (3-017)   | aucun                                                                                              | analyse-synthèse non évaluable (décision de David, 2026-11-04) : rien                                   | —      |

Bilan (47 exercices + le point 3-017, recompté sur le tableau) : 9 ✅, 23 🟡, 9 ❌ (dont 3L11-8, un
outil), 7 sans verdict propre (hors programme, série, motifs, « même idée que »). Si tout est
oui : **6 modèles neufs** (N1 à N6) et des variations sur **12 modèles publiés** (F1 à F12).
