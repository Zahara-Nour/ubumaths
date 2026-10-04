---
title: Atelier de recherche — progression du chantier
date: 2026-10-04
status: v1 livrée en production (/atelier, dans la barre latérale) ; restent /grapheur et /cas ; v2 et v3 non commencées
branche: aucune en cours (tout est sur main)
---

# Atelier — progression

| Document                                                               | Rôle                                      |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [atelier-recherche-eleve.md](atelier-recherche-eleve.md)               | Cadrage, 5 décisions figées, périmètre v1 |
| [atelier-recherche-eleve-phase0.md](atelier-recherche-eleve-phase0.md) | Comportements attendus, décisions D1 à D8 |
| **ce fichier**                                                         | Où en est le chantier                     |

> **Objectif (David, 2026-10-01)** : l'atelier a vocation à **remplacer le REPL web** (`/cas`).
> Il garde `WebReplEngine` comme **calculateur** (option B du 2026-09-16, `atelier/engine.ts`) :
> le moteur reste, la page `/cas` partira. Conséquence : ce que les commandes du moteur
> affichent (`.stats`, `.ajustement`…) est affiché **dans l'atelier**, à des élèves — leur
> sortie relève de l'atelier. Note, pas d'ADR. Source : `docs/wip/outils-statistiques-progress.md`.

---

## État au 2026-10-04 — relu dans le code

> Cette section fait foi. Ce qui suit (« Fait », dettes, défauts) est l'historique
> de la phase 1 (2026-09-15/16), annoté là où le code a changé depuis.

### Les trois versions du cadrage (§10 de `atelier-recherche-eleve.md`)

