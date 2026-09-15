---
title: Atelier de recherche de l'élève — Phase 0, comportements attendus
date: 2026-09-15
status: SPÉCIFICATION — D1 à D8 tranchées par David le 2026-09-15, aucun code écrit
scope: v1 (Calcul · Graphe · Données) + les deux garanties /grapheur
---

# Phase 0 — comportements attendus

Cadrage, décisions et périmètre : [`atelier-recherche-eleve.md`](atelier-recherche-eleve.md).
Ce document ne décrit que le **v1** (§10 du cadrage) : vues Calcul, Graphe et
Données. La géométrie (v2) et Python (v3) sont hors sujet ici.

Chaque ligne est destinée à devenir un test. **Les huit décisions de modèle du §9
ont été tranchées par David le 2026-09-15**, toutes dans le sens des
recommandations ; les comportements décrits ci-dessous s'y conforment. Seul le
plafond de D8 restait à chiffrer — la valeur proposée y est signalée comme telle.

Convention de lecture : **N** = cas nominal, **L** = cas limite, **E** = cas
d'erreur.

---

## 1. Le modèle d'objet

Un **objet** de l'atelier = un **nom** + une **définition** + un état
d'affichage. C'est l'unité que les trois vues se partagent.

### Les quatre types du v1

| Type         | Exemple                      | Créé depuis    | Utilisable dans                         |
| ------------ | ---------------------------- | -------------- | --------------------------------------- |
| **valeur**   | `a = 3`, `d = 12 km`         | Calcul, Graphe | Calcul, Graphe (curseur), Données       |
| **fonction** | `f(x) = x^2 - 3x + 1`        | Calcul, Graphe | les trois                               |
| **suite**    | `u_0 = 2 ; u_{n+1} = 0,5u_n` | Graphe         | Graphe, Données                         |
| **liste**    | `L = [12 ; 15 ; 9]`          | Données        | Calcul (stats), Graphe (nuage), Données |

La **liste** est le seul type qui n'existe nulle part aujourd'hui. C'est le
chaînon qui relie une colonne du tableur, les statistiques du CAS, le nuage de
points et les termes d'une suite (cadrage §11, point 5).

### Ce que l'existant impose

| Fait vérifié le 2026-09-15                                                                                                                 | Conséquence pour la spec                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `RESERVED_PARAMETER_NAMES = {x, n, e, pi, i}` (`grapheur/types.ts:247`)                                                                    | Ces cinq noms sont refusés à tout objet                                              |
| `PARAMETER_NAMES = [a,b,c,k,m,p,q,r]`, et `nextParameterName` **retombe sur `a`** quand les huit sont pris (`types.ts:262`)                | ⚠️ Défaut existant : il faut un 9ᵉ nom, pas une collision silencieuse (§2.1 L1)      |
| `createEvaluator` compile `fn({ x })` en dur (`grapheur/evaluator.ts:209`) ; le champ `variable` d'`ExplicitFunction` est stocké et ignoré | `f(t) = t^2` ne peut pas être tracé en v1 → décision **D2**                          |
| `EvalState` tient `bindings` et `functions` dans **deux registres séparés** (`cli/core/eval-state.ts:31`)                                  | Rien n'empêche aujourd'hui `f` d'être à la fois valeur et fonction → décision **D1** |
| Le tableur a déjà un `dependency-graph` et le code d'erreur `#CIRC!`                                                                       | Les dépendances circulaires ont déjà une réponse à réutiliser (§2.3 L2)              |

### Les quatre états d'un objet

Un objet n'est pas « sain ou en erreur » : **quatre états**, et leur ordre de
priorité compte (décision D9, tranchée le 2026-09-15).

| État             | Sens                                                                    | Réparable par l'élève                |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| **`error`**      | Définition illisible, ou circulaire, ou qui dépend d'un objet en erreur | En corrigeant                        |
| **`pending`**    | La définition cite un ou plusieurs noms que l'atelier ne connaît pas    | **Tout seul**, dès que le nom arrive |
| **`incomplete`** | Définition vide — état normal pendant qu'on cherche                     | En la complétant                     |
| **`ok`**         | Exploitable                                                             | —                                    |

