# Chantier `idees-6e-longueurs` — idées reprises d'ailleurs, rubrique « Longueurs » de 6e

## Reprendre ici

_Mis à jour le 2026-11-28, série publiée, #3269 (id de la série) en cours de merge._

- **État** : tout le lot est en prod (#3262, #3265, `db:migrate` vérifiés par MCP). David a publié la série de
  relecture `aa16caa1` (6 publiés complétés) ; id commité par #3269 (`pr:merger` lancé : vérifier `MERGED`, sinon
  la merger). Puis David : « je valide » (2026-11-28).
- **Prochaine action** : lire les verdicts en base (`question_template_reviews`, `reviewed_at` du 2026-11-28) pour
  les 6 brouillons et les 6 publiés ; si « je valide » couvre tout (à confirmer avec David si des verdicts manquent),
  `publier-lot.ts --dir scripts/questions/idees-6e-longueurs-neufs` en simulation, David `--publier` ; puis lever
  les réservations des 6 publiés, rubrique « publiée » dans `idees-ailleurs-repartition.md`, versement du journal.
- **En attente de David** : la commande `--publier` de `publier-lot.ts`, après la simulation.
- **Pièges en cours** : `conditions: []` écrase les conditions partagées ; le pre-commit laisse l'index d'une
  fixture JSON dans sa forme d'avant prettier (`MM`) : vérifier `git diff HEAD`, puis `git restore --staged`.
