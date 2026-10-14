---
title: Atelier — le tableur intégré (phase 0)
date: 2026-10-15
status: phase 0 du lot 1 EN ATTENTE DE VALIDATION ; option C, recos Q1-Q5 et T1-T9 décidées
---

# Atelier — le tableur intégré

Chapeau : [atelier-progress.md](atelier-progress.md). Question d'origine (options A/B, 2026-10-04) :
[atelier-progress-historique.md](../archive/wip/atelier-progress-historique.md) §3. Doc système :
[atelier.md](../systeme/atelier.md).

## Décisions de David (2026-10-15)

**Option C** : une grille dans la vue Données, dont les formules de cellule sont calculées par le
**moteur de l'atelier** (`mathAST` : valeurs exactes, virgule décimale, `f`, curseurs), et non par
le moteur du tableur du prof (`src/lib/spreadsheet/`). L'option A (grille de valeurs, sans
formules) est le **lot 1** de C : la cellule range son texte brut, les formules s'y ajoutent
ensuite sans rien jeter.

« Je valide tes recos » (Q1-Q5) :

- **Q1** — Dans une cellule, **lettre + chiffre = cellule, lettre seule = objet** (`A2` est une
  cellule, `A` ou `f(x)` des objets). La grille lit l'atelier ; l'atelier ne lit la grille que
  par une colonne **nommée** en liste.
- **Q2** — Affichage : la règle du bouton ≈ de Calcul. Exact court tel quel (`13/3`, `0,25`,
  `√2`), sinon `≈ 4,3333` ; la valeur exacte se voit à la sélection.
- **Q3** — **26 colonnes (A à Z) × 200 lignes**, alignées sur `MAX_LIST_VALUES`. Un collage trop
  gros est refusé, jamais tronqué.
- **Q4** — Lien : tout l'atelier, ou refus avec la raison. Jamais de grille retirée en silence.
- **Q5** — Formules à la LibreOffice en français : `=` devant, `;` entre les arguments, noms
  français (SOMME, SI…) plus les fonctions de l'atelier. **ECARTYPE divise par n − 1, ECARTYPEP
  par n** : ECARTYPE de la grille ≠ σ de `.stats`, assumé.

« Je suis tes recos » (T1-T9 et règles techniques) :

