# Chantier « monnaie » — bloc ubumark ` ```monnaie `

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0 écrite._

- **État** : phase 0 écrite (§ 1 à 9) ; questions Q1 à Q11 posées à David (§ 10). Aucun code.
- **Prochaine action** : réponses de David → PR 1 (scène commune, § 8) : tests rouges → extraction → collection verte.
- **En attente de David** : go de phase 0 et Q1 à Q11 (§ 10).
- **Pièges en cours** : la scène est partagée avec ` ```collection ` (EN PAUSE, `collection-progress.md`) : ses tests doivent rester verts, sans un pixel changé.
- **Worktree / branche** : `../ubumaths-wt-monnaie` · `feat/monnaie`.

---

## 1. Origine et périmètre

Issu du chantier « questions » (`questions-progress.md` § 2 : monnaie → 042-045, 071 ; § 3, outil 3 ;
§ 4 bis, décision 1 : la monnaie **bâtie sur** la collection) et de la décision 8 de
`collection-progress.md` (bloc séparé qui partage la scène). Code calqué sur ` ```collection `
(#1766, #1770). Les décisions de la collection (§ 8 bis) valent par défaut : v1 en affichage seul,
réponse dans une case nombre ou un QCM, PDF, choix de QCM, éditeur riche, `check:ubumark`, doc
`ubumark.md`.

**Points CP visés** (bornes : `docs/systeme/programmes/bornes/cycle2.md`) : montants entiers d'euros
≤ 100, pas de centimes ; « pièces et billets fictifs (au moins pièces de 1 € et billets de 10 €) ».

| Point  | Libellé (abrégé)                                   | En v1 (affichage + case ou QCM)                                                      |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| CP-043 | Valeur en euros d'un ensemble de pièces et billets | **oui** : « Combien d'euros ? » → case nombre                                        |
| CP-042 | Comparer les valeurs de deux ensembles             | **oui** : QCM A / B / Autant ; **la valeur, pas le nombre de pièces** (BO)           |
| CP-044 | Constituer une somme donnée                        | **en partie** : QCM d'ensembles, « combien manque-t-il ? » (§ 4) ; vrai = construire |
| CP-071 | Rendre la monnaie                                  | **en partie** : « combien rend-on ? » (case), « que rend-on ? » (QCM d'ensembles)    |
| CP-045 | Simuler des achats en manipulant                   | **non** (manipulation) ; seul « peut-il acheter ? » en QCM, qui est au fond CP-042   |

**Plus tard (CE1, CE2)** — la syntaxe doit les accueillir sans refonte (§ 3, clés réservées) :

| Point            | Ce qu'il demande au bloc                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| CE1-053, 058     | lien euros / centimes, écriture à virgule : surtout du texte ; le bloc illustre        |
| CE1-054, 055     | comparer, valeur d'un ensemble **en euros et centimes** : pièces de 1 c à 50 c         |
| CE1-056          | constituer une somme avec centimes ; contrainte « pas de pièce de 1 € (10, 20, 50 c) » |
| CE1-057, CE2-054 | simuler des achats (manipulation) : lot « construire »                                 |
| CE1-086, CE2-080 | rendre la monnaie ; CE2 : « par ajouts successifs (5 € pour 3,68 € : 32 c puis 1 €) »  |
| CE2-055, 056     | additions / soustractions **posées** de montants : ` ```operation `, pas ce bloc       |

Bornes qui changent au CE1 : montants jusqu'à **1 000 €** (décision c2-1), écriture à virgule dès la
période 3 → le plafond « 100 € » de la v1 est celui du CP, pas une limite du bloc ; les centimes et le
billet de 200 € viendront avec un lot CE1.

**Hors périmètre** : les modèles de question (session « questions ») ; le lot « construire » ; le chat
élève (liste blanche).

## 2. Ce que voit l'enfant (affichage seul, comme la collection en v1)

Dessins SVG **stylisés** (Q1 : aucun élément graphique des vrais billets ni des faces des pièces),
une couleur d'accent :

- **Pièce** : disque marqué « 1 € » ou « 2 € » ; la pièce de 2 € a un anneau (deux teintes de
  l'accent) et est plus grande — l'enfant les distingue sans lire, comme les vraies.
- **Billet** : rectangle arrondi, valeur en gros (« 10 € ») et répétée en petit dans deux coins ;
  **plus la valeur est grande, plus le billet est long** (comme les vrais, sans leurs proportions
  exactes). Chiffre lisible à 390 px.
- **Disposition** : billets en haut, pièces dessous ; `rangé` (triés, le plus grand d'abord, billets
  en ligne, pièces en rangées) ou `mélangé` (billets dans un ordre tiré, pièces éparpillées comme le
  vrac de la collection).

### Nominal

1. CP-043 : un billet de 20 €, deux de 10 €, trois pièces de 2 € et une de 1 €. « Combien d'argent ? » → 47.
2. CP-043, `mélangé` : mêmes coupures dans le désordre — l'enfant regroupe lui-même (difficulté voulue).
3. CP-042 : A = 10 pièces de 1 €, B = 1 billet de 10 € → « Qui a le plus d'argent ? » → **Autant**
   (piège du BO : 10 objets contre 1).
4. CP-042 : A = 3 billets de 5 €, B = 1 billet de 20 € → B (moins d'objets, plus d'argent).
5. CP-071 : « Le livre coûte 13 €. Léo donne : » + bloc (un billet de 20 €) → « Combien le marchand
   rend-il ? » → 7.
6. CP-044 en QCM : « Quel porte-monnaie contient exactement 48 € ? » → quatre choix, chacun un bloc
   réduit (3 cm, comme les collections dans un QCM), à l'écran, dans la correction et au PDF.
7. Marquage au doigt (repris de la collection) : toucher une pièce ou un billet le barre ; aide non
   jugée, rien d'enregistré ; « Effacer les marques ».
8. Même bloc → même dessin, à l'écran comme au PDF.

### Limites

9. Ensemble vide (0 €) : cadre vide étiqueté — « Tom n'a rien ».
10. 100 € : un billet de 100 €, ou 50 + 20 + 20 + 10 ; 30 objets au plus par ensemble (Q5).
11. Un seul billet sans pièce, des pièces sans billet : acceptés.
12. `montant: 48` (Q4) : décomposition déterministe « le moins d'objets » (20 20 5 2 1), vérifiée égale au montant.
13. Trois ensembles (« Qui a le plus ? » entre trois enfants) : l'un sous l'autre à 390 px, côte à côte sur tablette.

### Erreurs

- **Vu de l'enfant** : bloc en erreur → cadre neutre « Monnaie indisponible » ; **jamais le total dans
  le DOM** (nom accessible « Pièces et billets », pas « 47 euros »). Les valeurs écrites sur chaque
  coupure restent visibles (l'enfant doit les lire) ; seul le total est caché.
- **Vu de l'enfant qui se trompe** : la correction montre la réponse et le même dessin.
- **Vu du prof** (`Ligne N : …`, aussi par `check:ubumark`) : rien à dessiner ; coupure inconnue
  (« 3 € n'existe pas ; pièces : 1, 2 ; billets : 5, 10, 20, 50, 100 ») ; pièce écrite en billet ou
  l'inverse (« 5 € est un billet ») ; centimes (`50c`) : « pas encore disponible » ; quantité non
  entière, négative ou variable non résolue ; total > 100 € ; plus de 30 objets ; clé inconnue ou
  répétée ; nombre d'ensembles différent d'une ligne à l'autre ; plus de 3 ensembles ; `montant:` mêlé
  à `billets:` / `pièces:`.

## 3. Syntaxe (proposition, Q3 et Q4)

Clés en français, une par ligne ; plusieurs ensembles séparés par `;`, comme ` ```collection `.
Les valeurs sont **en euros** ; les centimes s'écriront plus tard avec un `c` (`50c`), sans rien
changer au reste — c'est la porte de l'extension CE1.

| Clé            | Valeurs                                  | Défaut      | Effet                                            |
| -------------- | ---------------------------------------- | ----------- | ------------------------------------------------ |
| `billets:`     | liste `20 10 10`, ou comptée `2×10 1×20` | aucun       | billets dessinés                                 |
| `pièces:`      | liste `2 2 1`, ou comptée `3×2 1×1`      | aucune      | pièces dessinées                                 |
| `montant:`     | 0 à 100 (Q4)                             | —           | le bloc choisit les coupures (le moins d'objets) |
| `disposition:` | `rangé` · `mélangé`                      | `rangé`     | tri par valeur, ou ordre et place tirés          |
| `légendes:`    | texte ; texte                            | A ; B ; C   | étiquettes (plusieurs ensembles seulement)       |
| `taille:`      | `2cm` à `12cm`                           | 8 cm / 3 cm | comme la collection (8 cm, 3 cm dans un QCM)     |

`x` et `*` acceptés pour `×` (clavier). `0×10` admis (un modèle qui tire `{{n}}` = 0). Réservés
(« pas encore disponible ») : centimes `c`, billets de 200 et 500 €.

**Exemple 1 — CP-043**, avec `b = {{1..4}}`, `p = {{0..4}}`, `u = {{0..1}}`, réponse `{{eval:10*b+2*p+u}}` :

````text
Combien d'argent y a-t-il ?

```monnaie
billets: {{b}}×10
pièces: {{p}}×2 {{u}}×1
disposition: mélangé
```
````

**Exemple 2 — CP-042** (QCM « Léa », « Tom », « Autant », bon choix par `{{if:…}}`) :

````text
Qui a le plus d'argent ?

```monnaie
billets: ; 1×10
pièces: 10×1 ;
légendes: Léa ; Tom
```
````

**Exemple 3 — CP-044** (QCM d'ensembles). Énoncé : « Quel porte-monnaie contient exactement 48 € ? » ;
chaque **choix** du QCM est un bloc à lui seul (comme les choix en horloge ou en collection), réduit à
3 cm. Le bon choix :

````text
```monnaie
billets: 20 20 5
pièces: 2 1
```
````

Les autres : `billets: 20 20 5` + `pièces: 2` (47 €, une pièce oubliée) ; `billets: 50 20 10` +
`pièces: 2 2` (84 €, chiffres inversés) ; `billets: 20 10 10 5` + `pièces: 2` (47 €, le même nombre
d'objets que le bon). Variante contrainte du BO : quatre choix à 48 €, un seul « sans pièce de 1 € ».

## 4. Évaluer sans interaction (CP-044, CP-071, CP-045)

v1 = affichage seul : l'élève **lit** des ensembles, il n'en **fabrique** pas. Ce qui se juge déjà :

- **CP-044 « constituer »** : (a) QCM d'ensembles (exemple 3) — reconnaître la bonne constitution ;
  (b) contraintes du BO en QCM : « sans pièce de 1 € » ou « avec le moins de pièces et de billets » →
  plusieurs choix valent 48 €, un seul respecte la contrainte ; (c) case nombre « Léa a ceci ; il lui
  faut 48 €. Combien de pièces de 2 € doit-elle ajouter ? ».
- **CP-071 « rendre »** : (a) case nombre « combien rend-on ? » (nominal 5) ; (b) QCM « quelle monnaie
  le marchand rend-il ? » dont les choix sont des ensembles ; (c) `montant:` sert au corrigé (« on rend
  7 € : » + bloc `montant: 7`).
- **CP-045 « simuler des achats »** : seulement « Peut-il acheter le ballon à 35 € ? » (Oui / Non), qui
  est au fond CP-042 ; la manipulation reste au lot « construire ».

**Ce qui attend le lot « construire »** (commun avec CP-002 de la collection, Q7) : l'élève pose et
retire pièces et billets jusqu'à une somme ; le bloc compte pour une case lue comme un nombre, jugée
par le juge existant (patron de la saisie de ` ```operation `). Il couvre CP-044 et CP-071 en vrai,
CP-045, CE1-056/057/086, CE2-054 et les ajouts successifs de CE2-080. Coût estimé dans le journal de
la collection : une PR de ~600-900 lignes, revue Opus.

## 5. Rendu écran et PDF

- **Scène** (§ 7) : positions de chaque coupure, calculées une fois, partagées écran / PDF.
- **Déterminisme** : graine = ce qui se dessine (coupures, disposition, n° de l'ensemble), ni la taille
  ni les légendes (leçon de la revue de #1766).
- **390 px** (repère de la collection : objet de 12 unités de scène, 268 unités pour 8 cm) : pièce de
  1 € ≈ 18 unités, 2 € ≈ 21 ; billets de 5 € ≈ 44 × 24 à 100 € ≈ 64 × 24 ; chiffres ≥ 9 unités.
  Ensembles l'un sous l'autre, côte à côte sur tablette et au PDF. À vérifier sur capture.
- **Couleurs** : `var(--color-*)` ; remplissage en accent, traits en teinte foncée de l'accent (leçon
  du thème sombre de la collection) ; anneau de 2 € en `color-mix`. Au PDF : gris cernés de noir.
- **PDF** (Typst) : `monnaie-typst.ts`, valeurs écrites en Typst, cadre neutre « Monnaie
  indisponible » en erreur, compilation réelle testée.
- **QCM** : `--monnaie-taille: 3cm` aux quatre endroits de `--collection-taille`, et
  `withChoiceMonnaieSize` dans la série figée (`serie-automatismes.ts`).

## 6. Règles de reproduction (vérifiées le 2026-10-25)

- **Billets — décision BCE/2013/10** : une « reproduction » est toute image, physique ou numérique, qui
  utilise tout ou partie d'un billet en euros **ou de ses éléments graphiques**. Licite seulement si
  elle ne peut être confondue : numérique → mention « SPECIMEN » en diagonale (≥ 75 % de la longueur,
  ≥ 15 % de la largeur, Arial gras) et 72 dpi au plus à taille réelle ; papier → une face à ≤ 75 % ou
  ≥ 125 % de la taille réelle, deux faces à ≤ 50 % ou ≥ 200 %, ou moins d'un tiers d'une face. Les
  éléments graphiques isolés sont admis s'ils ne sont pas posés sur un fond qui ressemble à un billet.
  Aucune autorisation n'est délivrée : à chacun de respecter les règles.
- **Pièces** : la face commune appartient à l'UE (communication de 2001, puis 2011/C 41/03) ; les
  reproductions **planes** (photos, dessins) sont admises. Le règlement 2182/2004 vise les médailles et
  jetons **physiques** ressemblants, pas les dessins.
- **Conséquence** : des billets « proches des vrais » obligeraient à barrer chaque billet de
  « SPECIMEN » à l'écran (illisible à 3 cm dans un QCM ; et un SVG n'a pas de dpi) et à tenir les
  tailles au PDF imprimé. Des dessins stylisés sans aucun élément des vrais (ni architecture, ni
  drapeau, ni carte, ni palette par coupure) sortent du champ de la décision. Le BO parle lui-même de
  « pièces et billets fictifs ».

Sources : [FAQ BCE](https://www.ecb.europa.eu/euro/banknotes/images/html/ecb.faq_reproduction_rules_euro_banknotes.fr.html) ·
[Images et règles de reproduction, BCE](https://www.ecb.europa.eu/euro/banknotes/images/html/index.fr.html) ·
[Banque de France, billets en euros](https://www.banque-france.fr/system/files/2024-08/billets-euros.pdf) ·
[Règlement 2182/2004, BCE](https://ECB.eu/euro/pdf/reproduction/FR_Regulation1.pdf).
Texte de la communication 2011/C 41/03 non relu en entier (cité par des sources secondaires).

## 7. Réutilisé de la collection, et neuf (code lu le 2026-10-25)

**Repris tel quel** (une ligne ou un `case` chacun, comme pour la collection) :

- Repérage des blocs : `specialBlockEnd` (`parser/unclosed-block.ts`) ; branchements de
  `markdown-parser.ts`, `block-ranges.ts`, `block-closure.ts`, `indented-fences.ts`, `parser/index.ts`,
  `types/ast.ts`, `types/index.ts` ; aiguillage `MarkdownRenderer`, `ListNode`, `StaticBlockNode`.
- Choix de QCM en bloc : `ExpectedResultView.isBlockChoice` teste ` ``` ` en tête, générique ; seule la
  variable CSS de taille est à ajouter (`MultipleChoiceInput`, `ExpectedResultView`, `QuestionPreview`,
  `MigrationQuestionEditForm`, `QuestionPreviewBaseCard`).
- Éditeur riche (`markdown-import.ts`, aller-retour en `codeBlock`), `answer-frames.ts`,
  `scripts/check-ubumark.ts`, `typst-generator.ts`.

**À extraire de la collection pour le partager** (PR 1, § 8). Lu dans `utils/collection-scene.ts` :
`buildCollectionScene` prend un `CollectionSpec` et ne dessine que jetons, cubes, barres et paquets
d'une même taille ; ce qui est générique y est **privé** :

- le hasard déterministe (`hash` FNV-1a, `random` mulberry32, `round`) ;
- le vrac (`scatterItems`) — mais pour des objets d'**une seule taille** (`cell` 28, `jitter` 4,9 pour
  un objet de 12) : à paramétrer par la taille du plus grand objet (pièce de 2 €) ;
- `shift`, et `findCollectionItemAt` (déjà générique sur des boîtes) ;
- côté écran (`Collection.svelte`) : le marquage au doigt (marques valables pour un bloc, toucher →
  coordonnées de scène, trait en travers, « Effacer les marques ») ;
- côté PDF (`collection-typst.ts`) : `typstString`, `cm`, la mise côte à côte réduite ensemble
  (`ROW_MAX_CM`), le cadre neutre.

Le brouillon disait « on généralise `collection-scene.ts` » : c'est une décision d'architecture (Q8).

**Neuf** :

- `types/monnaie.ts` (coupures, plafonds, messages) ; `parser/monnaie-parser.ts` (listes et formes
  comptées, `montant:` et sa décomposition, erreurs situées) ;
- `utils/monnaie-scene.ts` : billets de longueurs différentes en ligne(s) qui passent à la ligne,
  pièces de deux tailles en rangées ou en vrac, **un texte par objet** (sa valeur) — la collection n'en
  a aucun ;
- `nodes/Monnaie.svelte` (pièces à anneau, billets, texte dans le SVG) ;
- `generators/monnaie-typst.ts` (valeurs écrites, anneau) ;
- `withChoiceMonnaieSize`, tests, doc `ubumark.md` (section ` ```monnaie `).

## 8. Découpage en PR (Q9)

Mesure de référence : #1766 (collection complète) = 38 fichiers, ~2 300 lignes hors journal (code
~1 300, tests ~970), revue Sonnet, passée en une PR.

1. **PR 1 — scène commune** (~250 lignes, refactor) : extraire hasard, vrac paramétré, décalage,
   toucher, et le marquage selon Q8 ; **avant** l'extraction, un test qui fige les scènes actuelles de
   la collection (positions de chaque objet, plusieurs blocs) — rouge s'il bouge d'un centième. Aucun
   changement visible. Revue `code-reviewer` (Sonnet).
2. **PR 2 — bloc ` ```monnaie ` complet** (~2 000 lignes, comme #1766) : types, parseur, scène, écran
   et marquage, PDF, QCM, éditeur, `check:ubumark`, doc. Revue `code-reviewer` (Sonnet) — aucune base,
   aucune API, aucune donnée d'élève : ni migration ni `security-auditor`. Repli si elle dépasse
   ~2 500 lignes : 2a écran + éditeur + doc, 2b PDF + QCM.

Agents : aucun requis (pas de logique de question) ; `frontend-developer` (Sonnet) possible pour
`Monnaie.svelte`. Pas de workflow.

## 9. Ce que les modèles (session « questions ») pourront faire

CP-043 (valeur), CP-042 (comparer, avec le piège « 10 pièces = 1 billet »), CP-044 (QCM d'ensembles,
contraintes du BO, « combien manque-t-il ? »), CP-071 (« combien rend-on ? », QCM de monnaie rendue),
CP-045 (« peut-il acheter ? » seulement).

## 10. Questions à David

- **Q1 — Rendu** : dessins stylisés ou proches des vrais ? _Reco : **stylisés** (§ 6) — proches des
  vrais = « SPECIMEN » sur chaque billet à l'écran et tailles surveillées au PDF ; le BO dit
  « fictifs » ; sobriété._ Sous-question : une couleur par coupure (5 € gris, 10 € rouge…) ? _Reco :
  non, une seule couleur d'accent ; la taille et le chiffre suffisent, et la palette des vrais est un
  élément graphique visé par la décision BCE._
- **Q2 — Valeurs v1** : pièces de 1 et 2 €, billets de 5, 10, 20, 50 € ; et 100 € ? _Reco : 100 €
  **accepté** (un seul billet, sous le plafond ; il sert à « je paie avec 100 € ») ; 200 et 500 €
  réservés (CE1, plafond 1 000 €) ; centimes réservés (`50c` → « pas encore disponible »), ajoutés par
  un lot CE1 hors de ce chantier._
- **Q3 — Écriture des coupures** : liste (`20 10 10`) **et** forme comptée (`2×10`) ? _Reco : les deux ;
  la forme comptée est celle que les modèles paramètrent (`{{b}}×10`)._
- **Q4 — `montant: 48`** (le bloc choisit les coupures) en v1 ? _Reco : oui, « le moins d'objets » ;
  il sert les corrigés de CP-071 et CP-043 sans calcul dans le modèle._
- **Q5 — Plafond d'objets** par ensemble ? _Reco : 30 (100 pièces de 1 € n'ont pas de sens à l'écran ;
  30 tiennent à 390 px)._
- **Q6 — CP-044 et CP-071 sans interaction** : les formes du § 4 (QCM d'ensembles, contraintes du BO
  en QCM, « combien manque-t-il ? », « combien rend-on ? ») suffisent pour la v1, le reste au lot
  « construire » ? _Reco : oui._
- **Q7 — « Construire »** : un lot commun collection + monnaie, plus tard, hors de ce chantier ?
  _Reco : oui._
- **Q8 — Partage du code avec la collection** (architecture) : (a) un module commun
  `utils/scene-commune.ts` (hasard, vrac paramétré, décalage, toucher) utilisé par `collection-scene.ts`
  et `monnaie-scene.ts`, plus un petit module partagé pour le marquage au doigt ; (b) une seule scène
  généralisée dont les types s'élargissent aux pièces et billets ; (c) copier ce qu'il faut dans la
  monnaie. _Reco : (a) — la collection ne connaît pas l'euro, chaque scène reste lisible, le commun est
  testé une fois ; (b) mêle deux blocs dans un même type ; (c) duplique ~150 lignes._
- **Q9 — Découpage** : PR 1 scène commune, puis PR 2 bloc complet (§ 8) ? _Reco : oui._
- **Q10 — Disposition par défaut** : `rangé` ? _Reco : oui ; `mélangé` voulu explicitement._
- **Q11 — Prix** : une clé `prix:` qui dessine une étiquette (CP-071, CP-045), ou le prix dans
  l'énoncé ? _Reco : dans l'énoncé en v1 (aucun dessin de plus) ; une étiquette viendrait avec
  « construire »._

## Journal

- 2026-10-25 : chantier lancé par David (collection mise en pause) ; worktree `../ubumaths-wt-monnaie`,
  branche `feat/monnaie` ; lecture de `collection-progress.md`, bornes CP-042 à 045 et CP-071,
  `types/collection.ts`, `utils/collection-scene.ts` ; brouillon de phase 0.
- 2026-10-25 : brouillon complété : bornes CE1/CE2 (centimes, plafond 1 000 €, ajouts successifs),
  règles BCE et pièces vérifiées (§ 6), code de la collection lu (parseur, écran, PDF, branchements
  QCM, éditeur, `check:ubumark`) → réutilisé / neuf (§ 7), découpage étayé par la taille de #1766
  (§ 8), 3e exemple (CP-044 en QCM), questions renumérotées Q1 à Q11.