- **Worktree / branche** : `../ubumaths-wt-idees-6e-longueurs-serie` (`chore/idees-6e-longueurs-serie`, #3269),
  retiré par `pr:merger` au merge.

## Phase 0 (2026-11-27)

Page à cocher : https://claude.ai/artifact/6bCd5vw2yxYQ7pQvQUJ7uV (Oui / Non / Autrement + note, collection `verdicts`).

16 exercices lus : 6 ✅ ou couverts (dont 6M1autoD-1, hors rubrique), 7 🟡, 3 ❌. Question d'accès de la migration :
**personne ne gagne d'accès**, on range des modèles du prof et on ajoute des variations à des modèles publiés.

### Variations de modèles publiés

- **F1 — Périmètre du carré : figure codée, côté décimal** (2 variations ajoutées à 060086c8, 6-144). Chez eux
  (6M1autoE-1, 6M1autoE-2) : carré dessiné et coté, ou côté 2,2..11,9. Chez nous : texte seul, entiers 1 à 11.
  (h) carré dessiné, un seul côté coté (2..9 cm), les quatre côtés codés égaux ; (i) côté 2,2..11,9 cm, texte. Case
  à unité. Erreurs prévues : $2 \times c$, $c \times c$ (l'aire), $c + 4$ ; en (i) une virgule mal placée.
- **F2 — Périmètre du rectangle : figure codée, largeur décimale** (2 variations ajoutées à 66f9abbf, 6-199). Chez
  eux : rectangle dessiné et coté, ou 5,1..9,4 × 1,1..3,4. Chez nous : texte seul, entiers. (h) rectangle dessiné,
  longueur et largeur cotées une seule fois, côtés opposés codés (L 3..11, l 2..L − 1) ; (i) L 5,1..9,4 cm,
  l 1,1..3,4 cm. Erreurs prévues : $L + l$, $L \times l$, $2 \times L + l$.
- **F3 — Périmètre d'un cercle dessiné** (1 variation ajoutée à cfb4c692, 6-147). Chez eux (6M1C) : cercle dessiné,
  rayon ou diamètre tracé, r 2..9. Chez nous : texte seul. (c) cercle dessiné, rayon ou diamètre tracé et coté
  (r 2..9 cm), π ≈ 3,14. Erreurs prévues : le diamètre pris pour le rayon ($2 \times \pi \times D$), $\pi \times r$,
  $\pi \times r \times r$ (l'aire). La valeur exacte « 10π cm » de leur exercice reste hors bornes (6-147 : π ≈ 3,14).
- **F4 — Ce qu'est le nombre π** (1 variation ajoutée à 4343af4c, 6-145). Chez eux (6M1B) : « rappeler la
  définition de π », sans réponse. Chez nous : rien. (d) « Le nombre π est… » : case choix (le périmètre d'un cercle
  de diamètre 1 ; de rayon 1 ; le diamètre d'un cercle de périmètre 1 ; exactement 3,14). Leur forme est une phrase :
  le choix est la meilleure forme, la réponse ne se tape pas.
- **F5 — Écrire la formule du périmètre d'un disque** (2 variations ajoutées à ccb4f5e5, 6-146). Chez eux (6M1B) :
  formule écrite sur papier. Chez nous : case choix seulement. (c) « $P = ?$ » avec le diamètre $D$, saisie
  d'expression ($\pi \times D$, $D \times \pi$) ; (d) avec le rayon $R$ ($2 \times \pi \times R$, $2\pi R$,
  $\pi \times 2 \times R$). Erreurs prévues : $\pi \times R$, $\pi \times R \times R$, $2 \times \pi \times D$.
- **F6 — Figures composées : décimaux, triangle, demi-disque rentrant** (3 variations ajoutées à 60f165a8, 6-148).
  Chez eux (6M1D) : rectangle + demi-disque à côtés décimaux, rectangle + demi-disque + triangle rectangle. Chez
  nous : entiers, sans triangle. (d) rectangle prolongé d'un demi-disque, côtés à un chiffre après la virgule
  (4,1..8,9 × 3,2..7,8 cm) ; (e) rectangle, demi-disque d'un côté, triangle rectangle de l'autre (trois côtés donnés,
  3-4-5 ou 6-8-10) ; (f) rectangle dont on a retiré un demi-disque. π ≈ 3,14, arrondi au dixième, comme le modèle.
  Erreurs prévues : compter le diamètre intérieur, le cercle entier au lieu du demi-cercle, un côté oublié.

### Modèles neufs

- **N1 — Formules du périmètre du carré et du rectangle** (2 modèles neufs : 6-144 carré, 6-199 rectangle,
  3 variations chacun). Chez eux (6M1autoE-4, en option) : formules sur papier. Chez nous : 61ffb696 (5e) ; rien en
  6e. (a) « Écris la formule du périmètre $P$ : $P = ?$ », saisie d'expression ($4 \times c$, $c \times 4$,
  $c + c + c + c$ ; $2 \times (L + l)$, $2 \times L + 2 \times l$, $L + l + L + l$) ; (b) « Le périmètre d'un
  rectangle est égal au … de la somme de sa longueur et de sa largeur », case choix (double, triple, produit,
  carré) ; pour le carré « … à … fois son côté » ; (c) substitution : « $P = 2 \times (L + l)$. Calcule $P$ pour
  $L = 8$ cm et $l = 3$ cm », case à unité (BO : « substitue une valeur numérique à une lettre »). Erreurs prévues :
  $c \times c$, $2 \times c$ ; $L \times l$, $L + l$, $2 \times L + l$ ; 24 cm² (l'aire) en (c).
- **N2 — Périmètre d'une portion de disque** (modèle neuf, 6-148, 3 variations). Chez eux (6M1C-1) : quart,
  demi, trois-quarts de disque, figure cotée. Chez nous : rien (60f165a8 n'a que des assemblages avec un rectangle).
  (a) quart de disque de rayon 2..10 cm ; (b) demi-disque de diamètre 2..10 cm ; (c) trois-quarts de disque de rayon
  2..10 cm. Figure (arc + rayons), π ≈ 3,14, arrondi au dixième, case nombre, « cm » affiché. Erreurs prévues : l'arc
  seul (rayons ou diamètre oubliés), le cercle entier, le diamètre pris pour le rayon.
- **N3 — Comparer des périmètres sans mesurer** (modèle neuf, point : **Q1**, 3 variations). Chez eux (6M1autoE,
  12 cas) : rectangle hachuré superposé à une figure colorée, QCM « rectangle / figure / autant ». Chez nous : rien
  (CE2-043 n'a aucun modèle) ; l'aire, oui (9c9c7081, chantier `idees-6e-aires`). (a) une bosse ou un creux
  (demi-disque, triangle) sur un côté → la figure a le plus grand périmètre ; (b) une partie découpée et recollée
  de l'autre côté → même aire mais **périmètre plus grand** (l'erreur visée : « autant ») ; (c) polygone inscrit dans
  le rectangle → plus petit. Case choix à 3 (leur forme gardée : une comparaison ne se tape pas). Erreur prévue :
  « autant » en (b), avec le message « l'aire n'a pas changé, mais le contour est plus long ».
- **N4 — Le sens des préfixes** (modèle neuf, point : **Q2**, 4 variations). Chez eux (6M1autoA-1) : préfixe ↔
  calcul en liste déroulante. Chez nous : 0720f9de (CM1) relie le symbole et le nom, jamais le sens ; le BO de 6e le
  demande (« fait le lien avec les unités de numération »). (a) « kilo veut dire… » (mille, cent, dix, un millième ;
  et hecto, déca, déci, centi, milli) : case choix ; (b) « 1 cm est un … de mètre » (dixième, centième, millième,
  centaine) : case choix ; (c) « 1 mm = ? m », $\frac{1}{1000}$ ou 0,001 acceptés (et cm, dm) ; (d) « 1 m = ? km »,
  $\frac{1}{1000}$ ou 0,001 (et hm, dam). Erreurs prévues : « cent » pour kilo, « un centième » pour milli, 1 000
  pour 1 mm en m, 0,01 pour 1 m en km.
- **N5 — Convertir en mètre, et du mètre vers une autre unité** (modèle neuf, point : **Q2**, 4 variations). Chez
  eux (6M1autoC, 6M1autoC-1) : 1..9, 10..90, 100..900, 11..99, décimaux. Chez nous : c31c9d95 et 7a90fc45 (6e,
  sans point) tirent a de 1 à 9 ; e22cff99 (CM1) fait cm → m et m → cm. C'est la phrase du BO de 6e : « convertir
  en mètre une longueur donnée dans une autre unité… inversement ». (a) a dam, hm, km → m (a dans 10..90, 100..900,
  11..99 : 45 hm = 4 500 m) ; (b) a dm, cm, mm → m (320 cm = 3,2 m ; 45 mm = 0,045 m) ; (c) a m → dam, hm, km
  (450 m = 0,45 km ; 7 m = 0,007 km) ; (d) décimaux vers le mètre (3,7 dm ; 0,05 km ; 12,4 hm). Une case nombre,
  unité donnée. Erreurs prévues : le mauvais sens (450 000 km), un rang de trop ou de moins (4,5 km, 0,045 km),
  0,45 m pour 45 mm.

### Laissé (rien)

- 6M1autoA (1 hm = ? m) : 7a90fc45 et da2e705f. 6M1autoE-3 (carré, rectangle, triangle aux trois côtés donnés,
  texte) : 060086c8, 66f9abbf, 3a6017c8. 6M1autoE-4 (formules d'aire) : chantier `idees-6e-aires`. 6M1autoE-XXX : pas
  publié chez eux, comme 6M1autoE-1 (F1, F2). 6M1D-1 (décomposer, rien à saisir) : le corrigé de 60f165a8 décompose
  déjà. 6M1autoD-1 (placer une fraction) : hors rubrique, 0a21fe2f (6-128). Valeur exacte « kπ » (6M1autoE-2,
  6M1C) : hors bornes de 6-147.

### Questions

- **Q1 — Point de N3 (comparer des périmètres sans mesurer).** L'automatisme de 6e le plus proche est CE2-043
  (« comparer le périmètre de plusieurs polygones sans règle graduée, en utilisant un compas ») : polygones et compas,
  pas de demi-disques. Recommandation : modèle de **6e**, point **6-148** (contours composés de segments et
  d'arcs).
- **Q2 — Point de N4 et N5 (préfixes, conversions).** Aucun point de 6e : ces automatismes de 6e sont rangés sur
  CM1-067 et CM1-068, et nos modèles de 6e qui convertissent (c31c9d95, 7a90fc45) sont sans point. Les plages
  (0,045 m ; 0,007 km ; $\frac{1}{1000}$) dépassent les bornes de CM1-068 (deux chiffres après la virgule).
  Recommandation : modèles de **6e sans point**, comme c31c9d95. Autre choix : niveaux CM1 et 6e, point CM1-067 ou
  CM1-068, plages réduites à deux chiffres après la virgule.

## Historique

- 2026-11-28 : David publie la série `aa16caa1` (id → #3269), puis « je valide ».

- 2026-11-28 : #3265 mergée, `db:migrate`, fdd849f5 vérifié par MCP (variation n° 8 `["a>b"]`, 9 variations) ;
  réservation de fdd849f5 levée.

- 2026-11-28 : #3262 mergée, `db:migrate` (2 migrations), vérifié par MCP. David : « je te suis » sur fdd849f5 →
  migration de contenu `20261127235012_…_correction_contenu.sql` (variation n° 8 seule), 335 verts, rouge sans
  elle ; série de relecture des 6 publiés simulée en prod.

- 2026-11-28 : niveaux relevés en prod (inchangés), migrations de rangement et de contenu générées ;
  `migrations-rangement-tags` et `migrations-contenu-publie` : 511 verts, rouges sans les migrations ;
  `security-auditor` : aucun finding bloquant (seul le texte générique du rollback parle de niveaux).

- 2026-11-28 : David lance `create-questions --publier` : 6 brouillons en prod, vérifiés par MCP.

- 2026-11-27 : #3254 mergée (fichiers du lot seuls, CI verte).

- 2026-11-27 : lot écrit par deux agents (Opus), relu. Neufs : N1 carré et rectangle (6-144, 6-199), N2 et N3
  (6-148), N4 et N5 (6e sans point, nœud « unités simples » comme c31c9d95) ; 111 specs vertes, sonde des figures
  sans problème, 6 brouillons essayés en base locale. Publiés : 060086c8 +2, 66f9abbf +2, cfb4c692 +1,
  4343af4c +1, ccb4f5e5 +2, 60f165a8 +3 ; 109 specs vertes. Écarts : les cases choix ne portent pas d'erreurs
  prévues (messages dans le corrigé) ; N5 garde leurs plages (multiples de 10 et de 100, 11..99) ; N5 (d) sans
  décimal en mm (0,0046 m) ; ccb4f5e5 `constraints.products: off` (sinon π × D jugé « non optimal »), comme
  61ffb696. **Bogue trouvé en prod, chantier `idees-6e-aires`** : fdd849f5 variation 7 (rectangle dessiné,
  a 3..11, b 2..10) a `conditions: []`, ce qui annule le `a>b` partagé : la largeur peut dépasser la longueur.
- 2026-11-27 : David répond « je te suis » aux recommandations (toutes les fiches oui ; Q1 : N3 sur 6-148 ;
  Q2 : N4 et N5 modèles de 6e sans point). Modèles 060086c8, 4343af4c, 60f165a8, 66f9abbf, ccb4f5e5, cfb4c692
  réservés (b871d0f3ac).
- 2026-11-27 : rubrique prise (9d73c269a9), relevé par deux agents Sonnet, plages recoupées dans le code, nos
  modèles relevés en prod ; phase 0 écrite.
