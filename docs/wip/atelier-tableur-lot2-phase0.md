---
title: Atelier — tableur intégré, lot 2 : les formules (phase 0)
date: 2026-10-15
status: phase 0 EN ATTENTE DE VALIDATION
---

# Atelier — tableur intégré, lot 2 : les formules

Lot 1 livré (#1410 → #1413, pas encore en prod) : la grille de valeurs. Phase 0 du tableur et
décisions déjà prises : [atelier-tableur-phase0.md](atelier-tableur-phase0.md). Journal :
[atelier-tableur-progress.md](atelier-tableur-progress.md).

Ce lot ajoute les **formules de cellule**, calculées par le **moteur de l'atelier** (option C) :
`=A2+1`, `=0,8*B2+3`, `=$B$2*A3`, `=f(A2)`, `=a*A2`. Hors de ce lot : les plages et les
fonctions du tableur (`SOMME(A2:A10)`, `SI`… — lot 4), Tabuler (lot 3), ALEA (lot 5).

## Déjà décidé (rappel)

- **Q1** — Dans une formule, **lettre + chiffre = cellule, lettre seule = objet** de l'atelier.
  La grille lit l'atelier ; l'atelier (Calcul, cartes) ne lit la grille que par une colonne
  nommée.
- **Q2** — Une cellule montre sa valeur exacte si elle est courte (`13/3`, `√2`), sinon
  `≈ 4,3333` ; la valeur exacte se voit à la sélection.
- **Q5** — `=` devant, `;` entre les arguments (`=max(A2 ; 3)`), virgule décimale.
- **T2** — Une colonne qui contient des formules ne se modifie pas par la carte de sa liste ni
  par `L = …` : refus avec la raison (« L est calculée dans la grille »).
- **T5** — Une cellule vide citée par une formule la laisse **vide** (pas 0).
- **T7** — Un atelier reçu : ses formules suivent leurs colonnes.
- **Règles techniques** — `a2` tapé se lit `A2` ; pas d'unités dans les cellules ; pas de série
  devinée à la recopie ; « même réponse que Calcul » (vérifié par un oracle).
- **Mesuré** — 0,02 ms par cellule exacte ; un calcul exact ne s'interrompt pas en cours de
  route : le repli ≈ se décide **après coup**.

---

## Comportements proposés

### 1. Écrire une formule

- **Nominal** — Une cellule qui commence par `=` est une formule. Elle s'écrit comme une ligne de
  Calcul en mode texte : `sqrt`, `√`, `^`, `π`, `e`, `ln`, multiplication implicite (`2A2`),
  virgule décimale, `;` entre les arguments. La cellule montre la **valeur**, la barre au-dessus
  la **formule**.
- **Nominal** — Une formule n'est jamais répartie vers le bas : le « ; » de `=max(1 ; A2)`
  sépare des arguments (P2 ne vaut que pour une saisie sans `=`).
- **Nominal** — `=a2+1` est relu `=A2+1` (comme LibreOffice) : la barre montre `A2`.
- **Erreur** — Une formule illisible (`=2+`, `=)`) : la cellule le dit (§4), le texte tapé est
  gardé tel quel pour être corrigé.

### 2. Ce qu'une formule cite

- **Nominal** — Des cellules : `A2`, `$A$2`, `$A2`, `A$2` (le `$` ne compte que pour la recopie,
  §5). Une cellule d'une colonne nommée se cite pareil (`=A2`).
- **Nominal** — Les objets de l'atelier, avec leur valeur du moment : `=f(A2)`, `=a*A2`,
  `=f'(A2)`, `=u(A2)`. Bouger le curseur de `a` recalcule les cellules qui le citent, et elles
  seules.
- **Nominal** — Mêmes refus que dans Calcul : `=f(A2)` avec A2 hors de l'ensemble de f donne le
  refus de `f(5)` hors intervalle ; une `f⁻¹` sans réciproque, le refus de `.réciproque`.
- **Limite** — Une cellule vide citée : la formule reste vide (T5) ; la barre explique
  « A2 est vide. ».
- **Erreur** — Une cellule qui contient un mot, citée dans un calcul : « A2 contient un mot
  (fille) : une formule calcule avec des nombres. »
- **Erreur** — Un nom qui n'est pas un objet : « a n’est pas défini dans l’atelier : crée-le
  dans Mes objets (a = 2). » → **Q-L2-3**
- **Erreur** — Une variable libre (`=x+1`) : « x n’a pas de valeur : une cellule calcule un
  nombre. » ; une liste citée seule (`=L+1`) : « L est une liste : cite une de ses cellules (A2). ».
- **Erreur** — Une cellule hors de la grille (`=A201`, `=AB2`) : « A201 n’existe pas : la grille
  va de A1 à Z200. »

### 3. Le calcul

- **Nominal** — Valeur **exacte** (`=1/3` reste 1/3, `=sqrt(2)*A2` reste un multiple de √2),
  affichée selon Q2.
- **Nominal** — Recalcul à la **validation** d'une cellule, et à chaque changement d'un objet
  cité (curseur, carte, Calcul) — seulement les cellules concernées et celles qui en dépendent.
- **Limite** — Une cellule dont le calcul exact a pris plus de ~20 ms garde sa valeur ; celles
  qui en dépendent passent en **décimal** (≈), et cela se propage. Mesuré : `=sqrt(A1+2)`
  recopiée sur 200 lignes reste sous 0,1 s au total.
- **Erreur** — Un **cycle** (`A1 = B1+1`, `B1 = A1`) : chaque cellule du cycle le dit,
  « Cycle : A1 dépend d’elle-même (par B1). » ; le reste de la grille se calcule.

### 4. Ce que la cellule et la barre affichent

- **Nominal** — Cellule : la valeur (Q2). Barre : la formule ; sous la barre, la valeur
  **exacte** en écriture mathématique quand la cellule montre `≈` (« Valeur exacte : … »).
- **Erreur** — Une cellule en erreur montre un repère court, la phrase entière s'affiche sous la
  barre quand on la sélectionne. → **Q-L2-1**
- **Limite** — Une cellule dont une cellule citée est en erreur : « Dépend de B2, en erreur. »
  (même règle que les cartes).

### 5. Recopier

- **Nominal** — **Ctrl/⌘+D** recopie la première ligne de la zone sélectionnée vers le bas, sur
  toute la zone ; la **poignée** (petit carré en bas à droite de la sélection) se tire à la
  souris ; sur tablette, un bouton **« Recopier vers le bas… »** demande jusqu'à quelle ligne.
  → **Q-L2-2**
- **Nominal** — Les références relatives se décalent (`=0,8*B2+3` recopiée en B4 devient
  `=0,8*B3+3`) ; `$` fige la colonne ou la ligne (`=$B$2*A3` garde `$B$2`).
- **Nominal** — Une valeur se recopie telle quelle (pas de série devinée : 1, 2 ne donne pas 3, 4).
- **Limite** — Une recopie qui décalerait une référence hors de la grille (`=A1` recopiée vers
  le haut au-dessus de la ligne 1) : la cellule concernée dit « Référence hors de la grille ».
- **Limite** — Recopier au-delà de la ligne 200 : refusé entier, comme un collage.
- **Nominal** — Copier-coller **dans** la grille (Ctrl/⌘+C puis V) décale aussi les références
  relatives, comme un tableur ; vers un autre logiciel, ce sont les valeurs qui partent
  (décimaux à virgule, déjà en place). → **Q-L2-4**
- **Nominal** — Une recopie s'annule en une fois (T6).

### 6. Les listes

- **Nominal** — Une colonne nommée qui contient des formules est une liste dont les valeurs sont
  celles des formules : stats, nuage, diagrammes, ajustement les lisent (en décimaux, comme
  aujourd'hui pour `1/6`).
- **Nominal** — Une formule en erreur ou vide dans une colonne nommée : la ligne n'a pas de
  valeur (elle compte comme une case vide pour l'appariement par ligne, P1) ; l'aperçu le dit
  (« 2 cases en erreur »).
- **Nominal** — La carte d'une liste à formules montre ses **valeurs** et « calculée dans la
  grille » ; la modifier par la carte ou `L = …` est refusé (T2).
- **Nominal** — Supprimer la liste L vide sa colonne (T3) ; les formules qui citaient ses
  cellules deviennent vides (T5). La confirmation le dit : « … et 12 cellules qui la citent ».

### 7. Sauvegarde, lien, atelier reçu

- **Nominal** — Les formules sont rangées telles que tapées (`=0,8*B2+3`). Dans le **lien**,
  elles sont écrites en relatif (« la cellule du dessus ») : une colonne recopiée se compresse
  bien mieux (mesuré : 2 394 → 1 308 caractères pour deux colonnes de 200 lignes).
- **Nominal** — Un atelier reçu (T7) : ses colonnes vont dans les colonnes libres, et **toutes**
  ses références suivent leur colonne (relatives comme absolues).
- **Erreur** — Une formule abîmée dans un lien : gardée comme texte, la cellule dit qu'elle ne
  se lit pas.

### 8. Calcul ne change pas

- Calcul ne lit toujours pas les cellules (Q1) ; `.stats L`, `.ajustement L : M` lisent les
  valeurs des listes, formules comprises.

---

## Questions à trancher (lot 2)

- **Q-L2-1 — Une cellule en erreur.** Que montre la case elle-même ? **Reco : un mot court en
  rouge — « erreur », « cycle » ou « vide ? »** —, la phrase entière sous la barre quand on la
  sélectionne. Les codes des tableurs (`#REF!`, `#DIV/0!`) ne disent rien à un élève de
  l'atelier.
- **Q-L2-2 — Recopier : trois gestes.** Ctrl/⌘+D, la poignée à la souris, et un bouton
  « Recopier vers le bas… » (indispensable sur tablette, où une zone ne se sélectionne pas au
  doigt). **Reco : les trois.**
- **Q-L2-3 — Un nom inconnu dans une formule** (`=a*A2`, a pas encore créée). Dans les cartes, il
  met en attente et propose un curseur. **Reco : dans une cellule, un refus qui dit comment
  créer a**, sans curseur proposé : la grille calcule des nombres, elle ne crée pas d'objets.
- **Q-L2-4 — Copier-coller une formule dans la grille.** **Reco : les références relatives se
  décalent**, comme dans tous les tableurs (et comme la recopie) ; ce qui part vers un autre
  logiciel reste les valeurs.

## Découpage en PR (lot 2)

1. **Le moteur de formules** (modèle) : lecture des références, calcul avec les objets de
   l'atelier, graphe de dépendances et recalcul ciblé, cycles, erreurs en français, repli ≈
   après coup, valeurs des listes à formules, T2 / T3 / T5, `a2` → `A2`, pas de P2 après `=`.
   Oracle « même réponse que Calcul ».
2. **L'affichage** : valeurs (Q2) en écriture mathématique, repère d'erreur (Q-L2-1), valeur
   exacte et phrase sous la barre, carte d'une liste à formules.
3. **Recopier** : Ctrl/⌘+D, poignée, bouton (Q-L2-2) ; copier-coller qui décale (Q-L2-4) ;
   formules en relatif dans le lien ; références d'un atelier reçu.

Tests : modèle en node (références, objets, cycles, repli, listes), oracle cellule = Calcul sur
un corpus d'expressions, vue dans un vrai navigateur (affichage, recopie au clavier et à la
souris). Le graphe de dépendances du tableur du prof (`src/lib/spreadsheet/dependency-graph.ts`,
54 tests) est repris en le rendant indépendant de son parseur, sans changer l'outil du prof.