**Priorité : `error` > `pending` > `incomplete` > `ok`.** Une définition qu'on
ne sait pas lire ne peut rien promettre : l'erreur prime sur l'attente.

La distinction `error` / `pending` est le cœur du §2.5. Elle existe parce que
« en attente de `f` » est une **aide**, alors que « erreur » est un reproche —
et parce que l'attente se répare d'elle-même.

### Nommage

Un nom est **une lettre latine**, éventuellement suivie d'un indice numérique
(`a`, `f`, `L`, `u`, `a_1`). Il est **unique dans tout l'atelier, tous types
confondus** (décision D1).

Noms proposés automatiquement à la création : `f, g, h` pour les fonctions,
`u, v, w` pour les suites (`SEQUENCE_NAMES` existe), `a, b, c, k, m, p, q, r`
pour les valeurs (`PARAMETER_NAMES` existe), `L, M, N` pour les listes.

---

## 2. Cycle de vie d'un objet

### 2.1 Création

| #      | Cas                                                              | Attendu                                                                                        |
| ------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **N1** | `f(x) = x^2 - 3x + 1` saisi dans Calcul                          | Objet `f` de type fonction dans le panneau ; ses actions (§3) apparaissent sur lui             |
| **N2** | `a = 3` saisi dans Calcul                                        | Objet `a` de type valeur, avec un curseur (décision D3)                                        |
| **N3** | « + Fonction » dans la vue Graphe                                | Objet nommé automatiquement (`f`, sinon `g`…), définition vide, curseur de saisie placé dedans |
| **N4** | Coller une colonne de nombres dans Données                       | Propose de créer une liste, nommée `L`                                                         |
| **N5** | Un résultat de l'historique de Calcul → « garder sous le nom … » | Devient un objet nommé. C'est le geste « je tiens quelque chose » de la recherche              |
| **L1** | Créer un 9ᵉ objet valeur                                         | ⚠️ Un 9ᵉ nom est proposé (`a_1`), **jamais** une collision silencieuse sur `a`                 |
| **L2** | Définition laissée vide                                          | L'objet existe, marqué « incomplet » ; rien n'est tracé ; **aucune erreur affichée**           |
| **E1** | `x = 3`                                                          | Refus : « `x` est le nom de la variable, choisis une autre lettre »                            |
| **E2** | `f(x) = x^^2` (non analysable)                                   | L'objet existe et **porte** son erreur ; l'atelier reste utilisable                            |
| **E3** | Nom invalide (`2f`, `f g`)                                       | Refus, avec la règle rappelée                                                                  |

### 2.2 Nommage et collisions

| #      | Cas                                       | Attendu                                                                                                    |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **N1** | Renommer `f` en `g`, `g` étant libre      | Renommé partout ; les définitions qui citent `f` sont mises à jour, et on le dit (« 2 objets mis à jour ») |
| **L1** | Renommer `f` en `g`, `g` étant pris       | Refus : « `g` est déjà utilisé ». Pas de fusion, pas d'écrasement                                          |
| **L2** | Renommer un objet dont dépendent d'autres | Les références suivent (N1). C'est ce qu'attend un élève                                                   |
| **E1** | Nom réservé (`x`, `n`, `e`, `pi`, `i`)    | Refus, avec la raison                                                                                      |
| **E2** | `u` est une suite, on saisit `u = 5`      | Refus : un seul espace de noms (D1)                                                                        |

### 2.3 Modification