| #   | Décision                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | **Toute liste est une colonne de la grille**, y compris celles de Calcul (`L = 1 ; 2`), de « + Liste », de `.simuler` et de `.filtrer`.                                                          |
| T2  | Modifier une liste par sa carte ou par `L = …` : la colonne est réécrite ; si elle contient des formules (lot 2), refus avec la raison.                                                          |
| T3  | **Supprimer la liste L vide sa colonne** ; « Annuler » la remet. La confirmation cite aussi les cellules qui la citent (lot 2).                                                                  |
| T4  | **Titres de colonnes** : un texte libre dans l'en-tête, distinct du nom de liste. Au collage, une première ligne de mots au-dessus de nombres devient les titres.                                |
| T5  | **Une cellule vide citée reste vide** (pas 0) — sinon une recopie plus bas que les données remplit la liste de faux zéros (lot 2).                                                               |
| T6  | **Annulation (Ctrl+Z) limitée à la grille** : exception à D6 (« pas d'annulation globale »).                                                                                                     |
| T7  | « Garder dans mon atelier » un atelier reçu : ses colonnes vont dans les **premières colonnes libres** (formules décalées comme une recopie, lot 2) ; pas assez de colonnes → refus avec raison. |
| T8  | **ALEA ne tire qu'au clic sur « Relancer »**, mêmes tirages au rechargement (lot 5).                                                                                                             |
| T9  | **V4 (`/spreadsheet` du prof) gelé** ; son sort se décide après le lot 2 (doublon possible, comme `/cas` et `/calc`).                                                                            |

Règles techniques, validées avec T1-T9 : `a2` tapé se lit `A2` (ce n'est pas une écriture valide
de l'atelier) ; `A2` dans Calcul → refus clair (« c'est une cellule de la grille : nomme sa colonne
pour t'en servir ») ; pas d'unités dans les cellules ; pas de série devinée à la recopie (1, 2 →
3, 4) ; la copie vers l'extérieur écrit des décimaux à virgule ; hors périmètre : insérer ou
supprimer des lignes ou des colonnes, trier.

## Ce que l'analyse a mesuré (2026-10-15)

- Formule de cellule exacte : **0,02 ms** ; suite affine recopiée sur 200 lignes : **10 ms** ;
  Euler (100 pas) : **12 ms**.
- `u(n+1) = √(u(n) + 2)` en exact : le temps **triple à chaque ligne** (884 ms à la 13ᵉ). Le
  signal d'arrêt de `mathAST` (`withActiveAbortChecker`) **ne l'interrompt pas** (budget de 50 ms
  ignoré) : le repli ≈ du lot 2 se décide **après coup** — une cellule calculée en plus de ~20 ms
  garde sa valeur, celles qui en dépendent passent en ≈.
- Lien : 2 colonnes de 200 mesures décimales = **2 179 caractères** (plafond 1 800) — déjà vrai
  avec les listes d'aujourd'hui. Une suite recopiée sur 200 lignes : 2 394 en écriture A1, 1 308
  rangée en relatif (« la cellule du dessus », lot 2).
- Il n'existe **pas d'export de l'atelier en fichier** (seul l'historique de Calcul s'exporte).
- Du tableur du prof, se reprennent : le **graphe de dépendances** (cycles, ordre de recalcul,
  54 tests ; lot 2) et la **lecture CSV / TSV** (séparateur deviné). Ni recopie, ni copier-coller,
  ni `$A$1` n'y existent. Sa grille est soudée à son store global : la grille de l'atelier est un
  composant à elle.
- Aujourd'hui : Tabuler n'existe pas (bouton grisé) ; aucune colonne calculée ; une liste est
  rangée en décimaux (`1/6` → 0,1666…) ; `readListValue` lit `1,5`, `1.5`, `1/6`, `−3`.

---

## Lot 1 — la grille de valeurs : comportements proposés

Pas de formules dans ce lot : un `=` en tête de cellule est gardé tel quel et la cellule dit
« Les formules arrivent dans un prochain lot. » (visible, désactivée avec sa raison — invariant
n° 9).

### 1. Le modèle : une liste est une colonne nommée

- **Nominal** — La grille vit dans l'`Atelier` (invariant n° 1), à côté des objets : des cellules
  (texte brut, rangées seulement si non vides), et pour chaque colonne un **titre** et un **nom de
  liste**, facultatifs. Une colonne nommée `L` **est** la liste L : sa définition est lue dans ses
  cellules, de haut en bas, et passe par la lecture d'aujourd'hui (`parseDefinition`) — stats,
  diagrammes, nuage, ajustement, listes qualitatives, `.stats L` marchent sans changement.
- **Nominal** — Une cellule se lit **comme une entrée de liste aujourd'hui** (`readListValue`) :
  `1,5`, `1.5`, `1/6`, `−3` sont des nombres ; le reste est un mot. Une seule règle pour la grille
  et pour les listes.
- **Nominal** — Créer une liste (« + Liste », `L = 12 ; 15 ; 9` dans Calcul, `.simuler`,
  `.filtrer`, « Garder ») écrit ses valeurs dans la **première colonne libre** (ni cellule, ni
  nom), nommée L. La redéfinir (carte, `L = …`) réécrit sa colonne (T2).
- **Limite** — Les cases vides d'une colonne nommée sont ignorées : `12`, vide, `15` donne la
  liste 12 ; 15.
- **Limite** — Plus de 26 colonnes occupées : créer une liste est refusé (« La grille est pleine :
  vide une colonne. »). Au-delà de 8 listes, le refus d'aujourd'hui (`MAX_LISTS`).
- **Erreur** — Nommer une colonne d'un nom pris, ou qui n'est pas un nom de l'atelier (`AB`,
  `L2`) : refus de `validateName`, avec sa raison ; le nom n'est pas posé.
- **Nominal** — Retirer le nom d'une colonne : la liste disparaît (suppression en cascade
  d'aujourd'hui, avec sa confirmation) mais **les cellules restent**. Supprimer la liste depuis
  sa carte, au contraire, vide la colonne (T3) ; « Annuler » remet cellules, titre et nom.

