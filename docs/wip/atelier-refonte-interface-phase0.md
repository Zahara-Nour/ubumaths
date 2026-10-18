# Atelier — refonte de l'interface : phase 0, à valider

Demande de David du 2026-10-18 (session « modifs-fixes »). Rien n'est codé : chaque lot attend sa validation.

## Déjà tranché par David (2026-10-18)

- **Console façon Quake : un volet déroulant** qui descend du haut PAR-DESSUS Graphe et Données. L'onglet Calcul disparaît.
- **Carte repliée éditable : la nouvelle définition vaut à Entrée ou à la sortie du champ**, jamais à chaque frappe.
- **Annuler / Rétablir : un vrai chantier**, avec sa propre phase 0 (lot 5). Toute action devient annulable.
- Onglets : Graphe, Données, puis plus tard Géométrie et Python. La « Console » n'est plus un onglet : c'est le volet.

## Tranché par David, deuxième passe (2026-10-18) — fait foi sur les « À valider » ci-dessous

- **Lot 1** : Partager dans la barre, à droite de Réglages. Annuler / Rétablir **absents** jusqu'au lot 5 (Ctrl+Z annule toujours une suppression).
- **Lot 2, raccourci** : la **touche physique sous Échap** (`²` PC AZERTY, `@` Mac AZERTY, `` ` `` QWERTY), lue par sa position et non par son caractère ; sans effet quand le focus est dans un champ. ⚠️ À MESURER sur le Mac de David avant de coder (le `event.code` de cette touche est parfois mal nommé sur les claviers Apple). Secours : **Ctrl+Entrée** (Ctrl, pas Cmd, sur Mac), qui marche aussi depuis un champ. Infobulle du bouton : les deux raccourcis.
- **Lot 2, mesure du 2026-10-18** (Chrome 154, Mac AZERTY ISO de David) : la touche sous Échap (`@`) rend `code = IntlBackslash`, la touche `<` à côté de Maj rend `Backquote` (inversion connue des claviers Apple ISO) ; Ctrl+Entrée rend `Enter` + `ctrlKey`. Règle retenue : sur Mac, `IntlBackslash` OU `Backquote` (un Mac QWERTY ANSI n'a pas d'`IntlBackslash`) ; ailleurs, `Backquote` ; partout Ctrl+Entrée. Safari non mesuré.
- **Lot 2, aspect** : fond clair de l'atelier ; invite `>` devant l'instruction, réponse préfixée `-->` en couleur ; chasse fixe pour les seules commandes en texte (`.dériver f`), les saisies mathématiques restent rendues par MathLive.
- **Lot 3** : les actions à saisie (tabuler de/à/pas) s'ouvrent dans une petite fenêtre depuis le menu, résultat dans la console ; exception : l'image ouvre la console préremplie avec `f(`. Ce qu'est une carte (dérivée, réciproque) : infobulle sur le nom **et** une petite icône de lien à côté du nom (téléphone).
- **Lot 4** : le curseur d'une valeur est visible sur la ligne quand la valeur est un **paramètre** (utilisée par une autre carte) ; ses bornes et son pas restent dans le menu.
- **Lot 5** : une étape = une validation (Entrée, sortie du champ, choix dans un menu) ; un changement de couleur = une étape ; tout un glissé de curseur = une seule étape. Tableur dans la même pile. Annuler une ligne de console = annuler son effet, ligne barrée. Pile perdue au rechargement.

## Constat qui change la barre : « Exporter » n'est pas « Enregistrer »

Le JSON « pour rejouer » (`history-export.ts`) ne contient que les **gestes de Calcul** (`ReplayStep` : saisie, action, supprimer, annuler, garder). Il ne contient **pas** une définition modifiée dans une carte, une couleur, une épaisseur, une courbe masquée, le tableur ou ses formats. Recharger ce fichier ne rend donc pas l'atelier qu'on avait.

Or l'état complet existe déjà, validé par Zod : c'est ce que `persistence.ts` range dans le navigateur.

**Proposition :**

- **Enregistrer** télécharge un fichier `.atelier.json` : l'état complet (`persistence.ts`) plus l'historique de la console.
- **Charger** relit ce fichier avec le même schéma Zod, après une confirmation « Charger remplace l'atelier actuel » (comme « Rejouer » aujourd'hui).
- L'ancien JSON « pour rejouer » reste lisible par Charger : un fichier d'avant la refonte ne devient pas illisible.
- **ubumark (pour lire)** n'est pas un enregistrement : il passe dans le menu de la console (« Copier l'historique pour une fiche »).

Ceci répond aussi à la question de la barre « Exporter l'historique » : elle fait doublon. Elle disparaît.

## Lot 1 — la barre d'icônes

Une seule ligne au-dessus des onglets. Chaque bouton est une icône seule (lucide), avec une infobulle et un `aria-label` en français.

| Place  | Icône        | Action                                                                    |
| ------ | ------------ | ------------------------------------------------------------------------- |
| gauche | `Undo2`      | Annuler (lot 5 ; d'ici là, désactivé avec sa raison)                      |
| gauche | `Redo2`      | Rétablir (lot 5)                                                          |
| gauche | `RotateCcw`  | Repartir de zéro (confirmation existante)                                 |
| gauche | `FolderOpen` | Charger                                                                   |
| gauche | `Save`       | Enregistrer                                                               |
| droite | `Share2`     | Partager (l'actuel « Partager… ») — **à confirmer** : tu ne l'as pas cité |
| droite | `Settings`   | Réglages, icône seule                                                     |

**Comportements :**

- Cas nominal : clic sur Enregistrer → un fichier `atelier-AAAA-MM-JJ.atelier.json` est téléchargé ; un toast dit « Atelier enregistré ».
- Limite : atelier vide → Enregistrer et Repartir de zéro sont désactivés, et l'infobulle dit pourquoi.
- Erreur : un fichier illisible, trop gros ou d'un autre format → rien n'est remplacé, et un message dit pourquoi en français.
- Atelier éphémère (lien partagé, navigation privée) : Repartir de zéro est masqué, comme aujourd'hui.

**À valider :**

- Partager dans la barre, à droite ?
- Undo/Redo visibles mais désactivés en attendant le lot 5, ou absents ?

## Lot 2 — la console déroulante

- Un bouton de la barre et la touche `²` (`` ` `` sur un clavier QWERTY) ouvrent ou ferment le volet. Le volet descend du haut, sur environ 40 % de la hauteur, et se redimensionne à la poignée. On voit le graphe dessous.
- Le champ de saisie prend le focus à l'ouverture. Échap ferme le volet.
- La touche `²` ne bascule pas le volet quand le focus est déjà dans un champ (sinon impossible de taper `²`). → **À valider.**
- **Lisibilité, ta demande :**
  - l'instruction en couleur normale, pas plus sombre que la réponse ;
  - la réponse préfixée `-->` en couleur d'accent ;
  - « a est correctement défini », le nom en couleur, au lieu de « "a" est dans tes objets ».
- Les boutons de ligne (copier, garder, détails…) n'apparaissent qu'au survol ou au focus de la ligne. Ils restent atteignables au clavier.
- Le badge « nouveaux résultats » (A3) passe sur le bouton de la console.
- Sur téléphone, le volet prend tout l'écran.

**À valider :**

- Fond sombre façon terminal, ou thème clair de l'atelier ?
- Police à chasse fixe pour l'instruction tapée ? Les maths restent rendues par MathLive.

## Lot 3 — les cartes de fonction

**Vue repliée (la seule) :**

- Une seule ligne `● f(x) = [3x+5]`.
- Le membre de droite est un champ MathLive éditable. La définition est prise en compte à Entrée ou à la sortie du champ.
- Plus de libellé « fonction » en dessous.
- Une saisie invalide garde l'ancienne définition, et le champ montre l'erreur. Échap revient à l'ancienne valeur.

**Le point de couleur :**

- Un clic ouvre une petite fenêtre : couleur, épaisseur, et peut-être pointillé. Le contenu reprend celui de `CurveSettings` ; c'est la présentation qui change.

**Plus de vue développée :**

- Elle est remplacée par une icône menu (`Menu`, ou `EllipsisVertical`) qui ouvre un menu à deux parties :
  - **Affichage** : aire sous la courbe, tangente… (ce qu'offre `CurveSettings` aujourd'hui) ;
  - **Actions** : dériver, tableau de variations, image, tabuler… (`actionsFor`).
- L'œil (montrer ou masquer la courbe) reste sur la ligne.

**À valider :**

- Les actions qui demandent une saisie (image `f(…)`, tabuler de/à/pas) s'ouvrent dans une petite fenêtre depuis le menu. Le résultat s'écrit dans la console, comme les autres actions (G7). D'accord ?
- Le « ce qu'est cette carte » (dérivée de f, réciproque de g) : une infobulle sur le nom, plutôt qu'une ligne sous la carte ?

## Lot 4 — les autres types d'objets (réflexion, à mener avec toi)

Même grammaire pour tous : une ligne `● nom = [définition éditable]`, puis un menu.

| Type   | Ligne repliée                        | Point              | Menu                     |
| ------ | ------------------------------------ | ------------------ | ------------------------ |
| valeur | `a = [3]` (+ curseur si paramètre ?) | —                  | curseur, bornes, pas     |
| suite  | `u(n) = […]` ou récurrence           | couleur des points | affichage, actions       |
| liste  | `L = {…}` tronquée                   | —                  | statistiques, diagrammes |

→ À discuter en séance : le curseur d'une valeur doit-il rester visible sans ouvrir de menu ?

### Ajout du 2026-10-18 (session atelier-geometry, décisions de David)

- Deux nouveaux types (#1474, #1478) : **point** `A = [(1 ; 2)]` (menu : modifier, supprimer) et **courbe** `d : [y = 3x − 2]` avec sa nature affichée (droite, cercle…) (menu : modifier, supprimer ; plus tard « Afficher dans Géométrie »). Le principe est validé par David, le détail reste à lui faire valider. Spécification : `atelier-geometrie-phase0.md`.
- Paramètre (règle du curseur) : une valeur citée par un point ou une courbe EST un paramètre.
- Onglets : **Graphe · Géométrie · Données** (l'onglet « Figure » de #1478 est renommé Géométrie par la session atelier-geometry).
- Lot 2 : le message de la vue Géométrie vide renvoie à « Calcul » (`FigureView.svelte`) ; il devra suivre la console.
- Charger : la copie de côté de « Remplacer mon atelier » (`atelier-remplacer-phase0.md`, R3, R5) est faite par la session atelier-geometry, après le merge du suivi de revue du lot 1.

### Lot 3 bis — tranché par David le 2026-10-18 (après #1488)

- **Règle du menu de carte** : la carte garde ce qui agit sur l'objet ou son affichage (Tracer, Afficher dans Géométrie), ce qui crée un objet relié (Dériver, Réciproque), la vie de l'objet (Renommer, Supprimer) et les commandes difficiles à deviner (Variations, Résoudre f(x) = 0, Tabuler). Les calculs qui s'écrivent en une ligne évidente vont dans la console.
- **« Image d'un nombre » retirée du menu** : `f(2)` s'écrit dans la console. Cela revient en partie sur §3 de la conception d'origine (actions attachées à l'objet pour la progressivité 6ᵉ → terminale) : David l'a choisi en connaissance de cause.
- **Lecture graphique de l'image : option d'Affichage, en deux modes (choix c)** :
  - (a) chaque `f(a)` calculé dans la console dessine sa lecture en pointillés : de `a` sur l'axe des abscisses au point de la courbe, puis du point à `f(a)` sur l'axe des ordonnées, valeurs écrites aux extrémités ;
  - (b) un point qu'on fait glisser sur l'axe des abscisses, avec une lecture qui suit en direct (souris, toucher, clavier).
  - Détails (recommandations de Claude, **validées par David le 2026-10-18 : « je suis tes recos »**) : réglage par courbe dans le menu Affichage ; les 3 dernières lectures de la console restent affichées ; valeurs écrites comme dans la console (exactes si courtes, sinon arrondies au centième) ; un `a` hors de l'ensemble de définition ne dessine rien et la console le dit déjà ; le point glissant s'aimante aux entiers et aux demis ; au clavier, flèches ← → par pas de la grille.
  - Plus tard : la lecture d'un antécédent (de `k` sur l'axe des ordonnées vers la courbe).
- **Croiser / simuler** (actions des listes qui préparent une commande dans la console) : ajoutent leur texte à la suite du brouillon de l'élève au lieu de l'écraser (recommandation de Claude validée par David le 2026-10-18).

### Lot 4 — proposition détaillée (2026-10-18), à valider

Même grammaire que la carte de fonction (lot 3) : une ligne `● nom = [définition éditable]`, l'œil si l'objet se trace, un bouton menu ; même règle de menu (lot 3 bis). Le contenu des cartes point et courbe (nature, construction, coordonnées) appartient à la session atelier-geometry ; ce lot n'en fait que la mise en page.

| Type              | Sur la ligne                                                                  | Point de couleur → fenêtre | Menu : Affichage                    | Menu : Actions                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| valeur            | `a = [3]` ; avec unité `v = [3 m/s]` ; **curseur sous la ligne si paramètre** | —                          | Curseur (bornes, pas)               | Convertir (si unité)                                                                                                                                                     |
| suite explicite   | `u(n) = [2n+1]`                                                               | couleur, trait             | Nuage / escalier, nombre de marches | Premiers termes                                                                                                                                                          |
| suite récurrente  | `u(n+1) = [2u(n)+1]` puis `u(0) = [3]` en petit                               | idem                       | idem                                | idem                                                                                                                                                                     |
| liste             | `L = {3 ; 5 ; 8 ; …}` (12 valeurs), **non éditable sur la ligne**             | —                          | —                                   | Statistiques, Diagramme ; sous-menu **« Avec une autre liste »** (effectifs, probabilités, simuler, comparer, nuage, ajustement, tableau croisé) ; Modifier dans Données |
| liste qualitative | `C = {rouge ; vert ; …}` (8 modalités)                                        | —                          | —                                   | Effectifs, Diagramme en barres, Diagramme circulaire, Tableau croisé avec…                                                                                               |
| point             | `A = [(1 ; 2)]` ; construit : `M = [milieu(A, B)]` puis `(2 ; 3)` en gris     | couleur, taille            | Étiquette                           | (contenu : atelier-geometry)                                                                                                                                             |
| courbe            | `d : [y = 3x − 2]` + nature en étiquette discrète (« droite »)                | couleur, trait             | —                                   | (contenu : atelier-geometry)                                                                                                                                             |

Partout : Renommer et Supprimer en fin de menu ; un objet qui dépend d'un autre (dérivée, point construit) porte l'icône de lien + infobulle (lot 3).

**Précisions de la session atelier-geometry (2026-10-18), d'accord sur l'ensemble :**

- Point par coordonnées `A = [(1 ; 2)]` : éditable, sans ligne grise. Point CONSTRUIT `I = [milieu(A, B)]` : coordonnées exactes en gris dessous, non éditables (Q5 : oui).
- Courbe construite avec `=` : `d = [(AB)]`, `c = [cercle(O, 3)]`, `s = [[BC]]`, `r = [[CA)]` ; `:` reste aux équations (`d : [y = 3x − 2]`). Sous la ligne : la nature (droite, segment, demi-droite, cercle) et une donnée en gris (équation réduite, ou longueur d'un segment). Contenu livré par #1500 (`ObjectCard` : ligne `.valeur`, préfixe `=`/`:`, nature) ; le lot 4 le reprend tel quel et le place.
- À prévoir dans la grammaire : les mesures `S = aire(…)`, `L = distance(A, B)` sont des valeurs calculées **sans curseur**, même citées (G1) ; `M = point_sur(s, 0.3)` a un **curseur de position** (0 à 1) sous la ligne quand le 2ᵉ argument est un nombre ; une intersection sans solution est « en attente » avec sa raison.
- Couleur / taille / trait des points et courbes : la vue Géométrie ne les lit pas encore ; si le lot 4 ajoute les réglages (proposition : `CurveDisplay` comme les fonctions pour les courbes, `PointDisplay` couleur + taille pour les points, rangés avec l'état), atelier-geometry câble `syncFigure` derrière. Règle de version : le second qui merge prend version + 1.
- Points et courbes : aucune action propre au lot 2 de la géométrie au-delà de Renommer / Supprimer.

**Questions pour David (recommandation en premier) :**

1. **Liste : modifier où ?** (a) dans Données (le tableur), la ligne montre un aperçu tronqué ← recommandé : une liste de 30 valeurs ne s'édite pas dans un champ d'une ligne ; (b) champ éditable sur la ligne aussi.
2. **Actions à deux listes : un sous-menu « Avec une autre liste » → choix de la liste → action** ← recommandé (aujourd'hui un MySelect « avec… » dans la carte) ; ou une entrée par couple (liste longue).
3. **Valeur qui n'est pas un paramètre : curseur caché, à afficher depuis le menu** ← recommandé ; ou toujours visible.
4. **Suite récurrente : premier terme sur la même ligne** (`u(n+1) = … ; u(0) = 3`) ou **sous la ligne en petit** ← recommandé (deux champs éditables, lisibles sur téléphone).
5. **Point construit : coordonnées en gris à droite, non éditables**, la construction étant ce qu'on modifie ← recommandé ; à confirmer avec atelier-geometry.

## Lot 5 — Annuler / Rétablir (chantier à part)

Sa phase 0 vient après les lots 1 à 3. Voici les questions qu'elle devra trancher :

- **La granularité :**
  - une frappe dans une carte = une étape ? (proposition : une validation par Entrée = une étape) ;
  - un réglage de couleur = une étape ?
- **Le tableur :** une saisie de case est-elle dans la même pile que l'atelier ?
- **La console :**
  - annuler une ligne de console, est-ce effacer la ligne ou annuler son effet ? (proposition : effacer son effet ; la ligne reste, barrée) ;
  - l'Annuler de suppression d'aujourd'hui (10 s, Ctrl+Z) se fond dans la pile.
- **La taille de la pile :** est-elle rangée avec l'atelier, ou perdue au rechargement ? (proposition : perdue au rechargement)

## Ordre proposé

1. Lot 1 (barre, Enregistrer/Charger).
2. Lot 2 (console).
3. Lot 3 (cartes de fonction).
4. Lot 4 (réflexion, puis code).
5. Lot 5 (undo/redo).

La mise en forme des cases du tableur, qui touche aussi `persistence.ts`, est mergée (#1466, #1469) : le lot 1 part de cette version.