| #      | Cas                                               | Attendu                                                                                                                                                                     |
| ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | Modifier `f`                                      | Tout ce qui en dépend se recalcule : courbe, tableau, dérivée affichée, objets qui la citent                                                                                |
| **N2** | Bouger le curseur `a`                             | Les courbes qui utilisent `a` se redessinent. Le chemin « seul le curseur a bougé » est déjà optimisé côté grapheur                                                         |
| **L1** | Rendre `f` non analysable alors que `g` en dépend | La courbe de `f` disparaît, `f` porte son erreur, `g` passe en **erreur** elle aussi (elle dépend d'un objet illisible, pas d'un objet absent) — **l'atelier ne casse pas** |
| **L2** | `f(x) = g(x) + 1` et `g(x) = f(x) - 1`            | Circularité détectée et nommée en français ; aucun blocage, aucune boucle infinie                                                                                           |

### 2.4 Suppression

| #      | Cas                                   | Attendu                                                                                                                                                        |
| ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | Supprimer `f`                         | Disparaît du panneau ; sa courbe, son tableau et ses affichages disparaissent                                                                                  |
| **L1** | Supprimer `f` alors que `g` en dépend | Prévenir (« `g` utilise `f` »), puis laisser faire : `g` passe **en attente de `f`**, il ne disparaît pas. `f` peut revenir — c'est une absence, pas une faute |
| **L2** | Supprimer le dernier objet            | Atelier vide et prêt. ⚠️ **Pas** de `x^2` ajouté d'office — différence assumée avec `/grapheur` aujourd'hui                                                    |

### 2.5 Les objets en attente

Quand une définition cite un nom que l'atelier ne connaît pas, l'objet est
**en attente**, et l'atelier **nomme ce qui manque**.

Le défaut que ça répare est mesuré, et il est en production :
`parseCustomSafe('zzz(x) + 1')` rend un AST valide sans erreur, et
`parseFunction` du grapheur rend `success: true`. Une fonction inconnue est donc
acceptée en silence aujourd'hui, la courbe ne se trace pas, et rien ne l'explique.

| #      | Cas                                                     | Attendu                                                                                                                        |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **N1** | `f(x) = zzz(x) + 1`, `zzz` inconnu                      | `f` est **en attente de `zzz`**, pas en erreur. Rien n'est tracé, et le panneau dit ce qui manque                              |
| **N2** | L'élève définit ensuite `zzz`                           | `f` redevient exploitable **sans aucune action de sa part**                                                                    |
| **N3** | `f(x) = a·x`, `a` inconnu et **lettre seule**           | En attente de `a`, **plus une offre** : « créer le curseur `a` »                                                               |
| **N4** | L'élève accepte l'offre                                 | Une valeur `a` est créée avec son curseur [−10 ; 10] (décision D3) ; `f` devient exploitable                                   |
| **N5** | Plusieurs noms manquent                                 | Tous sont nommés, pas seulement le premier                                                                                     |
| **N6** | Deux lettres seules manquent                            | Une offre de curseur **par lettre** — jamais une offre groupée qui crée plusieurs objets d'un coup                             |
| **L1** | `sin(x)`, `ln(x)`, `sqrt(x)`…                           | Jamais en attente : les 45 fonctions de `FUNCTION_COMMANDS` sont connues du moteur                                             |
| **L2** | `x` dans une fonction, `n` dans une suite               | Jamais en attente : c'est la variable de l'objet lui-même                                                                      |
| **L3** | `e`, `pi`, `i`                                          | Jamais en attente : ce sont des constantes (noms réservés)                                                                     |
| **L4** | `zzz(x)` — identifiant **suivi d'une parenthèse**       | En attente, **sans** offre de curseur : c'est une fonction qui manque, pas une valeur                                          |
| **L5** | L'élève ignore l'offre                                  | L'objet reste en attente. **Rien n'est créé d'office** — une offre ignorée ne coûte rien, un curseur parasite, si              |
| **L6** | `f(x) = xz` (faute de frappe pour `x^2`)                | En attente de `z` + offre. L'élève voit immédiatement le nom parasite : c'est le même message qui sert la faute et l'intention |
| **E1** | `zzz(x) ^^ 2` — illisible **et** nom inconnu            | **Erreur**, pas attente : on ne promet rien d'une définition qu'on ne sait pas lire (priorité du §1)                           |
| **E2** | Circularité **et** nom inconnu                          | **Erreur** : même priorité                                                                                                     |
| **E3** | L'offre est acceptée alors que le nom vient d'être pris | Refus normal du §2.2, avec son message                                                                                         |