### 2. La vue Données

- **Nominal** — La vue Données montre la grille, avec au-dessus une **barre de cellule** (`B3`,
  puis le contenu brut, modifiable — indispensable sur tablette et téléphone), et au-dessous les
  diagrammes ouverts (`chartOf`, comme aujourd'hui sous chaque liste).
- **Nominal** — En-tête de colonne : la lettre, le titre (texte libre, 40 caractères), le nom de
  liste et, pour une colonne nommée, l'aperçu d'aujourd'hui (« n = 12 · moyenne 15,3 », « liste
  qualitative… », « 2 valeurs ignorées ») ou le message d'erreur.
- **Nominal** — La grille montre la **zone utilisée plus une marge** (10 lignes, 3 colonnes ; au
  moins 10 × 5) et grandit jusqu'à 26 × 200 : pas 5 200 cases à l'écran. Le rendu est mesuré
  pendant le lot.
- **Limite** — Atelier sans données : grille vide de 10 × 5, avec une consigne (« Tape tes valeurs,
  ou colle un tableau copié d'un tableur. »).
- **Limite** — Téléphone : la grille défile horizontalement ; le premier rang (lettres) et les
  numéros de lignes restent visibles.

### 3. Saisie et clavier

- **Nominal** — Taper sur une cellule sélectionnée remplace son contenu ; **Entrée** valide et
  descend, **Tab** valide et va à droite, **Échap** annule la frappe, **flèches** pour se déplacer,
  **F2** ou double-clic pour modifier sans effacer, **Suppr / Retour arrière** vident la sélection.
  Le calcul (aperçu, diagrammes) suit à la **validation**, pas à chaque frappe.
- **Nominal** — `12 ; 15 ; 9` tapé ou collé dans une cellule se **répartit vers le bas**, une
  valeur par ligne (habitude de l'ancien champ). → **P2**
- **Nominal** — Sélection d'une zone : Maj + flèches, glisser à la souris, Maj + clic. Sur écran
  tactile : une cellule à la fois dans ce lot.
- **Limite** — Une cellule garde 200 caractères au plus (au-delà : refus à la validation, la
  frappe reste dans la barre).
- **Accessibilité** — `role="grid"`, chaque cellule annoncée « B3, 15 » ; la sélection et les
  refus sont annoncés une fois (pas à chaque frappe).

### 4. Coller, copier, télécharger

- **Nominal** — Coller un tableau copié de LibreOffice, Excel, Google Sheets ou d'une page web
  (lignes et tabulations) le pose **à partir de la cellule sélectionnée**. `1,5` et `1.5` sont
  des nombres.
- **Nominal** — Première ligne collée faite de mots au-dessus de nombres (`Taille ⇥ Masse`) : elle
  devient les **titres** des colonnes, pas des cellules (T4).
- **Limite** — Collage qui déborde de 26 × 200 : **refusé entier**, avec la taille (« 3 colonnes ×
  250 lignes : la grille en garde 200. »). Rien n'est collé.
- **Limite** — Collage sur des cellules remplies : elles sont remplacées ; « Annuler » les remet.
- **Nominal** — Copier (Ctrl+C) une zone écrit des lignes et tabulations, **décimaux à virgule**
  (`13/3` deviendrait une date dans LibreOffice : la copie écrit des nombres).
- **Nominal** — « Télécharger en CSV » : séparateur `;`, virgule décimale, titres en première
  ligne, encodage lu par Excel et LibreOffice (module CSV existant).

### 5. Annuler

- **Nominal** — Ctrl+Z / Cmd+Z (et un bouton) annule la dernière saisie, le dernier collage ou le
  dernier effacement ; Ctrl+Maj+Z refait. Un collage de 200 cellules s'annule en une fois (T6).
- **Limite** — L'annulation porte sur les **cellules et les titres** ; nommer ou supprimer une
  liste reste un geste d'objet (la suppression a déjà son « Annuler »). Pile de 100 gestes, perdue
  au rechargement.

### 6. Deux colonnes ensemble : appariées par ligne

- **Nominal** — Nuage, ajustement, effectifs, tableau croisé entre L et M prennent les **lignes où
  les deux cases sont remplies**, et disent combien ils en écartent (règle §4 L1 d'aujourd'hui). →
  **P1**
- **Limite** — Aujourd'hui les paires se font par rang dans la liste : avec une grille, une case
  vide au milieu de M décalerait toutes les paires suivantes, en silence.

### 7. Sauvegarde, lien, atelier reçu, conversion

- **Nominal** — La grille est rangée avec l'atelier (version 2 du format, `ATELIER_STATE_VERSION`) :
  cellules non vides, titres, noms. Un état de version plus récente n'est ni relu ni écrasé
  (règle d'aujourd'hui).
- **Nominal** — **Conversion à la lecture** des ateliers rangés et des liens d'aujourd'hui (version
  1. : chaque liste devient une colonne, dans l'ordre des cartes (A, B…), une entrée par cellule,
     texte de l'élève gardé tel quel.
- **Nominal** — Lien : la grille voyage avec l'atelier ; trop gros, le refus d'aujourd'hui, avec un
  message qui nomme aussi la grille (Q4).
- **Nominal** — « Garder dans mon atelier » : les colonnes reçues vont dans les premières colonnes
  libres, les listes renommées comme aujourd'hui en cas de collision (T7).
- **Erreur** — Pas assez de colonnes libres pour un atelier reçu : refus avec la raison, rien n'est
  versé.
- **Erreur** — Grille abîmée dans un lien ou une sauvegarde (Zod) : la cellule abîmée est écartée,
  le reste gardé (règle `salvageObjects`).
- **Nominal** — « Repartir de zéro » vide aussi la grille.

### 8. Calcul

- **Nominal** — Rien ne change pour `.stats L`, `.simuler`, `.croiser`… : ils lisent la liste.
- **Erreur** — `A2` (ou `B2+1`) tapé dans Calcul : « A2 est une cellule de la grille : nomme sa
  colonne pour t'en servir. » au lieu de « Nombre 2 écrit après un facteur ».

---

## Questions ouvertes (lot 1)

- **P1 — Appariement par ligne** (§6) : deux colonnes s'associent ligne à ligne, en écartant les
  lignes incomplètes — au lieu du rang dans la liste. **Reco : oui** ; sinon une case vide décale
  toutes les paires en silence.
- **P2 — `;` dans une cellule** (§3) : `12 ; 15 ; 9` se répartit vers le bas. **Reco : oui**, c'est
  l'habitude du champ actuel ; sinon la cellule devient le mot « 12 ; 15 ; 9 ».

## Découpage en PR (lot 1)

1. **Le modèle** : grille dans l'`Atelier`, liste = colonne, conversion v1 → v2, lien, fusion,
   suppression ; vue Données en grille simple (saisie, clavier, barre de cellule).
2. **Collage, copie, CSV, titres**.
3. **Annuler et appariement par ligne**.

Tests : modèle en node (`src/lib/atelier/__tests__/`), grille et collage dans un vrai navigateur
(`*.svelte.test.ts`, comme `paste.svelte.test.ts`), conversion v1 → v2 sur des états réels
rangés. Doc : [atelier.md](../systeme/atelier.md) à chaque PR.

## Lots suivants (rappel, chacun sa phase 0)

2. **Formules** : `A2`, `$A$2`, objets de l'atelier, repli ≈ après coup, erreurs en français,
   cycles, recopie (Ctrl+D, poignée, « Recopier jusqu'à la ligne… »), formules rangées en relatif,
   oracle « même réponse que Calcul ».
3. **Tabuler** vivant (`=A2+0,5`, `=f(A2)`), depuis la carte et par `.tabuler`.
4. **Fonctions du tableur** : SOMME, MOYENNE, MEDIANE, MIN, MAX, ECARTYPE, ECARTYPEP, NB, NB.SI,
   SI, ARRONDI, ENT ; RACINE, ABS, LN, EXP, PI.
5. **ALEA et « Relancer »**.