| Version | Contenu                                                              | État                                           |
| ------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| **v1**  | page publique, panneau d'objets, vues Calcul · Graphe · Données, URL | ✅ livrée — restent les deux points ci-dessous |
| **v2**  | géométrie à la souris (barre d'outils sur `GeometryCanvas`)          | ⏸ non commencée, aucune phase 0               |
| **v3**  | Python, banc d'essai de conjecture (lycée, réseau requis)            | ⏸ non commencée, aucune phase 0               |

Dans l'ordre de travail du §11, les étapes 1 à 5 sont faites ; la 6 est la v2,
la 7 la v3.

### Ce qui existe

- **Route** `src/routes/(public)/atelier/+page.svelte`, dans la barre latérale
  (`Sidebar.svelte`, en tête des outils, sans rôle requis).
- **Modèle** `src/lib/atelier/` : 26 modules, ~6 800 lignes ;
  **798 tests** (`src/lib/atelier/__tests__/` + `src/lib/components/atelier/__tests__/`).
- **Composants** `src/lib/components/atelier/` : `AtelierContainer`,
  `ObjectPanel`, `ObjectCard`, `CalculView`, `DataView`, `ShareBar` ; la vue
  Graphe réutilise `GrapheurContainer` sur une instance propre
  (`new GrapheurStore(null)`).

| Lot                                                        | PR                                 |
| ---------------------------------------------------------- | ---------------------------------- |
| Modèle, quatre états, provenance                           | #330                               |
| `grapheurStore` passé par contexte (`grapheur-context.ts`) | #334                               |
| Persistance locale (§5)                                    | #335                               |
| Panneau, vues Graphe, Calcul, Données                      | #336, #337, #339, #343             |
| Dettes, sorties, partage par URL + mode éphémère (§6)      | #344, #346, #345                   |
| Dérivée vivante, dérivée avec paramètres                   | #347 → #351                        |
| Résolution par étapes, inéquations, simplifier, factoriser | #353, #357, #373, #374             |
| Statistiques : `.stats`, fractions, limites, partenaires   | #610, #614, #615, #617             |
| `.simuler`, listes qualitatives, `.croiser`, `.filtrer`    | #655, #656, #661, #662, #666, #667 |
| `.comparer`, `.binomiale`                                  | #698, #740                         |

### Ce qui reste pour clore la v1

1. **Les deux garanties `/grapheur` (§7)** — non faites. `/grapheur` est
   toujours le grapheur autonome (singleton `grapheurStore`, `x^2` d'office au
   `onMount`) : il n'ouvre pas l'atelier en vue Graphe épurée, et
   `/grapheur?f=…` n'ouvre aucun mode éphémère. Le mode éphémère existe pour
   l'atelier (`/atelier?a=…`), pas pour `/grapheur`. C'est aussi l'« étape 5 »
   restée ouverte dans `atelier-url-progress.md` (Q3).
2. **Remplacer `/cas`** (objectif du 2026-10-01) — `/cas` existe toujours
   (`ReplContainer`), hors barre latérale. Le catalogue de l'atelier
   (`commands.ts`) traduit toutes les commandes du moteur ; 7 sont déclarées
   indisponibles avec leur raison (poser, définir, effacer, oublier,
   oublier-fonction, réciproque, dérivée-de : les noms se créent dans le
   panneau). **Pas encore fait** : l'inventaire de ce que `/cas` offre et que
   l'atelier n'offre pas, puis le retrait de la page. `/calc` aussi existe
   toujours (et figure dans le sitemap) ; le §11 visait la fusion `/calc` + `/cas`.

### Dettes encore ouvertes (vérifiées dans le code)

- **D10 depuis les vues** — `create`/`update` ont un paramètre de provenance,
  mais `ObjectPanel` et `DataView` appellent sans lui (défaut `'url'`) ; seule
  la vue Calcul passe `'text'` (`desk.svelte.ts:401`). Sans effet observé.
- **`recomputeAll` réassigne tout le tableau** (`atelier.svelte.ts`,
  `this.items = this.items.map(...)`). Jamais mesuré sur une vue réelle.
- **Curseur recréé par `build()`** — sans effet tant qu'on ne peut pas régler
  les bornes d'un curseur depuis l'atelier : aucune action ne le permet encore.
- **Composant de saisie des unités** (macro `\unit`, palette) — pas extrait ;
  aucune trace de `\unit` dans `components/atelier`.
- **Renommer la liste partenaire choisie** fait revenir en silence au
  partenaire par défaut (#615).

### Soldé depuis la phase 1 (cases restées ouvertes dans les docs de lot)

- Refactor `grapheurStore` → contexte : fait (#334), repli sur le singleton
  assumé pour `/grapheur`, `/calc` et les tests de composants seuls.
- Écart-type : `.stats` passe par `summarizeList`, divise par `n` comme le
  panneau (cf. `atelier-vue-donnees-progress.md`).
- Ajustement affine → fonction traçable : fait (`desk.svelte.ts`, `#fit`).
- Choix de la liste des ordonnées : fait par le choix du partenaire (#615).
- Vue Données et ses actions : faite (`DataView.svelte`, #343).

---

## 💬 Discussion du 2026-10-04 — à reprendre

Rien n'est tranché ici : c'est le point où la discussion s'est arrêtée.

### 1. `/grapheur` : outil intégré confirmé, mais pas encore essayé

- David **privilégie l'outil intégré** (décision figée n° 5 maintenue), sans
  avoir encore fait d'essai en classe.
- Le gain réel, dit honnêtement : le grapheur sait déjà tracer f′, la tangente
  (avec la pente), l'aire, le cercle osculateur. Ce qu'il n'a pas, c'est la
  **formule** de f′ avec ses étapes, les tableaux de variations et de signes,
  résoudre, simplifier, factoriser — tout cela est dans l'atelier. Intégrer
  évite de retaper la fonction d'un outil à l'autre.
- ⚠️ **La plus grosse pièce du chantier** : la vue Graphe de l'atelier affiche
  le grapheur **sans panneau de saisie** (`GrapheurContainer panel={false}`).
  Pour que `/grapheur` = « l'atelier ouvert sur le graphique » marche en
  projection, il faut pouvoir taper une fonction depuis la vue Graphe.
- Question laissée en suspens : existe-t-il des liens `/grapheur` avec
  paramètres déjà distribués, qu'il faudrait continuer à servir ?

### 2. La saisie de l'atelier, telle qu'elle est

- Vue Calcul : un **champ texte ordinaire** (pas MathLive — MathLive ne sert
  qu'à afficher les résultats), façon `/cas` : définitions, calculs, commandes
  en français commençant par un point.
- Panneau « Mes objets » : boutons de création et actions par carte. Encore
  désactivés : Renommer, Régler le curseur, Convertir, et pour une suite
  Tracer en nuage, en escalier, Premiers termes.
- Vue Données : un champ par liste, valeurs séparées par `;`.

### 3. Données : intégrer le tableur ? — question ouverte

David veut un vrai outil intégré, donc une **grille** pour les données plutôt
que `12 ; 15 ; 9`. Accord sur la grille ; reste à choisir **comment** :

| Option | Ce que c'est                                                                                                                                                                  | Pour                                                                | Contre                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **A**  | La vue Données devient une grille dont chaque colonne **est** une liste de l'atelier ; on reprend le composant de grille de `src/lib/components/spreadsheet/`, pas son moteur | une seule vérité de calcul ; stats, nuage, ajustement marchent déjà | pas de formules de cellule (au mieux une colonne calculée `M = 2*L`) |
| **B**  | Le vrai tableur, formules comprises (`=A2*2`, recopie, références relatives/absolues) branché sur l'atelier                                                                   | la compétence « tableur » du programme                              | deux moteurs de calcul dans un même outil ; à réconcilier            |

Faits mesurés sur le tableur actuel (`src/lib/spreadsheet/`, ~12 500 lignes) :

- son propre moteur de formules, sans `mathAST` ;
- `ÉCARTTYPE` / `VAR` sont déclarés dans `functions/aliases.ts` mais **aucune
  implémentation** dans `functions/math.ts` ;
- dans les formules, la virgule sépare les arguments et le point fait les
  décimales — l'atelier lit `3,14` à la française ;
- route `(protected)/spreadsheet`, sauvegarde **en base** — l'atelier est
  public et rien n'y quitte le navigateur (décision figée n° 2) ;
- grille plafonnée à 20 × 20.

**La question qui tranche** : les élèves doivent-ils **écrire des formules de
tableur** dans l'atelier, ou seulement **saisir et lire des données en
grille** ? Seulement saisir → A. Formules → B, qui mérite sa propre phase 0 :
c'est de fait une version de plus, au même rang que la géométrie (v2) et
Python (v3).

### 4. Chantier `/grapheur` repris — décisions de David

**Objectif (David)** : l'atelier est **l'entrée unique** du site pour le
grapheur. Modifie la décision figée n° 5, qui gardait l'entrée « Grapheur »
dans la Sidebar.

**Pas de panneau supplémentaire dans la vue Graphe** (David) : tout passe par
les cartes de « Mes objets », qui deviennent modifiables et portent les
réglages d'affichage du grapheur (couleur, style, f′, tangente, aire, cercle
osculateur, curseurs, suites).

**Actions des cartes — tranché par David :**

1. **Dériver** sur la carte de `f` crée une carte nommée **`f′`** — jamais
   `g`. Elle suit `f` (dérivée vivante : le parseur lit déjà `f'` comme la
   dérivée de `f` partout). Il faut que l'atelier accepte ce nom (refusé
   aujourd'hui à cause de l'apostrophe, `desk.svelte.ts` `#keepDerivative`).
2. **`.dériver f`** dans Calcul fait la même chose : il crée la carte `f′`.
3. **Règle générale** : une action qui crée des objets crée **une carte par
   objet** ; toute action écrit **une ligne de feedback dans l'historique de
   Calcul**, sans changer de vue. On va dans Calcul **seulement si on le
   décide**.

Conséquences notées (à écrire en phase 0) :

- « Garder la dérivée » disparaît, puisque « Dériver » fait son travail ;
- l'ajustement affine et `.simuler` suivent déjà la règle (ils créent un objet) ;
- Variations, Résoudre, Tabuler : seulement la ligne dans Calcul ;
- `.dériver x^2 + 1` (une expression, pas un objet) : pas de carte, seulement la ligne.

**Encore ouvert** :

- la courbe suit la frappe (reco : oui, avec un délai de ~0,3 s) ;
- `/grapheur` continue de marcher en ouvrant l'atelier sur le Graphe ;
- tout garder du grapheur ;
- MathLive dans la carte (à vérifier : ce que MathLive produit pour `'`) ;
- « Mes objets » ouvert à l'arrivée sur `/grapheur` ;
- piste pour plus tard : une vue Graphe + Calcul côte à côte en projection.

---

## Fait

### Phase 0 — spécification (validée le 2026-09-15)

D1 à D8 tranchées par David, toutes dans le sens des recommandations. Seul le
plafond chiffré de D8 (200 valeurs par liste, 8 listes) est une proposition de
ma part, à contester.

### Phase 1 — tests d'abord, vus ROUGES

**38 tests, tous en échec, et en échec sur le comportement** — les signatures
existent et lèvent « non implémenté », donc aucun test ne rougit à cause d'un
import cassé. C'est la preuve rouge au sens fort.

| Fichier                                     | Tests | Couvre                                      |
| ------------------------------------------- | ----- | ------------------------------------------- |
| `src/lib/atelier/__tests__/names.test.ts`   | 15    | §1 nommage, §2.2 collisions                 |
| `src/lib/atelier/__tests__/atelier.test.ts` | 23    | §2.1 création, §2.2, §2.3, §2.4 suppression |

```bash
pnpm test:server src/lib/atelier/__tests__/names.test.ts
pnpm test:server src/lib/atelier/__tests__/atelier.test.ts
```

Fichiers de production créés, **signatures seules** :
`src/lib/atelier/types.ts` · `names.ts` · `atelier.ts`.

### Phase 1 (suite) — implémentation, 38 tests verts

`pnpm test:server src/lib/atelier/__tests__/` → **38/38**, en 1,4 s.

| Fichier             | Rôle                                                          |
| ------------------- | ------------------------------------------------------------- |
| `types.ts`          | Les quatre types du v1, gardes de type, plafonds D8           |
| `names.ts`          | Validation, nommage automatique, messages français            |
| `parse.ts`          | Lecture des définitions, dépendances, réécriture au renommage |
| `atelier.svelte.ts` | Le modèle : création, renommage, modification, suppression    |

**Forme retenue : store à runes** (validé par David le 2026-09-15, après
comparaison). L'argument qui avait d'abord fait pencher vers une classe pure —
« les runes obligeraient à `test:client` » — était **faux** : `modalStack`
(12 tests) et `teacherDashboardCache` (101 tests, 8 `$derived`) tournent en
`test:server`, en node. La règle est le **nom du fichier de test**, pas les
runes : seul `*.svelte.test.ts` part dans le projet `client`, qui lance un vrai
navigateur.

### Phase 1 (suite) — les quatre états (D9), 56 tests verts

`error > pending > incomplete > ok`. L'attente se répare d'elle-même et se
propage : un objet qui dépend d'un objet en attente attend la même chose que lui.

**La rustine `seen` a disparu.** Elle existait pour distinguer « nom supprimé »
de « nom jamais défini » ; avec `pending`, la distinction n'a plus d'objet — un
nom absent est un nom absent, même message, même réparation.

#### Trois faits du moteur, mesurés avant d'écrire

1. **L'AST, jamais le texte.** `ax + b` donne les variables `a`, `x`, `b` : la
   lecture par expression régulière lisait `ax` comme un nom. `getVariables`
   résout la multiplication implicite.
2. **Un appel de fonction porte son nom dans l'AST** (`{type:'function',
name:'h'}`), donc le classement valeur/fonction est exact — pas deviné.
3. **Pas de liste blanche de fonctions à tenir.** Les fonctions génériques du
   parseur sont `f g h u v w F G H`, soit exactement la forme d'un nom d'objet.
   Donc la règle est : **seul un identifiant qui pourrait nommer un objet peut
   manquer**. `sqrt`, `sin`, `abs` font plusieurs lettres — hors jeu par
   construction. ⚠️ `FUNCTION_COMMANDS` ne contient PAS `sqrt` : s'en servir
   comme liste blanche aurait mis `sqrt(x)` en attente.

#### Une limite du moteur, figée par un test

En syntaxe custom, **`pi` n'est pas une constante** : il se lit `p·i`. Un test le
documente plutôt que de le masquer. `e` est bien reconnu.

### Phase 1 (suite) — la provenance (D10), 72 tests verts

`parse.ts` reçoit désormais une `Provenance`. Champ de maths, clavier virtuel et
stockage se lisent en **LaTeX** ; URL, collage et mode commande passent par la
**détection**, avec repli sur la syntaxe custom quand la confiance est ≤ 0,5.
`normalizePasted()` réécrit un collage en LaTeX.

#### ⚠️ Deux constats qui contredisent le §6 bis

1. **« L'objet passera en erreur » est illusoire.** Les deux parseurs tournent en
   mode tolérant : `bonjour tout le monde` se lit comme un produit de 18 lettres,
   et `!!! ??? %%%` devient `\lnot \lnot \lnot \placeholder…`. **Un collage ne
   produit donc presque jamais d'erreur.** Toute garde qui compte là-dessus est
   sans effet.
2. Conséquence concrète : coller une phrase donnerait un objet
   « en attente de b, o, j, u, r, t, l, m, d ». Absurde, mais ni une erreur ni un
   plantage.

**✅ Tranché le 2026-09-16 : pas de critère de refus au collage.** Il raterait le
cas le plus fréquent — coller « Soit f la fonction définie par f(x)=… » contient
opérateurs et vraie expression — et l'asymétrie des coûts l'interdit : un faux
refus bloque un usage valide, un faux passage coûte trois secondes et se voit.

Trois filets à la place, spécifiés au §6 bis : **annulation du collage**
(`Ctrl+Z`), **message d'attente qui compte au lieu d'énumérer** au-delà de trois
noms (§2.5 N7), et le fait que l'élève voit ce qui entre dans le champ.

✅ **N7 fait.** Au-delà de trois manquants le message compte ; le détail reste
dans `missing`, que l'interface montrera au survol :

```
a*x         → En attente de « a », qui n'est pas encore défini.
a*b*c*x     → En attente de « a », « b », « c », qui ne sont pas encore définis.
a*b*c*d*x   → En attente de 4 noms qui ne sont pas encore définis.
énoncé collé → En attente de 10 noms qui ne sont pas encore définis.
```

⚠️ **Écart volontaire à la lettre du §2.5 N7**, qui proposait « 9 noms
inconnus » : le mot **inconnu** désigne en maths ce qu'on cherche dans une
équation. L'employer pour un nom non défini serait un faux ami, dans un outil qui
s'adresse à des élèves. Un test interdit désormais ce mot dans le message.

✅ **Annulation du collage faite** (`src/lib/atelier/paste.ts`). `insertPasted()`
réécrit le collage en LaTeX puis l'insère — et le geste s'annule.

⚠️ **Piège mesuré dans Chromium** : `setValue()` **écrase la pile d'annulation**,
`executeCommand(['insert', …])` la nourrit.

```
setValue puis undo  →  reste \sin(x)     ← l'annulation ne revient PAS
insert   puis undo  →  revient à x^2     ✓
```

Un `Ctrl+Z` inopérant sans rien pour l'expliquer : exactement le genre de défaut
qu'aucun test unitaire n'attrape. Deux tests le verrouillent — la logique en
node avec un faux champ, l'annulation réelle dans un navigateur
(`paste.svelte.test.ts`).

Les trois filets du §6 bis sont donc en place.

✅ **[#329](https://github.com/Zahara-Nour/ubumaths/issues/329) corrigé** — le
nommage automatique fabriquait une fausse « définition circulaire » : créer un
objet sans nom avec la définition `f(x)+1` le nommait `f`, donc l'atelier
dénonçait une circularité qu'il venait de créer. `nextName()` reçoit désormais
les noms **cités par la définition** et les évite : l'objet s'appelle `g` et le
message dit « en attente de f », le même qu'avec un nom choisi par l'élève.

Ce qui ne change pas : un élève qui écrit lui-même `f(x) = f(x)+1` lit toujours
« définition circulaire ». Quatre tests figent les deux comportements.

### Revue de la PR #330 — cinq correctifs

Une revue de code a trouvé **cinq défauts** qu'aucun des 88 tests ne couvrait, et
que la CI verte ne disait pas. Quatre sont corrigés.

1. **`d = 12 km` partait « en attente de `k`, `m` »**, avec deux offres de
   curseur pour les lettres du mot « km ». C'était l'exemple de la décision D4.
   Le test de la valeur à unité vérifiait `unit` et `slider`, **jamais**
   `status` : l'assertion confirmait l'intention, pas le résultat.
2. **N'importe quel suffixe était pris pour une unité** — `2pi` devenait
   « 2 d'unité pi », `3x` « 3 d'unité x ».
3. **Renommer une suite auto-référente ne réécrivait pas sa propre définition** :
   `u = 2u + 1` renommée `v` gardait `2u + 1`, partait en attente de `u`, et
   `updated` était vide — l'élève n'était même pas prévenu.
4. **Les plafonds D8 n'étaient utilisés nulle part** : une liste de 500 valeurs
   passait en silence.
5. **Un dépendant d'un objet encore vide restait `ok`.** Le bouton
   « + Fonction » crée `f` vide (§2.1 N3) ; l'élève écrit `g = f(x)+1` ; `g`
   s'affichait comme bonne pendant que rien ne se traçait et que rien ne
   l'expliquait — le silence même que D9 supprime. Tranché le 2026-09-16 : un
   objet vide ne peut rien fournir à ceux qui le citent, **ils l'attendent**,
   exactement comme un nom absent. L'objet vide, lui, reste `incomplete` : il ne
   manque de rien, il est juste vide.

#### Les unités : trois briques existaient, je n'en utilisais aucune

Signalé par David. `VALUE_SHAPE`, ma lecture maison, était une **réinvention
fautive** :

| Brique                                  | Où                       | Ce qu'elle règle                            |
| --------------------------------------- | ------------------------ | ------------------------------------------- |
| Syntaxe `12[km]` (custom) / `\unit{km}` | les deux parseurs        | l'unité se **déclare**, ne se devine pas    |
| `units.parse()` / `format()`            | `src/lib/mathAST/units/` | `km` oui, `pi` et `x` non                   |
| Macro `\unit` + palette de 18 unités    | page de debug mathfield  | l'élève la saisit sans la taper, et la voit |

Le parseur fait de `12[km]` un nœud `unit` qui **ne libère aucune variable** :
`12 km` écrit sans crochets reste le produit `12·k·m`, ce qu'il est
mathématiquement.

#### ⚠️ Le même piège, deux fois

Le plafond des listes, d'abord posé dans `build()`, ne servait à rien :
`recomputeAll` repart toujours de `parseDefinition` et écrase. Identique au
`status` du premier lot. **Tout contrôle sur une définition doit vivre dans sa
lecture**, jamais à la construction de l'objet.

---

## 🔜 Dette reconnue — trois points, avec leur condition de déclenchement

Relevés par la revue de la PR #330 et **délibérément non corrigés** : ils ne
deviennent observables, testables et mesurables qu'avec une interface. Les
traiter à l'aveugle reviendrait à concevoir sans appelant, tester à moitié, et
optimiser sans mesure.

Chacun porte sa **condition de déclenchement** — sans elle, un point améliorable
est un point oublié.

### 1. D10 n'est pas branché depuis l'atelier

`create` et `update` ne portent pas de `Provenance` : tout est lu en `detect`,
alors que `parse.ts` sait faire du LaTeX pour un champ de maths (§6 bis).

⚠️ **Ce n'est pas un bug aujourd'hui.** La détection lit correctement le LaTeX
pur comme le custom pur ; un champ de maths produit `\sin(x)`, détecté LaTeX,
lu juste. Le seul écart est l'ambiguïté : `e^x` saisi dans un champ sera lu comme
la **constante d'Euler** (repli custom) et non comme une variable `e` — ce qui
est d'ailleurs ce qu'un élève veut dire. D10 apporte une **garantie**, pas une
correction.

> **Déclencheur : quand `create`/`update` auront de vrais appelants**, c'est-à-dire
> au lot des vues. On saura alors quelle provenance porte un `update` déclenché
> par un curseur, par une URL ou par une restauration — ce qui ne se devine pas.

### 2. `build()` recrée le curseur à chaque `update`

Les bornes d'un curseur réglé par l'élève seraient effacées dès qu'il édite la
définition. **Silencieux, et frustrant le jour où ça se déclenche.**

Aujourd'hui sans effet : rien ne permet de régler un curseur, donc le seul test
possible vérifierait que le défaut reste le défaut — ce qui ne prouve rien.

> **Déclencheur : dans le MÊME lot que l'action « régler le curseur »** (§3),
> jamais avant. Le test de préservation s'écrit avec la capacité qu'il protège.

### 3. `recomputeAll` réassigne tout le tableau

`this.items = this.items.map(...)` remplace chaque objet à chaque mutation, même
quand aucun statut ne change : tout `{#each}` se re-rend. C'est précisément la
granularité que le choix du store à runes visait à préserver.

⚠️ **Ce n'est pas un problème de performance** : la revue a mesuré **0,7 ms** par
mutation sur 20 objets dont 8 listes de 200 valeurs. L'enjeu est le re-rendu, et
aucune vue ne permet encore de l'observer. Optimiser sans mesure risquerait
surtout un bug de réactivité — un objet qu'on cesse de remplacer alors qu'il
aurait dû l'être.

> **Déclencheur : après avoir mesuré sur une vue réelle.** Ne remplacer alors que
> les objets dont `status`, `message` ou `missing` changent.

---

## 🔜 À faire au lot des vues : extraire le composant de saisie

La page `/dashboard/admin/debug/mathfield` (carte « Math Input ») contient déjà,
en bac à sable, ce que la saisie de l'atelier demande :

- la **macro MathLive `\unit`** : `{ args: 1, def: '\\,\\colorbox{#e8f5e9}{...}' }`,
  qui rend l'unité sur fond vert en sans-sérif droit — donc distincte d'une
  variable en italique, **avant même le parseur** ;
- l'insertion par `executeCommand(['insert', '\\unit{km}'])`, la même API qui
  préserve la pile d'annulation (§6 bis N4) ;
- une **palette de 18 unités** : `m km cm mm s h min kg g mg L mL m/s km/h m/s^2
N J W`.

À extraire en composant partagé (atelier **et** `/calc`) quand les vues
arriveront — pas avant : taillé aujourd'hui, il le serait pour le bac à sable.

---

## Un défaut de conception trouvé par les tests

La détection des dépendances intersecte les identifiants d'une définition avec
les noms **existants**. Conséquence : supprimer `f` rendait `g(x) = f(x) + 1`
« correcte » — sa dépendance devenait invisible, donc son erreur disparaissait.
C'est le test §2.4 L1 qui l'a attrapé.

Corrigé par une mémoire des noms ayant existé (`seen`) : un nom qu'on SAIT avoir
disparu casse ses dépendants.

### ✅ Tranchée le 2026-09-15 — décision D9

Un nom inconnu met l'objet **en attente**, pas en erreur, et pour une lettre
seule l'attente porte une offre de curseur. Comportements écrits au §2.5 de la
Phase 0, implémentés et testés.

---

## Trois défauts existants que ces tests verrouillent

Ils sont dans le code d'aujourd'hui ; les tests garantissent qu'on ne les
reproduit pas dans l'atelier.

1. **`nextName` ne rend jamais un nom pris.** `nextParameterName`
   (`src/lib/grapheur/types.ts:262`) retombe sur `a` quand les huit lettres sont
   prises (`?? PARAMETER_NAMES[0]`) — anodin pour un curseur anonyme,
   destructeur pour un objet nommé. Test : « ne rend jamais un nom déjà pris ».
2. **Une liste lit la virgule comme décimale, le point-virgule comme
   séparateur.** Le tokenizer distingue aujourd'hui `1,2` de `1, 2` par
   l'espace : intenable pour un collégien.
3. **Supprimer le dernier objet laisse l'atelier vide**, sans y remettre `x^2`
   d'office comme le fait `/grapheur` aujourd'hui (`onMount`).

---

## Reste à faire

- [x] Implémenter `names.ts`, `parse.ts`, `atelier.svelte.ts`
- [x] Les quatre états (D9) et l'offre de curseur
- [x] La provenance des définitions (D10) et la normalisation au collage
- [x] #329 — le nommage automatique évite les noms cités par la définition
- [x] §2.5 N7 — message d'attente lisible au-delà de trois noms
- [x] §6 bis N4 — collage annulable (`insertPasted`)
- [x] Revue #330 — unités déclarées, renommage auto-référent, plafonds D8 — 96 tests verts
- [x] Finding 4 — un dépendant d'un objet encore vide passe en attente — 100 tests verts
- [x] Persistance locale (§5) — #335 ; URL et mode éphémère (§6) — #345
- [x] Le refactor `grapheurStore` → contexte — #334
- [x] Les vues Calcul, Graphe, Données — #339, #337, #343
- [ ] Les deux garanties `/grapheur` (§7) — voir « État au 2026-10-04 »

## ~~Pas encore poussé~~ (périmé : tout est sur `main` depuis #330)

La branche est rouge par construction. Rien n'est poussé tant que
l'implémentation n'est pas verte : une CI rouge sur une branche sans PR ne
prouve rien et coûte douze jobs.
