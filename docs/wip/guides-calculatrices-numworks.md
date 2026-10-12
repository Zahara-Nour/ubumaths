# NumWorks (N0110 / N0120) : séquences de touches pour le guide élève

Recherche faite le 2026-10-12.

## Version d'Epsilon décrite, et décalage avec la version actuelle

- **Le manuel officiel décrit la version 20** (« Manuel d'utilisation, Version 20 » : https://www.numworks.com/fr/graphique/manuel/book.pdf, la même chose en HTML sous https://www.numworks.com/fr/graphique/manuel/).
- **La dernière version d'Epsilon est la version 26** (6 juillet 2026). Source : https://www.numworks.com/fr/graphique/mise-a-jour/. J'ai lu les notes des versions 21 à 26 (`…/mise-a-jour/version-21/` à `version-26/`) pour repérer ce que le manuel ne dit plus correctement. Les changements qui touchent ce guide :
  - **v23** : dans le Grapheur, l'option « Nombre dérivé » du manuel v20 devient le sous-menu **Dérivées**, avec **Valeur dérivée 1ère** et **Tracé dérivée 1ère**. Dans Régressions, « Linéaire » est renommé « Affine ».
  - **v24** : les puissances de 10 ne s'affichent plus `1ᴇ-3` : l'app Calculs affiche maintenant **`123×10³`**. En mode examen, les données sont rendues à la sortie (scripts, fonctions, listes, équations). On peut régler le pas des graduations. Il y a 6 tableaux en Statistiques (3 dans le manuel v20).
  - **v25** : en Calculs, des raccourcis **°** et **rad** en haut de la boîte à outils quand on édite une fonction trigo. Dans Suites, une option « Notation de suite » (Un+1 en fonction de Un, ou Un en fonction de Un-1). En Statistiques, des données catégorielles.
  - **v26** : un mode sombre et une loupe (Paramètres > Accessibilité). Des lois en plus dans la toolbox.
- **Statut « code officiel »** (une catégorie que j'ajoute) : libellés et comportements lus dans le **code source officiel d'Epsilon** (https://github.com/numworks/epsilon, branche master, poussée le 2026-10-12). C'est du NumWorks, mais ce n'est pas la documentation. J'y ai pris :
  - les chaînes d'interface françaises (`*.fr.i18n`) ;
  - la table des touches : `shared/ion/src/shared/layout_events/epsilon/layout_events.cpp` ;
  - les tests du moteur de calcul : `poincare/test/…`.
    Ces libellés sont plus récents que le manuel v20. En cas d'écart, je les donne en priorité.

### Noms des touches (attention)

Le manuel ne donne pas le libellé imprimé de chaque touche : il affiche des pictogrammes. Le code HTML du manuel les nomme `ok, back, home, shift, alpha, xnt, var, toolbox, del, exe, ans, pow, square, exp, ln, log, i, pi, comma, plus, minus, five…`. Je les écris ainsi :

| Dans ce guide                                                          | Nom dans le manuel                                        | Remarque                                                                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [OK] [back] [home] [EXE] [ans] [shift] [alpha] [var] [toolbox] [x,n,t] | ok, back, home, exe, ans, shift, alpha, var, toolbox, xnt | Le libellé exact imprimé (texte ou pictogramme) de [back], [home] et [toolbox] n'est **pas vérifié** (supposé : pictogrammes). |
| [⌫]                                                                    | `del`                                                     | Touche d'effacement. Son second rôle (shift) est `clear` (doc). Pictogramme supposé.                                           |
| [xʸ]                                                                   | `pow`                                                     | Insère `^` (code).                                                                                                             |
| [x²]                                                                   | `square`                                                  | Insère `^2` (code).                                                                                                            |
| [eˣ] [ln] [log] [i] [,] [sin] [cos] [tan] [π] [√]                      | exp, ln, log, i, comma, …                                 | Ce que chacune insère est confirmé par le code.                                                                                |
| [×10ˣ]                                                                 | (absent du manuel)                                        | Insère le caractère `ᴇ` (code). **Libellé imprimé supposé « ×10ˣ ».**                                                          |
| [÷] [×] [+] [−] [(] [)]                                                | —                                                         | [÷] insère `/` (code).                                                                                                         |

**Fonctions secondes, d'après le code** (`layout_events.cpp`). Toutes sont **[shift] puis la touche** (shift ne se maintient pas : on appuie dessus puis on la relâche) :

- [shift] [⌫] = clear
- [shift] [xʸ] = → (flèche sto / conversion)
- [shift] [sin] / [cos] / [tan] = arcsin / arccos / arctan
- [shift] [π] = `=`
- [shift] [√] = `<`
- [shift] [x²] = `>`
- [shift] [eˣ] / [ln] = `[` / `]`
- [shift] [log] / [i] = `{` / `}`
- [shift] [,] = `_`
- [shift] [x,n,t] / [var] / [toolbox] = couper / copier / coller

La doc confirme : [shift] [⌫] = clear, [shift] [xʸ] = →, [shift] [π] = `=`, [shift] [var] = copier, [shift] [toolbox] = coller.

**Couche [alpha], d'après le code** :

- [alpha] [⌫] = `%`
- [alpha] [x,n,t] = `:`
- [alpha] [var] = `;`
- [alpha] [toolbox] = `'` (depuis v23)
- [alpha] [.] = `!`
- [alpha] [0] = `?`
- lettres a…z : la doc confirme « l = [alpha] [x²] »

## Tâches non sourcées par la documentation officielle

- **Supposé ou partiel :**
  - (4)/(9) le gabarit de fraction obtenu par [÷] en écriture naturelle ;
  - (8) le comportement exact de [−] sur une ligne vide ;
  - (28) les listes Python : rien de propre à NumWorks dans la doc, c'est du Python standard ;
  - (16) ce que le mode examen **FR** bloque précisément.
- **Code officiel seulement, absent de la doc :**
  - (6) le pourcentage : touche `%` et sa sémantique ;
  - (30) `!` au clavier ;
  - (34) `-2^2`.
- **NON TROUVÉ** :
  - (17) un réglage « résultat exact / approché » : **il n'existe pas** dans Paramètres. Les deux formes s'affichent toujours côte à côte.
  - (25) un « solveur polynôme » distinct de l'app Équations : **il n'existe pas**. Les équations de degré 2 et 3 sont résolues exactement par Équations.

Abréviations des sources :

- MAN = https://www.numworks.com/fr/graphique/manuel/ (v20), avec ses sous-pages `calculs/`, `grapheur/`, `python/`, `statistiques/`, `probabilites/`, `equations/`, `suites/`, `parametres/`, `variables/`, `outils/`
- NV = notes de version https://www.numworks.com/fr/graphique/mise-a-jour/version-NN/
- GH = https://github.com/numworks/epsilon

---

## 6e

### (1) Effacer, corriger une saisie

- **Application** : Calculs (et toute ligne d'édition).
- **Étapes** :
  1. [⌫] efface le caractère à gauche du curseur.
  2. Les flèches gauche/droite déplacent le curseur dans la ligne. On peut ainsi corriger au milieu.
  3. Pour reprendre un calcul déjà fait : flèche haut jusqu'à l'expression dans l'historique, puis [OK]. Elle revient dans la ligne d'édition, modifiable.
  4. Effacer une ligne de l'historique : la sélectionner avec les flèches, puis [⌫].
  5. Effacer tout l'historique : sélectionner un élément de l'historique, puis [shift] [⌫] (clear).
- **Source** : MAN `calculs/` §1.1.4, §1.1.5.
- **Statut** : doc officielle. L'étape 2 est supposée : la doc ne la décrit pas explicitement.
- **Remarque** : distinguer « effacer ce que je tape » ([⌫]) et « vider l'historique » ([shift] [⌫]).

### (2) Les quatre opérations, priorités

- **Application** : Calculs.
- **Étapes** :
  1. Taper le calcul avec [+] [−] [×] [÷] [(] [)].
  2. [EXE].
  3. Le résultat exact s'affiche en noir, le résultat approché en gris.
- **Source** : MAN `calculs/` §1.1.1.
- **Statut** : doc officielle pour la saisie et [EXE]. Que la calculatrice respecte les priorités usuelles est supposé : c'est évident, mais la doc ne l'écrit pas.
- **Remarque** : en écriture naturelle, [÷] produit une fraction (cf. 9). Les parenthèses s'écrivent à la main.

### (3) Division euclidienne : quotient et reste

- **Application** : Calculs.
- **Étapes (méthode 1, toolbox)** :
  1. [toolbox] > **Arithmétique** > **Quotient de la division de p par q** → `quo(p,q)`.
  2. Même menu, **Reste de la division de p par q** → `rem(p,q)`.
  3. Exemple : `quo(80,39)` = 2 ; `rem(50,45)` = 5.
- **Étapes (méthode 2, résultats complémentaires)** :
  1. Taper `p/q` puis [EXE].
  2. Si le résultat est une fraction : flèche haut sur le résultat, sélectionner les **trois points** à droite, [OK].
  3. On obtient « Fraction mixte » et « Division euclidienne ».
- **Source** : MAN `outils/` (Arithmétique : rem, quo) ; MAN `calculs/` §1.2. Libellés de menu : GH `apps/toolbox.fr.i18n`.
- **Statut** : doc officielle, libellés exacts : code officiel.
- **Remarque** : la méthode 2 ne marche que si p/q n'est pas entier.

### (4) Fraction simple → écriture décimale

- **Application** : Calculs.
- **Étapes** :
  1. Taper `3` [÷] `4`.
  2. [EXE].
  3. La ligne montre le résultat exact (3/4) **et** la valeur approchée (0.75, en gris).
- **Source** : MAN `calculs/` §1.1.1 (« Le résultat exact est donné en noir alors que le résultat numérique approché apparait en gris »).
- **Statut** : doc officielle pour l'affichage des deux formes. **Supposé** : que [÷] crée un gabarit de fraction en écriture naturelle.
- **Remarque** : la NumWorks affiche **0.75 avec un point**, pas une virgule. La touche [,] sert de séparateur d'arguments.

### (5) Réutiliser le dernier résultat

- **Application** : Calculs.
- **Étapes** :
  1. [ans] : `Ans` s'insère et vaut le résultat exact précédent.
  2. Ou bien commencer directement par une opération : [+] `5` affiche `Ans+5`.
  3. Pour un résultat plus ancien : flèches jusqu'à lui dans l'historique, puis [OK].
- **Source** : MAN `calculs/` §1.1.2, §1.1.3.
- **Statut** : doc officielle.
- **Remarque** : avec [−], voir le piège (8).

### (6) Pourcentage : appliquer un pourcentage, proportion

- **Application** : Calculs.
- **Étapes** :
  1. Le signe `%` s'obtient par [alpha] [⌫].
  2. `80×20%` donne 16 (20 % de 80).
  3. **`80+20%` donne 80×(1+20/100) = 96** : c'est une hausse de 20 %, pas 80,2.
  4. `80−20%` donne 80×(1−20/100) = 64.
  5. Proportion : taper la division, par exemple `12` [÷] `48` [EXE], puis lire la valeur approchée (0.25 = 25 %).
- **Source** :
  - GH `layout_events.cpp` (couche alpha : `%` sur la touche d'effacement) ;
  - GH `poincare/test/simplification/simplification.cpp`, l. 372-391 (`80+20%` → `80×(1+20/100)`, `80*20%` → `80×20/100`) ;
  - GH `epsilon/tests/screenshots_dataset/calculation_percent/` (scénario de test avec la touche Percent).
- **Statut** : code officiel (absent du manuel v20). La séquence [alpha] [⌫] est déduite de la table des touches : **à vérifier sur la machine**.
- **Remarque** : piège majeur. `prix+20%` augmente déjà le prix, sans multiplier par 1,2.

### (7) Arrondir un affichage (unité, dixième, centième)

- **Application** : Calculs.
- **Étapes (arrondi d'un calcul)** :
  1. [toolbox] > **Nombres décimaux** > **Arrondi à n décimales** → `round(x,n)`.
  2. Exemples : `round(8.6576,2)` = 8.66 ; n = 0 pour l'unité, 1 pour le dixième.
- **Étapes (réglage global, pour info)** :
  1. [home] > **Paramètres** > **Format résultat** > **Chiffres significatifs**.
  2. Le maximum est 14.
- **Source** : MAN `outils/` (round) ; MAN `parametres/` (Format résultat). Libellé : GH `toolbox.fr.i18n` (`Rounding = "Arrondi à n décimales"`).
- **Statut** : doc officielle.
- **Remarque** : « Chiffres significatifs » n'est pas « nombre de décimales ». Pour un arrondi au centième, préférer `round(x,2)`. Valeur de `round(x,0)` : supposée, non testée dans la doc.

## Cycle 4

### (8) Nombre négatif / opposé, différence avec la soustraction

- **Application** : Calculs.
- **Étapes** :
  1. **Il n'y a pas de touche (−) séparée** : on utilise la même touche [−] pour l'opposé et pour la soustraction.
  2. Pour −3 × 4 : taper [−] `3` [×] `4`.
  3. Pour un négatif au milieu d'un calcul, l'entourer de parenthèses : `5×(−3)`.
- **Source** : MAN `calculs/` §1.1.2 : « La calculatrice NumWorks ne dispose que d'une seule touche “moins”. Appuyer sur la touche − affichera − tandis qu'appuyer deux fois sur la touche − affichera Ans−. »
- **Statut** : doc officielle pour la touche unique. **Supposé** : le comportement exact du premier appui juste après un calcul. Ailleurs, la doc dit qu'une touche d'opération en début de ligne insère `Ans` : la phrase citée laisse comprendre que le 1er appui donne `−` et le 2e `Ans−`. **À tester sur la machine.**
- **Remarque** : juste après un calcul, un appui sur [−] ne donne pas forcément `Ans−` : regarder la ligne d'édition avant de continuer.

### (9) Fractions : saisie (gabarit), forme irréductible, fraction ↔ décimal

- **Application** : Calculs.
- **Étapes** :
  1. Saisie : [÷] ouvre un gabarit de fraction (écriture naturelle). Taper le numérateur, puis flèche bas pour passer au dénominateur.
  2. Sortir du gabarit avec flèche droite.
  3. [EXE] : le résultat exact est donné sous **forme irréductible**. Exemple de la doc : 1/10 + 3/10 donne 2/5.
  4. Décimal → fraction : un calcul décimal donne un résultat décimal (0.1+0.3 → 0.4). « Sélectionnez le résultat décimal pour faire apparaitre le résultat exact. »
  5. Fraction approchée (v25+) : dans les résultats complémentaires, quand le résultat a plus de 5 décimales.
- **Réglage** : l'écriture naturelle se choisit dans [home] > **Paramètres** > **Format écriture** > **Naturelle** (l'autre option est « En ligne »).
- **Source** : MAN `calculs/` §1.1.1 ; MAN `parametres/` (Format écriture) ; NV `version-25/` (Fraction approchée) ; libellés GH `settings/i18n/base.fr.i18n`.
- **Statut** : doc officielle pour l'irréductible et le décimal. **Supposé** : [÷] crée le gabarit, et la navigation flèche bas / flèche droite.
- **Remarque** : en mode « En ligne », `1/2+3` ne se lit pas comme en mode naturel. Parenthéser.

### (10) Puissances, exposants négatifs, puissances de 10, notation scientifique

- **Application** : Calculs.
- **Étapes** :
  1. Puissance : `2` [xʸ] `5` [EXE]. Carré : [x²].
  2. Exposant négatif : `2` [xʸ] [−] `3`. L'exposant reste dans la case en exposant jusqu'à ce qu'on en sorte par flèche droite (supposé).
  3. Puissance de 10 à la saisie : [×10ˣ] insère `ᴇ`. Exemple : `3` [×10ˣ] `−4` pour 3×10⁻⁴.
  4. Affichage scientifique de tous les résultats : [home] > **Paramètres** > **Format résultat** > **Scientifique**. Un indicateur `sci` apparaît en haut de l'écran. Le choix par défaut est « Décimal ».
  5. Écriture scientifique d'un entier : résultats complémentaires (trois points, puis [OK]) > **Notation scientifique**.
- **Source** : MAN `parametres/` (Format résultat) ; MAN `calculs/` §1.2 ; NV `version-24/` (« vos résultats s'affichent sous la forme 123*10³ ») ; GH `layout_events.cpp` (la touche insère `ᴇ`).
- **Statut** : doc officielle pour l'affichage et les réglages. Code officiel pour le `ᴇ`. **Supposé** : le libellé imprimé de la touche [×10ˣ].
- **Remarque** : depuis v24, l'affichage est `×10ⁿ` et non plus `ᴇ`. Une calculatrice pas à jour affiche encore `1ᴇ-3`.

### (11) Racine carrée, π

- **Application** : Calculs.
- **Étapes** :
  1. [√] insère `√()`. Taper le nombre, puis [EXE].
  2. [π] insère π.
  3. Le résultat exact reste avec √ ou π (en noir), la valeur approchée est en gris.
- **Source** : GH `layout_events.cpp` (touches `√(` et `π`) ; MAN `calculs/` §1.1.1.
- **Statut** : code officiel pour les touches, doc officielle pour l'affichage.
- **Remarque** : `√(8)` s'affiche `2√2` en exact. Lire la valeur grise pour la valeur décimale.

### (12) Trigonométrie en degrés et fonctions réciproques

- **Application** : Paramètres, puis Calculs.
- **Étapes** :
  1. [home] > **Paramètres** > **Unité d'angle** > **Degrés**. Le bandeau en haut affiche `deg`.
  2. Dans Calculs : [cos] `60` [EXE] donne 1/2.
  3. Réciproques : [shift] [cos] = arccos, [shift] [sin] = arcsin, [shift] [tan] = arctan. Exemple : arccos(0.5) donne 60 en mode degrés.
  4. Depuis v25, en éditant une fonction trigo, [toolbox] propose des raccourcis **°** et **rad** en haut de la liste. On les trouve aussi dans [toolbox] > **Trigonométrie**.
- **Source** : MAN `parametres/` (Unité d'angle) ; GH `layout_events.cpp` (arcsin/arccos/arctan en shift) ; NV `version-25/`.
- **Statut** : doc officielle (réglage), code officiel (shift), NV (raccourcis °/rad).
- **Remarque** : depuis v21, la calculatrice prévient quand l'argument semble être en radians alors qu'elle est réglée en degrés (et inversement) (NV `version-21/`).

### (13) Moyenne, médiane, étendue

- **Application** : Statistiques.
- **Étapes** :
  1. [home] > **Statistiques**, onglet **Données**.
  2. Colonne **Valeurs V1** : les valeurs. Colonne **Effectifs N1** : remplie à 1 par défaut, à modifier si nécessaire.
  3. Remonter sur l'onglet **Stats**, [OK].
  4. Lire **Moyenne**, **Médiane**, **Étendue** (aussi Minimum, Maximum, Effectif total…).
- **Source** : MAN `statistiques/` (« Comment entrer vos données », « Savoir utiliser l'onglet Stats ») ; libellés GH `statistics/i18n/base.fr.i18n` (`Range = "Étendue"`) et `shared.fr.i18n` (`StatTab = "Stats"`, `DataTab = "Données"`).
- **Statut** : doc officielle.
- **Remarque** : depuis v25, l'app peut demander le **Type de données** (Quantitatives / Catégorielles). Choisir **Quantitatives**.

### (14) Nombre aléatoire et simulation

- **Application** : Calculs (ou Statistiques).
- **Étapes** :
  1. [toolbox] > **Probabilités** > **Aléatoire**.
  2. **Nombre décimal dans [0;1[** → `random()`.
  3. **Entier aléatoire dans [a;b]** → `randint(a,b)`. Exemple : `randint(1,6)` pour un dé.
  4. [EXE] à nouveau pour un nouveau tirage (supposé : relancer le calcul en le rappelant de l'historique).
  5. Simulation en série : dans Statistiques, sélectionner l'en-tête d'une colonne, [OK], **Remplir avec une formule**. Il existe un modèle « 10 nombres aléatoires entre 0 et 1 ».
- **Source** : MAN `outils/` (Aléatoire : random, randint, randintnorep) ; MAN `statistiques/` (Générer une liste à partir d'une formule) ; libellés GH `toolbox.fr.i18n`, `shared.fr.i18n` (`FormulaTemplateRand`).
- **Statut** : doc officielle. Supposé pour l'étape 4.
- **Remarque** : `random()` ne donne jamais 1.

### (15) Tableau de valeurs d'une fonction

- **Application** : Grapheur.
- Voir la tâche (18), mêmes étapes.
- **Statut** : doc officielle.

## Seconde

### (16) Mode examen

- **Application** : Paramètres.
- **Étapes d'activation** :
  1. [home] > **Paramètres** > **Mode examen**, [OK].
  2. Choisir le bouton d'activation, [OK]. Le manuel v20 dit « Activer le mode examen ». Le code contient aussi « Activer le mode examen FR », « … NL », « … UK »… Le libellé affiché dépend du réglage Pays : **libellé exact pour un élève français : supposé « Activer le mode examen » ou « Activer le mode examen FR »**.
  3. Un message d'avertissement s'affiche : choisir **Valider**, [OK].
- **Pendant l'examen** :
  - le bandeau du haut passe en jaune avec un symbole ;
  - la **LED clignote en rouge** ;
  - les données sont inaccessibles. Code : « Vos données seront inaccessibles en mode examen. Elles seront supprimées si la mémoire est insuffisante. »
- **Étapes de désactivation** :
  1. **Seulement en branchant la calculatrice à un ordinateur par câble USB.**
  2. Un message demande si l'on veut sortir du mode examen : **Valider**, [OK].
  3. Les données saisies pendant l'examen sont effacées.
  4. Depuis v24, on retrouve les données d'avant : scripts Python, expressions et fonctions, listes, équations. **Exception** : si une application externe est installée, la machine est réinitialisée.
- **Ce qui est bloqué en mode FR** : NON TROUVÉ dans la doc. Pour d'autres pays, le code indique que les modes NL et UK coupent Éléments et Python. Pour la France, les données sont masquées : supposé, Python reste accessible.
- **Source** : MAN `parametres/` (Mode examen) ; NV `version-24/` ; GH `settings/i18n/base.fr.i18n` et `shared.fr.i18n`.
- **Statut** : doc officielle (activation, sortie). Supposé : le libellé exact du bouton FR et la liste de ce qui est bloqué.
- **Remarque** : prévoir un câble et un ordinateur pour sortir du mode examen.

### (17) Réglages : unité d'angle, exact/approché, chiffres significatifs

- **Application** : Paramètres ([home] > **Paramètres**).
- **Rubriques** (libellés exacts, code v26) :
  - **Unité d'angle** : Degrés / Radians / Grades.
  - **Format résultat** : Décimal / Scientifique / Ingénieur, et **Chiffres significatifs** (14 au maximum).
  - **Format écriture** : En ligne / Naturelle.
  - **Forme complexe** : Réel, a+ib, re^iθ.
  - **Pays** : choisir **France** pour les conventions françaises.
  - Aussi : Luminosité, Mise en veille, Accessibilité (Mode sombre, Loupe), Police Python, Langue, Mode examen, À propos.
- **Exact / approché** : **NON TROUVÉ comme réglage** : il n'existe pas. Les deux formes s'affichent toujours dans l'app Calculs (exacte en noir, approchée en gris).
  - Dans le tableau de valeurs du Grapheur : option **Résultats exacts** sous la barre d'onglets.
- **Source** : MAN `parametres/` ; MAN `calculs/` §1.1.1 ; MAN `grapheur/` §2.4.2 ; GH `settings/i18n/base.fr.i18n`.
- **Statut** : doc officielle.

### (18) Définir une fonction, tableau de valeurs (pas, début)

- **Application** : Grapheur. Le manuel l'appelle aussi « application Fonctions » ; l'icône s'appelle **Grapheur**.
- **Étapes** :
  1. Onglet **Expressions** : sélectionner **Ajouter un élément**, [OK].
  2. Choisir un modèle ou taper directement. Pour un modèle : bouton **Modèles** à droite (v23).
  3. Taper l'expression. [x,n,t] donne `x`. [OK] pour valider.
  4. Tableau : bouton **Afficher les valeurs** en bas, ou onglet **Tableau**.
  5. Régler le tableau : **Régler l'intervalle** sous l'onglet Tableau, [OK].
  6. Saisir **X début**, **X fin** et **Pas**, puis **Valider**, [OK].
  7. On peut aussi taper une valeur de x à la main dans la colonne x.
- **Autre méthode** : depuis Calculs, `2x+3` [shift] [xʸ] (→) `f(x)` [EXE] crée f.
- **Source** : MAN `grapheur/` §2.1, §2.2.1, §2.4.1, §2.4.3 ; MAN `variables/` ; libellés GH `graph/i18n` et `shared.fr.i18n` (`IntervalSet = "Régler l'intervalle"`, `XStart = "X début"`, `XEnd = "X fin"`, `Step = "Pas"`).
- **Statut** : doc officielle.

### (19) Tracer, régler la fenêtre, zoomer

- **Application** : Grapheur, onglet **Graphique**.
- **Étapes** :
  1. Bouton **Tracer le graphique**, ou onglet **Graphique**, [OK].
  2. Sous l'onglet, trois options :
     - **Auto** : fenêtre automatique ;
     - **Axes** : Xmin, Xmax, Ymin, Ymax, et le pas des graduations depuis v24 ; aussi **Rendre orthonormé** ;
     - **Naviguer** : flèches pour déplacer, [+] / [−] pour zoomer.
  3. Dans la fenêtre graphique, [+] et [−] zooment et dézooment.
  4. Flèches gauche/droite : suivre la courbe. Flèches haut/bas : changer de courbe.
- **Source** : MAN `grapheur/` §2.3.2, §2.3.3 ; NV `version-24/`.
- **Statut** : doc officielle.

### (20) Image, zéro, intersection, maximum, minimum

- **Application** : Grapheur, onglet **Graphique**.
- **Étapes** :
  1. Placer le curseur sur la courbe.
  2. [OK] ou [toolbox] ouvre le menu de la courbe. On peut aussi aller dans **Calcul**, sous la barre d'onglets.
  3. **Image** : sélectionner la cellule **x**, taper l'abscisse, [OK]. On lit f(x) en bas de l'écran. On peut aussi taper la valeur directement au clavier, curseur sur la courbe.
  4. **Antécédent d'une valeur** : cellule **f(x)**, taper la valeur, [OK]. Ou bien **Rechercher** > **Antécédent**.
  5. **Rechercher**, [OK], puis :
     - **Zéros** ;
     - **Intersection** (avec une autre courbe) ;
     - **Maximum** ;
     - **Minimum** ;
     - aussi : **Tangente**, **Intégrale**, **Aire entre deux courbes**.
  6. Flèches gauche/droite : passer au point suivant dans la fenêtre.
- **Source** : MAN `grapheur/` §2.3.4 à §2.3.7 ; libellés GH `graph/i18n/base.fr.i18n` (`Find = "Rechercher"`, `Zeros = "Zéros"`, …) et `shared.fr.i18n` (`GraphCalculus = "Calcul"`).
- **Statut** : doc officielle.
- **Remarque** : le point cherché doit être **dans la fenêtre**. Sinon : « Aucun zéro trouvé dans cette fenêtre ».

### (21) Statistiques à une variable avec effectifs

- **Application** : Statistiques.
- **Étapes** :
  1. Onglet **Données** : **Valeurs V1** et **Effectifs N1**.
  2. Onglet **Stats**. On y lit :
     - Effectif total, Minimum, Maximum, Étendue ;
     - Moyenne, Écart type, Variance ;
     - Premier quartile, Médiane, Troisième quartile, Écart interquartile ;
     - Somme, Somme des carrés ;
     - Écart type échantillon, Variance échantillon ;
     - Mode et Effectif du mode.
  3. Graphiques : onglet **Graphique** > Histogramme, **Boîte à moustaches**, Fréquences cumulées…
  4. Effectifs cumulés : en-tête de colonne, [OK], **Colonne des ECC**.
- **Source** : MAN `statistiques/` ; libellés GH `statistics/i18n/base.fr.i18n`.
- **Statut** : doc officielle.
- **Remarque** :
  - prendre **« Écart type »** (σ, population), pas « Écart type échantillon » ;
  - la définition des quartiles dépend du réglage **Pays = France** : supposé, la doc dit seulement que le Pays « permet de définir les conventions mathématiques utilisées ».

### (22) Python : créer, écrire, exécuter un script ; appeler une fonction ; random

- **Application** : Python.
- **Étapes** :
  1. [home] > **Python**. La liste des scripts s'affiche.
  2. **Ajouter un script**, [OK]. Taper le nom avec [alpha] + lettres, en minuscules : seuls a-z, 0-9 et _ sont acceptés.
  3. Sélectionner le script, [OK] : l'éditeur s'ouvre.
     - [alpha] puis une lettre ; [alpha] [alpha] pour verrouiller les lettres ;
     - [toolbox] > **Boucles et tests**, **Modules**, **Catalogue**, **Fonctions** (`def …:` / `return`) ;
     - l'autocomplétion se valide par flèche droite ou [OK].
  4. Exécuter :
     - icône de réglages à côté du nom du script > **Exécuter le script** ;
     - ou bouton **Console d'exécution** en bas de la liste. Les scripts y sont importés automatiquement (`from script import *`), sauf si « Importation auto » est coupée.
  5. Dans la console, taper l'appel, par exemple `f(3)`, puis [EXE]. [var] liste les fonctions et variables des scripts importés.
  6. Interrompre un script : [back] (appui long si boucle infinie).
  7. random : `from random import *`, puis `randint(a,b)`, `random()`, `choice(liste)`, `uniform(a,b)`, `randrange(start,stop)`. On les trouve dans [toolbox] > **Modules** > **random**.
- **Source** : MAN `python/` §3.1 à §3.4 et « Le module random » ; libellés GH `code/i18n/base.fr.i18n` (`ExecuteScript = "Exécuter le script"`, `Console = "Console d'exécution"`).
- **Statut** : doc officielle. La séquence exacte « réglages > Exécuter le script » vient du libellé du code : la doc ne la décrit pas pas à pas.
- **Remarque** : MicroPython 1.17. Dans `math`, `log(x)` = ln(x).

## 1re spécialité

### (23) Suites

- **Application** : Suites.
- **Étapes** :
  1. **Ajouter une suite**, [OK].
  2. Choisir le type : **Explicite**, **Récurrente d'ordre 1** ou **Récurrente d'ordre 2**.
  3. Taper l'expression. [x,n,t] donne `n`. Pour une récurrence, `u(n)` et `u(n+1)` se tapent ou se prennent dans [toolbox].
  4. Pour une récurrente : renseigner le premier terme sous l'expression.
  5. Changer l'indice de départ : nom de la suite, [OK], **Indice premier terme**.
  6. Tableau : **Afficher les valeurs** ou onglet **Tableau**. **Régler l'intervalle** : **N début**, **N fin**, **Pas**.
  7. Graphique : **Tracer le graphique**.
  8. Menu de la suite ([OK] ou Calcul) : **Aller à**, **Somme des termes**, **Graphique en escalier**.
- **Source** : MAN `suites/` ; NV `version-25/` (Notation de suite) ; libellés GH `sequence/i18n/base.fr.i18n`.
- **Statut** : doc officielle.
- **Remarque** : depuis v25, l'option **Notation de suite** permet d'écrire Un en fonction de Un-1. Vérifier la notation affichée.

### (24) Nombre dérivé, tangente

- **Application** : Grapheur, onglet **Graphique** (ou Calculs).
- **Étapes (graphique)** :
  1. Curseur sur la courbe, [OK]. Ou menu **Calcul**.
  2. **Dérivées** > **Valeur dérivée 1ère**, [OK] pour activer.
  3. [back] : f'(x) s'affiche en bas de l'écran et une colonne apparaît dans le Tableau.
  4. Tangente : [OK] > **Rechercher** > **Tangente**. L'équation est en bas de l'écran. Déplacer avec les flèches, ou taper l'abscisse.
- **Étapes (calcul)** : [toolbox] > **Analyse** > **Dérivée** → `diff(f(x),x,a)`. Exemple : `diff(x^2,x,5)`.
- **Source** : MAN `grapheur/` §2.3.6, §2.3.7 ; MAN `outils/` (Analyse) ; NV `version-23/` (menu Dérivées) ; libellés GH `shared.fr.i18n` (`FirstDerivativeValue = "Valeur dérivée 1ère"`) et `toolbox.fr.i18n` (`DerivateNumber = "Dérivée"`).
- **Statut** : doc officielle, plus NV. Le manuel v20 dit « Nombre dérivé » dans la section Options : libellé **périmé**.

### (25) Racines d'un trinôme

- **Application** : Équations.
- **Étapes** :
  1. [home] > **Équations**, [OK] : **Ajouter une équation**.
  2. Choisir un modèle ou **Vide**.
  3. Taper `x^2−3x+2=0`. [x,n,t] donne x ; `=` = [shift] [π] (facultatif : ajouté automatiquement si absent).
  4. [OK].
  5. **Résoudre l'équation**, [OK]. Pour le second degré, les solutions sont **exactes** et le **discriminant** est affiché.
- **Solveur polynôme distinct** : NON TROUVÉ, il n'existe pas.
- **Source** : MAN `equations/` ; libellés GH `solver/i18n/base.fr.i18n`.
- **Statut** : doc officielle.
- **Remarque** : en l'absence de racine réelle, le message est « Le polynôme n'admet pas de racine réelle ».

### (26) Espérance et écart-type d'une variable aléatoire

- **Application** : Statistiques.
- **Étapes** :
  1. **Valeurs V1** = les valeurs xᵢ ; **Effectifs N1** = les probabilités pᵢ.
  2. Onglet **Stats** : **Moyenne** = E(X), **Écart type** = σ(X), **Variance** = V(X).
- **Source** : MAN `statistiques/` (« Vous pouvez aussi entrer des fréquences dans la colonne Effectifs »).
- **Statut** : doc officielle pour la saisie des fréquences. L'interprétation Moyenne = E(X) est une déduction mathématique, pas une phrase de la doc.
- **Remarque** :
  - vérifier que « Effectif total » vaut 1 ;
  - ne pas prendre « Écart type échantillon » ;
  - avec des effectifs non entiers, certains graphiques sont refusés, mais les Stats restent calculées (supposé).

### (27) Exponentielle, trigonométrie en radians

- **Étapes** :
  1. [eˣ] insère `e^()`. Taper l'exposant, puis [EXE].
  2. Radians : [home] > **Paramètres** > **Unité d'angle** > **Radians**. Le bandeau affiche `rad`.
- **Source** : GH `layout_events.cpp` ; MAN `parametres/`.
- **Statut** : code officiel (touche), doc officielle (réglage).
- **Remarque** : depuis v24, on peut graduer l'axe des x de π en π (Axes > pas).

### (28) Python : listes

- **Application** : Python.
- **Étapes** : Python standard (MicroPython 1.17) : `L=[1,2,3]`, `L.append(4)`, `len(L)`, `L[0]`, `for x in L:`, listes en compréhension.
  - `[` et `]` s'obtiennent par [shift] [eˣ] / [shift] [ln] (code).
  - Les fonctions se trouvent dans [toolbox] > **Catalogue**.
- **Source** : MAN `python/` (version MicroPython, Catalogue) ; GH `layout_events.cpp`.
- **Statut** : supposé pour les méthodes de liste : la doc NumWorks ne les détaille pas.
- **Remarque** : l'indice commence à 0 en Python. Dans l'app Calculs, les listes commencent à 1 (`L(4)` = 4ᵉ élément).

## Terminale spécialité

### (29) ln

- **Étapes** : [ln] insère `ln()`. `log` = base 10. `log(x,a)` = base a, dans [toolbox] > **Logarithme de base a**.
- **Source** : GH `layout_events.cpp` ; MAN `outils/`.
- **Statut** : code officiel et doc officielle.
- **Remarque** : en Python, `log(x)` calcule ln(x).

### (30) Factorielle, k parmi n

- **Étapes** :
  1. [toolbox] > **Probabilités** > **Dénombrement**.
  2. **Combinaison de k parmi n** → `binomial(n,k)`.
  3. **Factorielle** → `n!`.
  4. Le `!` se tape aussi au clavier avec [alpha] [.] (code).
- **Source** : MAN `outils/` (Dénombrement) ; libellés GH `toolbox.fr.i18n` ; GH `layout_events.cpp`.
- **Statut** : doc officielle. Code officiel pour [alpha] [.].
- **Remarque** : la doc montre un gabarit « saisie telle qu'à l'écrit » pour k parmi n (tutoriel vidéo « Réaliser un dénombrement de k parmi n »). Je n'ai pas vu la vidéo.

### (31) Loi binomiale

- **Application Probabilités** :
  1. [home] > **Probabilités** > **Loi binomiale** (Binomiale), [OK].
  2. Saisir n (**Nombre de répétitions**) et p (**Probabilité de succès**), puis **Valider**.
  3. Icône **Type de bornes** en haut à gauche, [OK]. Choisir **X=a**, **X≤a**, **a≤X** ou **a≤X≤b**.
  4. Saisir les bornes, [OK]. La probabilité s'affiche.
- **Boîte à outils (Calculs)** : [toolbox] > **Probabilités** > **Lois de probabilité** > **Loi binomiale** :
  - `binompdf(m,n,p)` = P(X=m) ;
  - `binomcdf(m,n,p)` = P(X≤m) ;
  - `binomcdfrange(a,b,n,p)` = P(a≤X≤b) : libellé présent dans le code v26 (« P(a≤X≤b) où X suit B(n,p) »), mais **absent du manuel v20**, et l'ordre exact des arguments est supposé.
- **Source** : MAN `probabilites/` ; MAN `outils/` (Loi binomiale) ; GH `toolbox.fr.i18n`, `distributions/i18n/base.fr.i18n`.
- **Statut** : doc officielle (sauf binomcdfrange : code officiel, arguments supposés).
- **Remarque** : sans binomcdfrange, calculer P(a≤X≤b) = binomcdf(b,n,p) − binomcdf(a−1,n,p).

### (32) Plus petit k tel que P(X ≤ k) ≥ seuil

- **Étapes** :
  1. Toolbox : `invbinom(a,n,p)` (**m où P(X≤m)=a et X suit B(n,p)**).
  2. Ou, dans l'app Probabilités, troisième étape : taper la probabilité dans le champ du résultat, [OK]. La borne s'affiche.
  3. Vérification par table : Statistiques ou Grapheur, avec la fonction `binomcdf(x,n,p)` en tableau de pas 1.
- **Source** : MAN `outils/` (invbinom) ; MAN `probabilites/` (« Calculer l'inverse d'une probabilité ») ; tutoriel officiel « Calculer une loi binomiale dans un tableau » (titre seulement : https://www.numworks.com/fr/graphique/tutoriels/statistiques/).
- **Statut** : doc officielle pour l'existence. **Supposé** : qu'invbinom rende bien le plus petit k tel que P(X≤k) ≥ a. La doc dit « P(X≤m)=a », ce qui est approximatif pour une loi discrète. **À vérifier par la table.**

### (33) Intégrale : valeur approchée

- **Étapes (graphique)** :
  1. Curseur sur la courbe, [OK] > **Rechercher** > **Intégrale**.
  2. Choisir la borne inférieure (flèches ou valeur tapée), [OK].
  3. Choisir la borne supérieure, [OK].
  4. Lire la valeur en bas de l'écran.
- **Étapes (calcul)** : [toolbox] > **Analyse** > **Intégrale** → `int(f(x),x,a,b)`. Exemple : `int(x^2,x,0,5)`.
- **Source** : MAN `grapheur/` §2.3.7 ; MAN `outils/` (Analyse) ; libellé GH `toolbox.fr.i18n` (`Integral = "Intégrale"`).
- **Statut** : doc officielle.

## (34) Pièges

1. **`-2^2`** : la NumWorks lit `-(2^2)` et affiche **−4**. Pour (−2)² = 4, taper `(−2)^2`.
   - **Source** : GH `poincare/test/parse.cpp`, l. 330 : `"-1^2"` est analysé comme `KOpposite(KPow(1,2))`, c'est-à-dire −(1²).
   - **Statut** : code officiel (absent de la doc).
2. **Fraction sans parenthèses** : en mode **En ligne**, `1/2x` ou `1+2/3+4` ne donnent pas ce qu'on croit. En mode **Naturelle**, le gabarit de fraction protège mieux.
   - **Statut** : supposé, la doc n'en parle pas. Conseil : Paramètres > Format écriture > **Naturelle** et parenthéser.
3. **`1ᴇ-3`** : signifie 1×10⁻³ = 0,001. Depuis v24, l'app Calculs affiche `1×10⁻³`. L'ancienne écriture `ᴇ` reste à la saisie (touche [×10ˣ]) et sur les machines non mises à jour.
   - **Source** : NV `version-24/`.
   - **Statut** : doc officielle (notes de version).
4. **Degrés / radians oublié** : vérifier `deg` ou `rad` dans le bandeau en haut de l'écran.
   - Depuis v21, un avertissement s'affiche quand l'argument semble être dans l'autre unité.
   - **Source** : MAN `parametres/` ; NV `version-21/`.
   - **Statut** : doc officielle.
5. **`80+20%` ≠ 80,2** : c'est 96 (hausse de 20 %).
   - **Source** : GH `poincare/test/simplification/simplification.cpp`.
   - **Statut** : code officiel.
6. **Point décimal** : la NumWorks écrit `0.75`, pas `0,75`. La touche [,] sépare des arguments.
   - **Statut** : doc officielle (exemples du manuel en `.`).

---

# Compléments niveaux ajoutés

Source des tâches : `docs/wip/guides-calculatrices-taches.md` (niveaux 5e/4e/3e, 1_GEN, 1_SPE, T_SPE, T_COMP, T_EXP, 1_TECHNO, T_TECHNO). Les tâches du CM sont ignorées. Mêmes abréviations (MAN, NV, GH) et mêmes statuts qu'au-dessus.

Source supplémentaire : MAN `regressions/` = https://www.numworks.com/fr/graphique/manuel/regressions/ (v20). Libellés v26 : GH `epsilon/apps/regression/i18n/base.fr.i18n`.

## Pourcentages et évolutions

### (C1) Coefficient multiplicateur, évolutions successives (4e, 3e, 2de, T_TECHNO)

- **Application** : Calculs.
- **Étapes** :
  1. Hausse de t % : `valeur×(1+t/100)`. Exemple : `80×1.2` [EXE].
  2. Baisse de t % : `80×0.85`.
  3. Évolutions successives : multiplier les coefficients, par exemple `1.2×0.85` [EXE], puis lire le taux global (coefficient − 1).
  4. Raccourci `%` ([alpha] [⌫]) : `80+20%` = 96 et `80−15%` = 68. Voir (6) : c'est une évolution, pas une addition.
  5. Taux entre deux valeurs : `(Va−Vd)/Vd` [EXE], puis `Ans×100`.
- **Source** : (6) au-dessus ; GH `poincare/test/simplification/simplification.cpp` l. 372-391.
- **Statut** : supposé pour les étapes 1-3 et 5 (arithmétique pure, rien de propre à NumWorks). Code officiel pour `%`.
- **Remarque** : `80+20%+20%` enchaîne deux hausses de 20 % (test GH : `80×(1+20/100)×(1+20/100)`).

### (C2) Taux d'évolution moyen (1+t)^(1/n) − 1 (1_GEN, T_TECHNO)

- **Étapes** : `(1+0.3)` [xʸ] `(1/5)` puis flèche droite pour sortir de l'exposant, `−1` [EXE]. Ou `root(1.3,5)−1` via [toolbox] > **Racine n-ième**.
- **Source** : MAN `outils/` (root(x,n)) ; libellé GH `toolbox.fr.i18n` (`NthRoot = "Racine n-ième"`).
- **Statut** : doc officielle (root). La sortie d'exposant par flèche droite est supposée.
- **Remarque** : en écriture naturelle, l'exposant est une case : vérifier que `−1` n'y est pas entré.

### (C3) Indice base 100 (T_TECHNO)

- **Étapes** : `Valeur/Valeur_référence×100` [EXE]. Pour toute une série : app **Statistiques** ou **Régressions**, en-tête de colonne > **Remplir avec une formule**, par exemple `Y1/Y1(1)*100`.
- **Source** : MAN `statistiques/` / `regressions/` (Remplir avec une formule, référence à une autre colonne) ; MAN `calculs/` §1.5.3 (élément d'une liste `L(4)`).
- **Statut** : supposé : la formule `Y1/Y1(1)*100` dans une colonne n'est pas un exemple de la doc.

## Arithmétique

### (C4) Décomposition en facteurs premiers (3e, T_EXP)

- **Étapes (méthode 1, toolbox)** : [toolbox] > **Arithmétique** > **Décomposition en facteurs premiers** → `factor(n)`. Exemple : `factor(24)` → 2³×3.
- **Étapes (méthode 2, résultats complémentaires)** :
  1. Taper l'entier, [EXE].
  2. Flèche haut sur le résultat, sélectionner les trois points, [OK].
  3. Lire **Facteurs premiers**.
- **Source** : MAN `outils/` (factor) ; MAN `calculs/` §1.2 ; libellés GH `toolbox.fr.i18n`, `calculation/i18n/base.fr.i18n`.
- **Statut** : doc officielle.

### (C5) Quotient et reste ; PGCD (T_EXP)

- **Quotient et reste** : voir (3), `quo(p,q)` et `rem(p,q)`.
- **PGCD et PPCM** : [toolbox] > **Arithmétique** :
  - **PGCD de p et q** → `gcd(p,q)` ;
  - **PPCM de p et q** → `lcm(p,q)`.
  - Les deux acceptent plus de deux entiers.
- **Source** : MAN `outils/` (Arithmétique).
- **Statut** : doc officielle.
- **Remarque** : la doc ne précise pas `rem` pour un dividende négatif (TEXP) : NON TROUVÉ.

### (C6) Calculs modulo n, aᵏ mod n (T_EXP)

- **Étapes** :
  1. **Aucune fonction `mod` dans la toolbox** (liste de la section Arithmétique : gcd, lcm, factor, rem, quo) : NON TROUVÉ.
  2. Utiliser `rem(a^k,n)`.
  3. Pour de grands exposants, Python : `a**k % n`, ou `pow(a,k,n)`.
- **Source** : MAN `outils/`.
- **Statut** : supposé :
  - jusqu'où les grands entiers exacts restent calculés : non documenté ;
  - la forme `pow(a,k,n)` en MicroPython sur NumWorks : non vérifiée ;
  - `%` en Python est l'opérateur modulo standard.
- **Remarque** : sur la calculatrice, `%` est un **pourcentage** dans Calculs et un **modulo** dans Python. Piège à signaler.

## Puissances et logarithmes

### (C7) x^(1/n), aˣ pour x réel (1_GEN, T_TECHNO)

- **Étapes** :
  - `a` [xʸ] `x` [EXE] ;
  - racine n-ième : [toolbox] > **Racine n-ième** → `root(x,n)`, ou `x` [xʸ] `(1/n)`.
- **Source** : MAN `outils/` (root ; « Vous pouvez donner une valeur non entière à n ») ; GH `layout_events.cpp` ([xʸ] insère `^`).
- **Statut** : doc officielle et code officiel.
- **Remarque** : `8^1/3` sans case d'exposant ni parenthèses calcule (8¹)/3.

### (C8) Logarithme décimal `log` ; résoudre aˣ = b, xᵃ = b (T_TECHNO)

- **Étapes** :
  1. [log] insère `log()` = logarithme **décimal**. [ln] = népérien.
  2. Autre base : [toolbox] > **Logarithme de base a** → `log(x,a)`.
  3. aˣ = b : `log(b)/log(a)`, ou `log(b,a)`.
  4. xᵃ = b (x > 0) : `b^(1/a)`.
  5. Vérification : app **Équations**, en tapant l'équation.
- **Source** : GH `layout_events.cpp` (touche `log(`) ; MAN `outils/` (log(x,a)) ; MAN `python/` (« log10(x) … = log(x) », qui identifie `log` au logarithme décimal hors Python) ; MAN `equations/`.
- **Statut** : doc officielle et code officiel.
- **Remarque** : en Python, `log(x)` est **ln** et le décimal est `log10(x)`. C'est l'inverse de l'app Calculs.

## Statistique à deux variables

### (C9) Point moyen, droite de régression, r (1_GEN, T_COMP, 1_TECHNO)

- **Application** : **Régressions**.
- **Étapes** :
  1. Onglet **Données** : colonnes **X1** et **Y1**.
  2. Onglet **Graphique** : le nuage s'affiche.
  3. [OK] ou menu **Régression** sous la barre d'onglets > **Modèle** > **Affine** (y = ax+b).
  4. Le menu **Régression** donne l'**Équation de la régression**, **Coeff. corrélation** r (modèle affine) et **Coeff. détermination**.
  5. Interpoler / extrapoler : menu **Régression** > **Prédiction sachant X** (ou **Prédiction sachant Y**), taper la valeur, **Valider**, [OK].
  6. Point moyen : onglet **Stats** = moyenne des xᵢ et moyenne des yᵢ. Le code v26 a aussi un libellé **Point moyen** dans l'app, mais son emplacement n'est pas documenté : supposé, sur le graphique.
- **Source** : MAN `regressions/` ; NV `version-23/` (renommage) ; GH `regression/i18n/base.fr.i18n` (`MeanDot = "Point moyen"`, `Linear = "Affine"`, `CorrelationCoeff = "Coeff. corrélation"`, `XPrediction = "Prédiction sachant X"`).
- **Statut** : doc officielle, plus code officiel pour les libellés v26.
- **Remarque** : **piège de vocabulaire**. Depuis v23, « Affine » = y = ax+b et « Linéaire » = y = ax. Le manuel v20 dit encore « Linéaire / Proportionnelle ».

### (C10) Changement de variable (ln y, log y, 1/t) puis régression (T_COMP, T_TECHNO)

- **Étapes** :
  1. App **Régressions**, tableau 2 : en-tête **X2**, [OK] > **Remplir avec une formule** > **Vide**, puis taper `X1`.
  2. En-tête **Y2** > **Remplir avec une formule** : `ln(Y1)` (ou `log(Y1)`, `1/Y1`).
  3. Les majuscules s'obtiennent par [shift] [alpha] puis la lettre.
  4. Sur la série 2 : **Modèle** > **Affine**.
  5. Alternative directe : modèle **Exponentiel** (deux formes) sur la série 1.
- **Source** : MAN `regressions/` (« vous pouvez écrire X1/2 pour remplir la colonne Y1 ») ; libellés GH.
- **Statut** : doc officielle pour le mécanisme. Supposé : la formule `ln(Y1)` exacte (la doc ne donne que `X1/2`), et que la série 1 masque bien la série 2 au tracé.
- **Remarque** : préciser à l'élève sur quelle série il lit a et b.

## Lois de probabilité

### (C11) Loi géométrique (T_COMP)

- **Application Probabilités** :
  1. **Loi géométrique**, [OK].
  2. **Probabilité de succès** p, **Valider**.
  3. **Type de bornes** : **X=a** ou **X≤a**.
  4. Saisir a, [OK].
- **Toolbox** : [toolbox] > **Probabilités** > **Lois de probabilité** > **Loi géométrique** :
  - `geompdf(m,p)` = P(X=m) ;
  - `geomcdf(m,p)` = P(X≤m) ;
  - `geomcdfrange(m,n,p)` ;
  - `invgeom(a,p)`.
- **Convention** : X = **nombre d'essais jusqu'au premier succès, k ∈ {1,2,3,…}**, donc P(X=k) = (1−p)^(k−1)p, ce qui correspond au programme.
- **Source** : MAN `probabilites/` ; MAN `outils/` ; GH `epsilon/apps/distributions/models/distribution/geometric_distribution.h` (commentaire « k number of trials needed to get one success, where k ∈ {1, 2, 3, ...} »).
- **Statut** : doc officielle, plus code officiel pour la convention.

### (C12) Loi exponentielle (T_COMP)

- **Application Probabilités** :
  1. **Loi exponentielle**, [OK].
  2. **Paramètre** λ (réel > 0), **Valider**.
  3. **Type de bornes** : X≤a, a≤X ou a≤X≤b.
- **Toolbox** : depuis v26, des lois en plus y apparaissent. Les libellés du code sont « P(X≤m) où X suit Exp(λ) », « P(m≤X≤n) où X suit Exp(λ) » et « m où P(X≤m)=a et X suit Exp(λ) ».
  - **Nom de la commande insérée : NON TROUVÉ** dans la doc. Supposé `expcdf…`.
  - Plus simple : `1−e^(−λx)` avec [eˣ].
- **Source** : MAN `probabilites/` ; NV `version-26/` ; GH `apps/toolbox.fr.i18n` (`ExpCDF`, `ExpCDFRange`, `InvExp`).
- **Statut** : doc officielle (app). Code officiel pour les libellés toolbox, nom de commande NON TROUVÉ.

## Nombres complexes (T_EXP)

### (C13) Forme algébrique, conjugué, inverse, module, argument ; format d'affichage

- **Réglage** : [home] > **Paramètres** > **Forme complexe** :
  - **Réel** : les résultats complexes ne sont pas affichés, `√(−1)` → nonreal ;
  - **a+ib** : forme algébrique ;
  - **re^iθ** : forme exponentielle.
- **Saisie** : la touche [i] insère i. Exemple : `(2+3i)×(1−i)` [EXE]. Inverse : `1/(2+3i)`.
- **Fonctions** : [toolbox] > **Nombres complexes** :
  - **Module** → `abs(z)` ;
  - **Argument** → `arg(z)` ;
  - **Partie réelle** → `re(z)` ;
  - **Partie imaginaire** → `im(z)` ;
  - **Conjugué** → `conj(z)`.
- **Forme trigonométrique** : il n'y a pas de format trigonométrique dédié (NON TROUVÉ). Utiliser la forme exponentielle (réglage re^iθ) ou les **résultats complémentaires**. Ceux-ci donnent module, argument, parties réelle et imaginaire, et depuis v22 la conversion en forme polaire.
- **Source** : MAN `calculs/` §1.2, §1.3 ; MAN `parametres/` (Forme complexe) ; NV `version-22/` ; GH `layout_events.cpp` (touche `i`).
- **Statut** : doc officielle.
- **Remarque** : **l'argument dans la forme exponentielle est toujours en radians**, même en mode degrés (doc). `arg(z)` suit-il l'unité d'angle ? La doc dit « en radians » pour l'exemple : supposé, radians.

### (C14) Racines complexes d'un trinôme (T_EXP)

- **Étapes** :
  1. Régler **Forme complexe** sur **a+ib**.
  2. App **Équations**, taper `x^2+x+1=0`, **Résoudre l'équation**.
- **Source** : MAN `equations/` ; GH `solver/i18n` (« Le polynôme n'admet pas de racine réelle »).
- **Statut** : supposé : la doc ne dit pas que le réglage a+ib fait afficher les racines complexes. En mode Réel, le message affiché est « Le polynôme n'admet pas de racine réelle ».

### (C15) Suite complexe z(n+1) = a z(n) + b (T_EXP)

- **App Suites** : NON TROUVÉ dans la doc, qui ne parle que de suites réelles (tableau, graphique). Supposé : non géré.
- **Contournement** :
  1. Dans Calculs, taper z₀ [EXE].
  2. Taper `a×Ans+b` [EXE].
  3. Chaque [EXE] suivant donne le terme suivant (supposé : [EXE] sur une ligne vide relance le dernier calcul ; sinon, rappeler la ligne par flèche haut puis [OK], et [EXE]).
- **Statut** : supposé.

## Matrices (T_EXP)

### (C16) Saisir une matrice, produit, inverse, puissance, système A⁻¹B, Markov

- **Saisie (méthode 1, clavier)** : `[[1,2][3,4]]`, avec `[` = [shift] [eˣ] et `]` = [shift] [ln].
- **Saisie (méthode 2, toolbox)** : [toolbox] > **Matrices et vecteurs** > **Nouvelle matrice ou vecteur**.
- **Stocker** : `[[1,2][3,4]]` [shift] [xʸ] (→) `M1` [EXE]. Pour la majuscule : [shift] [alpha] puis la lettre.
- **Calculs** :
  - produit `M1*M2` ;
  - puissance `M1^5` ;
  - inverse `M1^(-1)` ou `inverse(M1)` ;
  - aussi `det`, `transpose`, `identity(n)`, `ref`, `rref`.
- **Système** : `inverse(A)*B` avec B matrice colonne `[[5][6]]`. Ou bien l'app **Équations**, qui résout les systèmes linéaires exactement (jusqu'à 6 équations).
- **Markov** : `[[0.5,0.5]]*P^n` (vecteur ligne × puissance de matrice).
- **Source** : MAN `calculs/` §1.4 ; MAN `outils/` (Matrices et vecteurs) ; MAN `variables/` ; MAN `equations/`.
- **Statut** : doc officielle. La forme du vecteur colonne `[[5][6]]` et l'exemple Markov sont supposés, par analogie avec la syntaxe documentée.

### (C17) Suite matricielle U(n+1) = A U(n) + C (T_EXP)

- **App Suites** : NON TROUVÉ (supposé non géré).
- **Contournement** : dans Calculs, U₀ [EXE], puis `A*Ans+C` [EXE] répété. Même réserve que (C15).
- **Statut** : supposé.

## Suites, limites, encadrements

### (C18) Conjecturer la limite d'une suite au tableau de termes (1_SPE, T_SPE, T_COMP)

- **Application** : Suites.
- **Étapes** :
  1. Définir la suite (voir 23).
  2. Onglet **Tableau** > **Régler l'intervalle**.
  3. Saisir **N début**, **N fin** et **Pas** (par exemple 0, 1000, 100), puis **Valider**.
  4. On peut aussi taper un grand n directement dans la colonne n.
  5. Pour une récurrente : menu de la suite > **Graphique en escalier**.
- **Source** : MAN `suites/` (§7.4.1, §7.4.2, §7.3.5) ; libellés GH `sequence/i18n/base.fr.i18n` (`NStart = "N début"`, `NEnd = "N fin"`).
- **Statut** : doc officielle.
- **Remarque** :
  - le nombre de chiffres affichés suit **Chiffres significatifs** (10 par défaut depuis v22, NV `version-22/`) ;
  - une valeur arrondie n'est pas une limite.

### (C19) Somme des termes ; seuil (1_GEN, T_COMP, 1_TECHNO, T_TECHNO)

- **Somme des termes (graphique)** : menu de la suite > **Somme des termes**, choisir le premier puis le dernier terme.
- **Somme des termes (tableau, v21+)** : option de colonne « Somme des termes » (« A partir du premier terme »).
- **Somme des termes (calcul)** : [toolbox] > **Analyse** > **Somme** → `sum(f(i),i,m,n)`.
- **Seuil** : Tableau de la suite, faire défiler jusqu'au premier n qui dépasse la valeur.
- **Source** : MAN `suites/` §7.3.4 ; NV `version-21/` ; GH `sequence/i18n` (`ShowSumOfTerms`) ; MAN `outils/` (sum).
- **Statut** : doc officielle. L'emplacement exact de l'option Somme dans le Tableau est supposé : menu de l'en-tête de colonne.

### (C20) Encadrer la solution de f(x) = k par un tableau à pas affiné (4e, T_COMP, 1_TECHNO)

- **Application** : Grapheur, onglet **Tableau**.
- **Étapes** :
  1. **Régler l'intervalle** : X début = 0, X fin = 5, Pas = 1. Repérer le changement de f(x) − k de part et d'autre de k, par exemple entre 2 et 3.
  2. Recommencer avec X début = 2, X fin = 3, Pas = 0.1, puis Pas = 0.01, etc.
  3. Vérification :
     - Graphique > **Calcul** > cellule **f(x)** = k, ou **Rechercher** > **Antécédent** ;
     - ou app **Équations** (solution approchée, avec un **Intervalle de recherche** modifiable depuis v23).
- **Source** : MAN `grapheur/` §2.4.1, §2.3.5 ; MAN `equations/` ; NV `version-23/`.
- **Statut** : doc officielle.
- **Remarque** : le tableau affiche des valeurs arrondies (chiffres significatifs). Pour un encadrement, lire le changement de sens de l'inégalité, pas l'égalité.

## Divers petits ajouts

### (C21) Variable mémoire, substitution (5e, E)

- **Étapes** :
  1. `5` [shift] [xʸ] (→) [alpha] `a` [EXE] stocke 5 dans a.
  2. On l'utilise ensuite dans un calcul, par exemple `3a+2` [EXE].
  3. [var] liste les variables.
- **Source** : MAN `variables/`.
- **Statut** : doc officielle.

### (C22) Résoudre x² = a (3e)

- **Étapes** : app **Équations**, taper `x^2=a`, **Résoudre l'équation**. Les solutions exactes ±√a s'affichent (second degré).
- **Source** : MAN `equations/`.
- **Statut** : doc officielle.

### (C23) Espérance avec des listes (1_TECHNO, T_TECHNO)

- **Étapes (Calculs)** :
  1. `{x1,x2,…}` [shift] [xʸ] `X`.
  2. `{p1,…}` → `P`.
  3. `sum(X*P)` [EXE]. Le produit de deux listes se fait terme à terme.
- **Alternative** : voir (26).
- **Source** : MAN `calculs/` §1.5 (listes, produit terme à terme, sum).
- **Statut** : doc officielle. Les noms de variables à une lettre majuscule sont supposés autorisés.

### (C24) Déciles (T_COMP, « douteux »)

- **Étapes** : NON TROUVÉ. L'onglet Stats ne donne que les quartiles (doc). Trier la série (**Trier**) et repérer le rang à la main.
- **Statut** : doc officielle pour l'absence.

### Tâches de la liste sans complément NumWorks

Elles sont déjà couvertes au-dessus ou sont de l'arithmétique simple :

- 5e : π, aire, volume, diviser par un décimal ;
- 5e : blocs fx-92+, sans objet sur NumWorks ;
- 4e : grandeurs quotients, quatrième proportionnelle ;
- 1_GEN : sommet d'une parabole, voir (20) Maximum/Minimum ;
- 1_GEN : p^k(1−p)^(n−k), calcul direct ;
- T_COMP : Euler, rectangles, trapèzes, voir Python (22) ;
- T_TECHNO : somme des carrés des écarts, listes (C23) ;
- T_TECHNO : asymptotes, Grapheur (19).

---

## Vérifications dans le code source d'Epsilon (2026-10-12)

Dépôt officiel cloné dans `extern/numworks-epsilon` du dépôt principal (ignoré par git). `master` =
branche `version-26` ; une branche par version majeure (`origin/version-19` … `version-26`), les
étiquettes s'arrêtent à 23.2.3. Comparer deux versions : `git diff origin/version-23
origin/version-26 -- '*.fr.i18n'`.

| Doute                    | Verdict                                                                                                    | Preuve                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Bouton du mode examen    | « Activer le mode examen FR » (existe aussi « Activer le mode examen » générique)                          | `*.fr.i18n` : `ActivateFrenchExamMode`                                          |
| Ce que bloque le mode FR | **Aucune application ni fonction** : seules les données deviennent inaccessibles (Python reste ouvert)     | `poincare/include/poincare/exam_mode.h` : `French` absent de tous les `forbid*` |
| `invbinom(a,n,p)`        | **Plus petit k tel que P(X ≤ k) ≥ a** — recalculé : (0,95 ; 100 ; 0,42) → 50, P(X≤49)=0,935, P(X≤50)=0,957 | `poincare/test/approximation/probability.cpp` l. 13-18                          |
| Ordre de `binomcdfrange` | `binomcdfrange(a,b,n,p)`                                                                                   | `epsilon/apps/shared.universal.i18n` l. 115                                     |
| Loi exponentielle        | `expcdf(m,λ)` — **nouveau en v26** (absent des branches version-24 et 25)                                  | `shared.universal.i18n` l. 134 ; `git grep` par branche                         |
| Loi géométrique          | `geompdf(m,p)`, `geomcdf(m,p)`                                                                             | `shared.universal.i18n` l. 154-156                                              |
| `!`                      | `[alpha] [.]` ; `?` = `[alpha] [0]` ; espace = `[alpha] [−]`                                               | `shared/ion/include/ion/keyboard/epsilon/ion/keys.inc` l. 41-43                 |
| Régressions              | « Affine » = y = ax+b (`Linear`), « Linéaire » = y = ax (`Proportional`)                                   | `*.fr.i18n`                                                                     |
| Point moyen              | libellé « Point moyen » existe (`MeanDot`)                                                                 | `*.fr.i18n`                                                                     |
| Nombre dérivé            | « Valeur dérivée 1ère » (`FirstDerivativeValue`)                                                           | `*.fr.i18n`                                                                     |

---

## Vérifications au simulateur (2026-10-12)

Simulateur officiel Epsilon **v26** compilé depuis le code source
(`extern/numworks-epsilon/epsilon/output/release/macos/arm64/epsilon.bin --headless`), langue fr,
pays France (réglage par défaut). Chaque scénario rejoue les touches de la séquence, puis l'écran
final est relu sur la capture. Scénarios et captures (hors dépôt) :
`scratchpad/numworks-sim/<id-de-tâche>/`. Le simulateur fait foi sur le manuel v20 ; les séquences
de `src/lib/calculatrices/models/numworks.ts` portent `checkedInSimulator: '2026-10-12'` quand
elles sont conformes ou corrigées. **Rien n'est relu sur la vraie machine** (`verifiedOnDevice: false`
partout).

### Corrections apportées au brouillon

| Tâche                                                           | Le brouillon disait                                  | Le simulateur montre                                                                                                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| clear-input (1)                                                 | flèche haut jusqu'à l'expression, puis [OK]          | [▲] sélectionne d'abord le **résultat** ([OK] recopie le résultat) ; [◀] passe sur le calcul                                                                                   |
| euclidean-division (3), méthode 2                               | les « … » donnent la division euclidienne de p par q | ils divisent la **fraction simplifiée** : 50/45 → « 10=9×1+1 ». Méthode retirée, devenue un piège                                                                              |
| square-root (11)                                                | (rien)                                               | une flèche droite après 3² **ferme la racine** : √(3²)+4² = 19. Ne pas sortir avant la fin                                                                                     |
| settings (17), complex-numbers (C13)                            | Forme complexe : « a+ib », « re^iθ »                 | libellés « **Algébrique** » et « **Exponentielle** » ; Chiffres significatifs = 10 au départ                                                                                   |
| exam-mode (16)                                                  | « Activer le mode examen FR » ?                      | pays France : « **Activer le mode examen** », puis Annuler / **Valider** ; un chapeau de diplômé apparaît en haut                                                              |
| graph-analysis (20)                                             | « Intersection »                                     | « **Point d'intersection** », seulement avec deux courbes ; menu Rechercher : Antécédent, Maximum, Minimum, Zéros, Tangente, Intégrale                                         |
| binomial (31), exponential-law (C12)                            | « Valider » après n et p                             | le bouton s'appelle « **Suivant** » ; le type de bornes est l'icône à gauche du calcul                                                                                         |
| sequences (23)                                                  | taper l'expression, puis le premier terme dessous    | la case d'une récurrente contient **déjà uₙ** (effacer : [shift] [⌫]) ; u₀ vaut 1 par défaut, se change par [OK] [▼] [⌫]                                                       |
| python-basics (22)                                              | « icône de réglages » à côté du script               | ce sont les « **…** » : Exécuter le script, Renommer, Importation auto, Supprimer le script                                                                                    |
| modular (C6)                                                    | `pow(a,k,n)` en Python (non vérifié)                 | **refusé** (`TypeError: function takes 2 positional arguments`) ; `a**k % n` marche                                                                                            |
| real-power (C7), decimal-log (C8), integral, derivative-tangent | gabarits de la boîte à outils non décrits            | l'ordre de saisie des cases : ⁿ√ curseur sous la racine puis [◀] pour l'indice ; logₐ base puis [▶][▶] ; ∫ borne du bas, [▲] borne du haut, [▶] f(x) ; dérivée f(x) puis [▶]×3 |
| one-variable-stats (21)                                         | « Écart type »                                       | l'écran écrit « Ecart type », « Etendue » (sans accent)                                                                                                                        |
| quadratic-roots (25)                                            | app « Équations »                                    | l'écran d'accueil écrit « **Equations** » (sans accent, chaîne `SolverApp`)                                                                                                    |
| loan-annuity (optionnelle)                                      | non traitée                                          | application **Finance** > Intérêts composés > Pmt : 10 000 à 3 % sur 60 mois → −179.69                                                                                         |

Confirmations utiles du brouillon : `80+20%` = 96 (affiché `80↗20%`), `80−20%` = 64 ; sur ligne
vide, [+] [×] [÷] reprennent le résultat, [−] commence un négatif ; [EXE] sur ligne vide refait le
dernier calcul (donc `3×Ans+1` itère une suite, et `randint` retire) ; `-2²` = −(2²) = −4 ;
`rem(−7,3)` = 2 ; `invbinom(0.95,20,0.3)` = 9 ; `geomcdf(3,0.2)` = 0.488 (X ≥ 1) ;
`expcdf(2,0.5)` = 0.632 ; quartiles « France » (Q1 = 12, Q3 = 15 sur la série d'essai) ; en
Python, `17%5` = 2 et `log(10)` = 2.302585 (ln) ; `random()<0.3` rend True/False.

### Résultat par tâche

| Tâches                                                                                                                                                                                                                   | Résultat                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| basic-operations, fraction-to-decimal, last-answer, percentage, round-display, negative-number, parentheses-priorities, fraction-input, square-cube, pi, percentage-evolution-5                                          | conforme                                                                                                    |
| table-of-values, mean, relative-products, fraction-simplify, multiplier-coefficient, median-range, random-simulation, equation-by-table                                                                                  | conforme                                                                                                    |
| negative-exponents, scientific-notation, prime-factorization, trigonometry-degrees, linear-function-image, quartiles-college, percentage-evolution-3                                                                     | conforme                                                                                                    |
| define-function, plot-function, one-variable-stats, evolution-rates, average-rate, sequence-terms-gen, regression-gen, sequence-limit, quadratic-roots, random-variable, exponential, radians                            | conforme                                                                                                    |
| python-lists (console), sequence-terms-techno, scan-solution, derivative-techno, regression-techno, expectation-techno, bernoulli-simulation                                                                             | conforme                                                                                                    |
| natural-log, factorial-combinations, binomial-inverse, threshold-tspe, sequence-limit-tspe, complex-roots, arithmetic, matrices, markov                                                                                  | conforme                                                                                                    |
| recurrent-sequence-comp, log-exp-comp, solve-approx-comp, binomial-comp, geometric-law, regression-comp, variable-change-comp, integral-comp, index-base-100, real-power-techno, variable-change-techno, binomial-techno | conforme                                                                                                    |
| clear-input, euclidean-division, square-root, settings, graph-analysis, binomial, exponential-law, sequences, complex-numbers, modular, real-power, decimal-log, integral, derivative-tangent                            | corrigé (voir le tableau des corrections)                                                                   |
| loan-annuity                                                                                                                                                                                                             | ajouté (Finance), conforme                                                                                  |
| exam-mode                                                                                                                                                                                                                | **partiel** : activation conforme ; la sortie (câble USB) et la diode ne se vérifient pas au simulateur     |
| python-basics                                                                                                                                                                                                            | **partiel** : menu « … » et console vérifiés ; création et édition d'un script non rejouées (saisie longue) |
| threshold-python                                                                                                                                                                                                         | **non vérifiable** dans le temps imparti : script complet à saisir lettre par lettre                        |
| block-programming                                                                                                                                                                                                        | sans objet sur NumWorks (tâche optionnelle omise)                                                           |

### Ce qui reste douteux

- Les **libellés imprimés** des touches (retour, accueil, boîte à outils, ×10ˣ) : le simulateur
  n'affiche pas le clavier. Libellés descriptifs dans `keys`, à confirmer sur la machine.
- La **diode** du mode examen et sa sortie par USB.
- Les scénarios rejouent des événements déjà traduits (`Percent`, `UpperX`…) : la combinaison
  physique ([alpha] [⌫] pour %, [shift] [alpha] + lettre pour une capitale) vient de la table
  `layout_events.cpp`, pas du rejeu.
- [▶] sur « Zéros » pour passer au zéro suivant : la capture prise juste après ne montrait pas
  encore le déplacement ; l'étape a été retirée des séquences.