**Ce que l'attente n'est pas.** Un nom inconnu n'est jamais une erreur de
saisie à corriger tout de suite : pendant qu'il cherche, l'élève écrit
légitimement `g(x) = f(x) + 1` avant d'avoir défini `f`. L'attente confirme ce
qu'il sait déjà dans ce cas-là, et lui montre sa faute dans les deux autres
(frappe, fonction qui n'existe pas) — **un seul message pour trois situations**.

---

## 3. Les actions attachées aux objets

C'est le mécanisme de progressivité 6ᵉ → terminale (cadrage §6). **Règle
générale : une action apparaît si elle a un sens pour le TYPE de l'objet.** Si
elle a un sens pour le type mais échoue sur ce cas précis, elle reste **visible
et désactivée avec sa raison** — sinon l'élève conclut que l'outil ne sait pas
faire.

| Type         | Actions du v1                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| **valeur**   | régler le curseur (min, max, pas) · convertir (si unité) · renommer · supprimer                          |
| **fonction** | tracer · dériver · tabuler · résoudre `f(x) = 0` · variations · image d'un nombre · renommer · supprimer |
| **suite**    | tracer (nuage ou escalier) · tabuler les premiers termes · renommer · supprimer                          |
| **liste**    | statistiques · nuage de points · ajustement affine · renommer · supprimer                                |

| #      | Cas                                                      | Attendu                                                                       |
| ------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **N1** | L'atelier ne contient que des valeurs                    | Aucune action « dériver » nulle part — c'est la progressivité                 |
| **N2** | Une fonction est créée                                   | Ses actions apparaissent **sur elle**, jamais dans une barre de menus globale |
| **N3** | Une action produit un objet (dériver)                    | Voir décision **D7** : nouvel objet, ou affichage attaché ?                   |
| **N4** | Une action produit un affichage (variations)             | Affiché près de l'objet, sans créer d'objet                                   |
| **L1** | Variations d'une fonction que le CAS ne sait pas traiter | L'action est **visible, désactivée, avec la raison en français**              |
| **E1** | Une action échoue au calcul                              | Message en français ; l'objet et l'atelier restent intacts                    |

---

## 4. La vue Données et les listes

Le type nouveau, donc le plus à spécifier.

| #      | Cas                                                        | Attendu                                                                                                                   |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **N1** | Saisir des nombres dans une colonne                        | Une liste nommée, utilisable depuis les autres vues                                                                       |
| **N2** | Action « statistiques » sur `L`                            | Effectif, moyenne, médiane, min, max, étendue, écart-type, variance — le CAS les a déjà                                   |
| **N3** | Nuage de points de `L` (abscisses) et `M` (ordonnées)      | Tracé dans Graphe. **Le grapheur ne sait tracer aucun nuage aujourd'hui** : c'est du neuf                                 |
| **N4** | Ajustement affine sur deux listes                          | Crée une **fonction** `f(x) = ax + b` comme objet, traçable, avec son coefficient de détermination                        |
| **N5** | Tabuler `f` sur un intervalle                              | Un tableau **affiché** ; un geste séparé « garder comme listes » pour s'en servir ailleurs                                |
| **L1** | `L` et `M` de longueurs différentes pour un nuage          | Seules les paires complètes sont tracées, et on le dit (« 3 valeurs ignorées »)                                           |
| **L2** | Liste vide                                                 | Statistiques indisponibles, message clair, aucune erreur                                                                  |
| **L3** | Liste à une seule valeur                                   | Moyenne, médiane, min, max = cette valeur ; écart-type = 0 ; **ajustement affine impossible**, avec la raison             |
| **L4** | Liste très longue                                          | Plafond à fixer (**D8**), en tenant compte du poids dans l'URL (§6)                                                       |
| **E1** | Valeur non numérique dans une colonne utilisée comme liste | Ignorée **et signalée** ; le reste de la liste fonctionne                                                                 |
| **E2** | `3,14` et `3.14`                                           | Les deux acceptés comme décimaux. ⚠️ Le **séparateur de liste est le point-virgule**, jamais la virgule — voir ci-dessous |

> ⚠️ **Virgule décimale contre virgule séparatrice.** Le tokenizer distingue
> aujourd'hui `1,2` (décimal) de `1, 2` (séparateur) — par l'espace, correction
> de la phase 4 du chantier calculatrice. Cette règle est intenable pour un
> collégien : une espace de trop change le sens. En v1, **le séparateur est le
> point-virgule**, et l'atelier le dit dans son aide.

---

## 5. La persistance locale

| #      | Cas                                          | Attendu                                                                                                                                                                                 |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | Recharger la page                            | L'atelier est comme on l'a laissé : objets, curseurs, fenêtre, vue active                                                                                                               |
| **N2** | Modifier quoi que ce soit                    | Sauvegarde différée (le grapheur a déjà un délai de 500 ms)                                                                                                                             |
| **L1** | Quota de stockage dépassé                    | ⚠️ **Prévenir et proposer d'exporter ou de supprimer.** Ne jamais perdre en silence — aujourd'hui `calculator.svelte.ts:444` réduit l'historique de moitié puis le vide, sans rien dire |
| **L2** | État enregistré par une version plus récente | Ne pas l'écraser ; prévenir et proposer de l'exporter. Le schéma du grapheur rejette déjà `version > GRAPH_STATE_VERSION`                                                               |
| **L3** | État corrompu                                | Atelier vide et message ; jamais d'écran blanc                                                                                                                                          |
| **L4** | Deux onglets ouverts sur le même atelier     | Le dernier qui écrit gagne (déjà le cas), **mais on prévient** que l'autre onglet a écrit                                                                                               |
| **L5** | Un ancien `chiphre-grapheur-state` existe    | Repris une fois dans l'atelier ; les fonctions anonymes reçoivent un nom (`f`, `g`…) ; l'ancienne clé est **conservée** le temps d'une version                                          |
| **E1** | Navigation privée, stockage refusé           | L'atelier fonctionne en mémoire et **prévient** qu'il ne sera pas conservé                                                                                                              |

---

## 6. L'URL : partage et mode éphémère

Deux usages qu'il ne faut pas confondre :

- **(a) partager son atelier** — élève → prof, élève → élève ;
- **(b) ouvrir un contenu sans toucher au sien** — le prof qui projette, l'élève
  qui reçoit un énoncé.

La **lecture** de ce que porte une URL suit la règle de provenance du §6 bis.

| #      | Cas                                                  | Attendu                                                                                                                                                                      |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | « Partager »                                         | Choix de **portée** : _cette vue_ ou _tout l'atelier_ (garantie de la décision figée n° 5)                                                                                   |
| **N2** | Lien copié                                           | Confirmation explicite                                                                                                                                                       |
| **N3** | Ouvrir un lien reçu                                  | **Mode éphémère** : le contenu s'affiche, l'atelier personnel n'est pas touché, une bannière le dit                                                                          |
| **N4** | Depuis le mode éphémère, « garder dans mon atelier » | Fusion, en réglant les collisions de noms selon §2.2                                                                                                                         |
| **N5** | `/grapheur?f=x^2-3x+1`                               | Forme courte et lisible, une courbe, écran épuré (§7)                                                                                                                        |
| **L1** | Contenu trop volumineux pour une URL                 | ⚠️ Prévenir **avant** de copier, et proposer de réduire la portée ou d'exporter un fichier. Aujourd'hui `/calc` refuse après coup au-delà de 400 caractères                  |
| **L2** | URL tronquée par le transport (mail, ENT)            | « Lien incomplet » ; jamais d'ouverture à moitié                                                                                                                             |
| **L3** | URL produite par une version plus récente            | « Ce lien vient d'une version plus récente » ; rien n'est ouvert partiellement                                                                                               |
| **E1** | URL corrompue                                        | Message, atelier intact. `/calc` le fait déjà                                                                                                                                |
| **E2** | Contenu hostile dans l'URL                           | Liste blanche de caractères, motifs interdits, bornes de taille, **validation Zod avant toute utilisation** — comme `CalculatorContainer.svelte` aujourd'hui. Non négociable |

> ⚠️ **À écrire maintenant pour ne pas l'oublier en v3.** Une URL est une entrée
> non fiable, et celles-ci circuleront entre élèves. En v1 le contenu est du texte
> mathématique. Dès que Python entre dans l'atelier, **du code venu d'une URL ne
> doit jamais s'exécuter sans une action explicite de l'utilisateur.**

---

## 6 bis. La syntaxe d'entrée : le parseur suit la provenance

Décision **D10**, tranchée le 2026-09-15. **Ce n'est pas le contenu qui décide du
parseur, c'est d'où vient la définition** — parce qu'on connaît toujours la
provenance, alors que deviner d'après le texte casse sur les mélanges.

### Les faits mesurés qui commandent cette règle

| Mesure                                        | Résultat                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `parseCustomSafe('\frac{1}{2}')`              | **échec** — le parseur custom rejette le LaTeX                                  |
| `parseLatexSafe('sin(x)')`                    | « réussit » en lisant `s·i·n·(x)` — **faux, et silencieux**                     |
| `detectInputFormat('sin(x)')`                 | custom 0,9 → lu `\sin(x)` ✅                                                    |
| `detectInputFormat('sin(x) + \frac{1}{2}')`   | **latex 0,9** → `sin` redevient `s·i·n` ⚠️ le mélange casse la détection        |
| `MathfieldElement.inlineShortcuts` (Chromium) | `sin → \sin`, `cos → \cos`, `ln → \ln` — la frappe produit donc du LaTeX propre |
| `setValue('sin(x)', {format:'latex'})`        | rend `sin(x)` **tel quel** — un collage n'est PAS normalisé                     |

### La règle

| Provenance                         | Lecture                           | Pourquoi                                             |
| ---------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Frappe dans un champ de maths      | **LaTeX**                         | Les raccourcis garantissent `\sin`, `\frac`, `\sqrt` |
| Clavier virtuel de l'atelier       | **LaTeX**                         | Il insère via le champ de maths                      |
| **Collage** dans un champ de maths | Détection, **puis normalisation** | On ne sait rien de ce qui arrive (§6 bis, N1)        |
| Paramètre d'**URL**                | Détection                         | Un prof écrit ses liens à la main (§7 N2)            |
| Mode commande (saisie texte)       | Détection                         | L'élève tape au clavier                              |
| Import de fichier, stockage local  | **LaTeX**                         | C'est l'atelier qui l'a écrit                        |

**Repli sur ambiguïté** (confiance 0,5) : **custom** pour une entrée texte,
**LaTeX** pour un champ de maths. Deux conséquences à connaître : `a/b` devient
une fraction plutôt qu'une division en ligne — même valeur, affichage différent,
et c'est ce qu'un élève veut dire ; `e` reste la constante d'Euler, ce qu'un prof
attend en écrivant `?f=e^x`.

### Normalisation au collage

Ce qui est collé est **relu puis réécrit en LaTeX dans le champ**, pour que
l'élève voie immédiatement ce que l'atelier a compris.

| #      | Cas                                          | Attendu                                                                             |
| ------ | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| **N1** | Coller `sin(x)`                              | Détecté custom → le champ affiche `\sin(x)`, « sin » en romain, pas trois italiques |
| **N2** | Coller `\frac{1}{2}`                         | Détecté LaTeX → inséré tel quel                                                     |
| **N3** | Coller dans un champ non vide                | Même règle, inséré à la position du curseur                                         |
| **L1** | Collage ambigu (confiance 0,5)               | LaTeX, le format du champ — on n'invente pas                                        |
| **L2** | Coller un texte qui n'est pas une expression | Reçu tel quel ; l'objet passera en erreur à la lecture. Aucun plantage              |
| **E1** | Collage vide                                 | Rien ne se passe                                                                    |

### Entrée par URL

| #      | Cas                           | Attendu                                                              |
| ------ | ----------------------------- | -------------------------------------------------------------------- |
| **N1** | `?f=x^2-3x+1`                 | Lu et créé                                                           |
| **N2** | `?f=sin(x)` (écrit à la main) | Détecté custom → `\sin(x)` : le lien du prof marche sans échappement |
| **N3** | `?f=%5Csin(x)` (LaTeX encodé) | Détecté LaTeX → même résultat                                        |
| **E1** | Contenu illisible             | L'objet est créé **en erreur**, avec son message ; l'atelier s'ouvre |

⚠️ La détection ne remplace **jamais** la validation du §6 E2 : on valide
d'abord (liste blanche, bornes, Zod), on détecte ensuite. Une URL reste une
entrée non fiable.

---

## 7. `/grapheur` : ouverture épurée et mode éphémère

Les deux garanties de la décision figée n° 5. La tension à résoudre : l'écran de
projection doit être propre, mais on ne doit pas perdre son travail. **Deux
entrées distinctes la lèvent.**

| #      | Cas                                      | Attendu                                                                                                                               |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | `/grapheur` sans paramètre               | Vue Graphe **seule**, panneau replié, pas d'onglets visibles. L'atelier enregistré est bien là — on ne perd rien                      |
| **N2** | `/grapheur?f=…`                          | **Mode éphémère** : écran propre, cette courbe seule, l'atelier enregistré n'est ni affiché ni modifié. C'est l'entrée « projection » |
| **N3** | Déplier le panneau                       | Les objets apparaissent ; l'état déplié ou replié est retenu pour la prochaine fois                                                   |
| **N4** | « Repartir de zéro »                     | Vide l'atelier, avec confirmation. Geste visible, pour préparer une séance                                                            |
| **L1** | Atelier vide sur `/grapheur`             | Un champ de saisie vide et prêt. ⚠️ **Pas** de `x^2` d'office — différence assumée avec aujourd'hui                                   |
| **L2** | Depuis `/grapheur`, l'élève veut dériver | L'action est sur l'objet ; l'utiliser peut déplier le panneau. Rien n'est caché définitivement                                        |

---

## 8. Explicitement hors v1

La géométrie (v2) · Python (v3) · l'annulation globale (décision **D6**) · le
mode présentation · l'export PDF · la validation, la correction et l'assignation
(décision figée n° 2) · l'échelle logarithmique · les graduations en multiples de
π · le plein écran du grapheur (manque indépendant, cadrage §13) ·
`f(t) = t^2` (décision **D2**).

---

## 9. Décisions de modèle — tranchées le 2026-09-15

David a validé les huit recommandations. Elles ne sont plus à re-proposer.

| #      | Question                                                             | Ma recommandation                                                                                                                              |
| ------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | Un seul espace de noms, ou un par type ?                             | **Un seul.** Sinon `f` valeur et `f` fonction coexistent et `f(2)` devient ambigu                                                              |
| **D2** | `f(t) = t^2` accepté ?                                               | **Non en v1** : `x` pour les fonctions, `n` pour les suites, avec un message clair. `createEvaluator` code `x` en dur ; on le répare plus tard |
| **D3** | Toute valeur numérique est-elle pilotable par un curseur ?           | **Oui**, bornes `[-10 ; 10]` par défaut (constantes existantes), ajustables. C'est un geste de recherche puissant                              |
| **D4** | Une valeur avec unité (`d = 12 km`) ?                                | Acceptée dans Calcul, **sans curseur et non traçable** — un curseur sur une grandeur n'a pas de sens clair                                     |
| **D5** | Que devient l'historique de Calcul ?                                 | Il reste (comme aujourd'hui), et on peut **promouvoir** un résultat en objet nommé                                                             |
| **D6** | Annulation globale (undo/redo) dans l'atelier ?                      | **Hors v1.** `geometry-core` en a un, mais il est lié à son graphe d'objets                                                                    |
| **D7** | `f'` est-il un objet à part entière, ou un affichage attaché à `f` ? | **Les deux gestes**, distincts : « afficher la dérivée » (attaché, comme aujourd'hui) et « garder `f'` » (objet)                               |
| **D8** | Combien de valeurs au maximum dans une liste ?                       | ⚠️ La méthode est validée, **pas le nombre** — proposition ci-dessous : 200 valeurs par liste, 8 listes par atelier                            |

### D10 — le parseur suit la provenance, pas le contenu

Tranchée le 2026-09-15 (voir §6 bis). Écartées : **tout en custom** — MathLive
produit du LaTeX, donc une fraction posée dans l'éditeur serait rejetée ; **tout
en LaTeX** — `sin(x)` tapé au clavier est lu `s·i·n·(x)` sans erreur, le pire
type de défaut ; **la détection seule** — elle regarde toute la chaîne, donc un
`sin(` mêlé à un `\frac{}` bascule tout en LaTeX.

⚠️ **Conséquence sur le code déjà écrit** : `src/lib/atelier/parse.ts` appelle
`parseCustomSafe` en dur. Il devra recevoir la provenance et, pour les entrées
texte, passer par `detectInputFormat` / `parse()` de `mathAST/cli/core`.

### D9 — un nom inconnu met l'objet en attente, pas en erreur

Tranchée le 2026-09-15, après mesure du comportement actuel (voir §2.5).
Quatre états au lieu de deux, et pour une **lettre seule** l'attente porte une
offre de curseur — sans jamais créer d'office.

Écartées : le silence (c'est le défaut d'aujourd'hui, pas une décision) ;
l'erreur immédiate (elle punit l'élève qui écrit dans l'ordre qui l'arrange) ;
et le message reporté au moment de tracer (il arrive loin de l'endroit où la
faute a été écrite, quand l'élève a déjà changé de vue).

⚠️ **Conséquence sur le code déjà écrit** : la mémoire des noms ayant existé
(`seen` dans `atelier.svelte.ts`) devient inutile. Un nom absent est un nom
absent, qu'il ait existé ou non — le message et la réparation sont les mêmes.
Le test §2.4 L1 attend désormais `pending`, plus `error`.

### D8 — le plafond, chiffré

La méthode est validée (« avec le poids de l'URL en tête »), le nombre restait à
poser. **Proposition : 200 valeurs par liste, 8 listes par atelier.**

Le raisonnement, à contester si le chiffre gêne :

- une série statistique de classe dépasse rarement 50 valeurs ; 200 couvre un
  relevé de capteur ou un sondage sur plusieurs classes, avec de la marge ;
- une valeur à 2–4 chiffres suivie de son point-virgule pèse ~5 caractères, donc
  200 valeurs ≈ 1 000 caractères avant compression — du texte numérique
  répétitif, qui se compresse bien ;
- un atelier complet (listes, fonctions, curseurs, fenêtre) doit rester sous la
  barre prudente des **2 000 caractères d'URL**, celle qui passe partout : mail,
  ENT, messagerie. Les navigateurs acceptent bien plus, mais ce ne sont pas eux
  qui tronquent ;
- au-delà du plafond, l'atelier ne refuse pas la donnée : il refuse **le
  partage par URL** et propose l'export en fichier (§5, §6 L1).

---

## 10. Ce que ce document ne fait pas

- Aucune maquette, aucun choix de disposition — seulement des comportements.
- Aucun choix technique : ni format de sérialisation, ni compression, ni
  mécanisme de contexte Svelte. Ils viendront après validation.
- Aucun budget de performance ni de taille de bundle.
- Les numéros de ligne cités datent du **2026-09-15** : les revérifier avant de
  s'en servir.
