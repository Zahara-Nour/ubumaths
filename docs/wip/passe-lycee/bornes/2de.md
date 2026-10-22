# Bornes des points de seconde

Objectif : pour chaque point de programme actif de seconde générale et technologique (`grade` = `2`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »). Ces bornes serviront à juger qu'un modèle de question reste **entièrement** dans le point. 292 points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22).

La seconde hérite des bornes de 3e (`../../arbre-notions/bornes/cycle4.json`, clé `3`) : ce qui y est acquis n'est pas recopié, sauf quand la seconde le change (racines carrées, histogramme).

## Sources et façon de citer

| Abréviation | Document                                                                                                                      | Page citée  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO 2de**  | Programme de mathématiques de seconde générale et technologique, **nouveau programme** (BO n° 14 du 2026-04-02), `bo/2de.txt` | page du PDF |

Aucun document d'accompagnement n'a été utilisé. Les fractions des automatismes (p.5) et la coquille « a ⩾ b » (p.8) ont été relues sur le rendu image des pages du PDF.

**Force** : `BO` = écrit dans le programme (une absence nette du texte, « absent du BO », compte comme BO, comme au cycle 4) ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point).

Les points-compétences et les points-démonstrations (raisonner, modéliser, résoudre un problème, démontrer) n'ont pas de borne propre : `bornes: []` et une remarque qui le dit. Les autres points sans borne propre héritent seulement des bornes générales (rien de plus à dire que leur libellé). Les **approfondissements possibles** sont « en aucun cas obligatoires » (BO p.4) : leur remarque le rappelle.

## Ce qui est le plus utile pour la vérification « seulement »

- **Fonctions de référence** : affines, valeur absolue, carré, inverse (définition, courbe) ; racine carrée et cube **seulement** pour résoudre f(x) = k, f(x) < k (question l2-2). Ni dérivée, ni second degré général, ni exponentielle.
- **Valeur absolue** : distance et intervalles de centre donné ; « toute autre utilisation est hors programme », mais la fonction valeur absolue est au programme (question l2-1).
- **Équations et inéquations** : « se ramenant au premier degré » — ax + b = cx + d, ax ⩾ b…, produit nul A(x)B(x) = 0 (facteurs du premier degré), quotient A(x)/B(x) = k, x² = a, f(x) = k ; f(x) = g(x) graphiquement ou à l'outil seulement ; aucun système général (seulement l'intersection de deux droites données par leur équation réduite). Sens des inégalités : question l2-3.
- **Tableaux de signes** : produits et quotients de facteurs affines ou de fonctions de référence ; pas de trinôme non factorisé.
- **Racines carrées et puissances** : règles de calcul au programme, √ab = √a √b, √a² = |a| (portée : l2-6, l2-7).
- **Vecteurs et droites** : plan seulement ; norme, distance, déterminant en base orthonormée ; équation réduite ou cartésienne.
- **Statistiques** : écart type (pas de variance), histogramme et polygone des fréquences cumulées pour des classes de même amplitude, moyenne et médiane de séries regroupées.
- **Probabilités** : P_A(B), arbres et tableaux croisés ; **pas de probabilités totales** (question l2-4 : P(B) sur un arbre).
- **Logique** : en situation, ∀ et ∃ hors programme. **Algorithmique** : Python, aucune connaissance sur les listes.

## Libellés qui ne collent plus au BO (signalés, rien corrigé)

- **2-273** : le BO écrit « par exemple U = RI, … » ; le libellé a perdu « par exemple » et se lit comme une liste fermée.
- **2-394** : le BO dit « un arbre pondéré ou un tableau », le libellé « tableau croisé d'effectifs » (question l2-10).
- **2-395**, **2-488** : la liste de notations (P(A), Ā, P(A ∩ B), P_A(B)) n'est pas dans la puce du BO (« Passer du registre de la langue naturelle au registre symbolique et inversement ») ; chaque notation est au BO ailleurs.
- **2-431** : libellé « ax ⩾ b » là où le BO imprime « a ⩾ b » (coquille du BO, question l2-5).

## Questions ouvertes (`questions-2de-1gen.json`)

- **l2-1** — Valeur absolue : « toute autre utilisation est hors programme » contre la fonction valeur absolue.
- **l2-2** — Racine carrée et cube : fonctions de référence de 2de ?
- **l2-3** — Sens des inégalités dans les « types » d'inéquations.
- **l2-4** — Arbres : la probabilité d'un évènement par la somme des chemins (probabilités totales).
- **l2-5** — Coquille « a ⩾ b » dans la liste des inéquations.
- **l2-6** — Puissances : quelles « règles de calcul » ((aᵐ)ⁿ) ?
- **l2-7** — Racines carrées : quotient, a√b, dénominateur rationnel ?
- **l2-8** — Milieu : calcul attendu, formule en approfondissement.
- **l2-9** — Croisement de variables : « données réelles » est-il une borne ?
- **l2-10** — « Construire un arbre pondéré ou un tableau » : quel tableau ?

## Seconde (292 points, 213 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Nombres réels : ensembles ℕ, ℤ, 𝔻, ℚ, ℝ et intervalles de ℝ ; les irrationnels (√2, π…) s'ajoutent aux nombres du cycle 4. — _BO 2de p.6-7_ (BO)
- Les règles de calcul sur les racines carrées entrent au programme (√ab = √a √b pour a, b positifs ; √a² = |a|) : la borne de 3e « aucune propriété algébrique des racines carrées » ne vaut plus (portée : question l2-7). — _BO 2de p.7-8_ (BO)
- Valeur absolue : notation |a| pour la distance de a à 0, distance entre deux réels, intervalles de centre donné (|x − a| ⩽ r) ; « Toute autre utilisation est hors programme » (contradiction avec la fonction valeur absolue : question l2-1). — _BO 2de p.7_ (BO)
- Fonctions à valeurs réelles définies sur un intervalle ou une réunion finie d'intervalles de ℝ, données par une courbe, une expression algébrique, un programme de calcul ou un tableau de valeurs ; fonctions définies sur ℕ possibles pour un phénomène discret, avec la notation u(n). — _BO 2de p.10_ (BO)
- Fonctions de référence nommées : affines (dont linéaires), valeur absolue, carré, inverse (définition, courbe) ; racine carrée et cube n'apparaissent que pour résoudre f(x) = k, f(x) < k (statut : question l2-2). Pas de polynôme du second degré général, de dérivée ni d'exponentielle : absents du BO de 2de. — _BO 2de p.10-11_ (BO)
- Équations et inéquations « se ramenant au premier degré » : premier degré, produit nul, quotient, x² = a, f(x) = k pour les fonctions de référence ; pas de méthode générale du second degré (ni forme canonique ni discriminant). — _BO 2de p.6, 8_ (BO)
- Géométrie plane seulement ; vecteurs manipulés dans un repère orthogonal ; norme, distance et déterminant dans une base (un repère) orthonormée. — _BO 2de p.8-9_ (BO)
- L'histogramme entre au programme (classes de même amplitude) ; rotation, homothétie et triangles semblables restent absents. — _BO 2de p.8-12_ (BO)
- Notations ensemblistes Ø, ∈, ⊂, ∩, ∪, {…}, Ā ou E \ A, Card(A) ; les symboles ∀ et ∃ sont hors programme. — _BO 2de p.4_ (BO)
- Algorithmique en Python (passage langage naturel ↔ Python) ; « Aucune connaissance sur les listes n'est exigée ». — _BO 2de p.4-5_ (BO)
- Probabilités : le calcul de la probabilité d'un évènement à partir de ses probabilités conditionnelles relatives à une partition de l'univers (probabilités totales) « n'est pas un attendu du programme » (portée sur les arbres : question l2-4). — _BO 2de p.13_ (BO)
- Les approfondissements possibles ne sont « en aucun cas obligatoires ». — _BO 2de p.4_ (BO)

### Algorithmique et programmation > Notion de fonction

- **2-229** — Fonctions à un ou plusieurs arguments — _hérite des bornes générales_
- **2-230** — Fonction renvoyant un nombre aléatoire ; série statistique obtenue par la répétition de l'appel d'une telle fonction — _hérite des bornes générales_
- **2-231** — Écrire des fonctions simples
  - Fonctions simples. — _BO 2de p.5_ (BO)
- **2-416** — Appeler une fonction — _hérite des bornes générales_
- **2-232** — Lire, comprendre, modifier, compléter des fonctions plus complexes
  - Fonctions plus complexes : lire, comprendre, modifier, compléter seulement (pas écrire). — _BO 2de p.5_ (BO)
- **2-233** — Lire et comprendre une fonction renvoyant une moyenne (aucune connaissance sur les listes n'est exigée)
  - Lire et comprendre seulement (pas écrire) ; aucune connaissance sur les listes exigée. — _BO 2de p.5_ (BO)
- **2-417** — Lire et comprendre une fonction renvoyant un écart type (aucune connaissance sur les listes n'est exigée)
  - Lire et comprendre seulement (pas écrire) ; aucune connaissance sur les listes exigée. — _BO 2de p.5_ (BO)
- **2-234** — Écrire des fonctions renvoyant le résultat numérique d'une expérience aléatoire, d'une répétition d'expériences aléatoires indépendantes — _hérite des bornes générales_

### Algorithmique et programmation > Variables et instructions élémentaires

- **2-218** — Variables informatiques de type entier, booléen, flottant, chaine de caractères
  - Types entier, booléen, flottant, chaine de caractères. — _BO 2de p.4_ (BO)
- **2-219** — Affectation (notée $\leftarrow$ en langage naturel)
  - Affectation notée ← en langage naturel. — _BO 2de p.5_ (BO)
- **2-220** — Séquence d'instructions — _hérite des bornes générales_
- **2-221** — Instruction conditionnelle — _hérite des bornes générales_
- **2-222** — Boucle bornée (`for`) — _hérite des bornes générales_
- **2-413** — Boucle non bornée (`while`) — _hérite des bornes générales_
- **2-223** — Choisir ou déterminer le type d'une variable (entier, flottant ou chaine de caractères)
  - Types à choisir parmi entier, flottant ou chaine de caractères (le booléen n'est pas dans la liste de cette capacité). — _BO 2de p.5_ (BO)
- **2-224** — Concevoir et écrire une instruction d'affectation — _hérite des bornes générales_
- **2-414** — Concevoir et écrire une séquence d'instructions — _hérite des bornes générales_
- **2-415** — Concevoir et écrire une instruction conditionnelle — _hérite des bornes générales_
- **2-225** — Écrire une formule permettant un calcul combinant des variables — _hérite des bornes générales_
- **2-226** — Programmer, dans des cas simples, une boucle bornée
  - Dans des cas simples. — _BO 2de p.5_ (BO)
- **2-227** — Programmer, dans des cas simples, une boucle non bornée
  - Dans des cas simples. — _BO 2de p.5_ (BO)
- **2-228** — Dans des cas plus complexes : lire, comprendre, modifier ou compléter un algorithme ou un programme
  - Cas plus complexes : lire, comprendre, modifier ou compléter seulement (écrire un programme complexe en entier n'est pas demandé). — _BO 2de p.5_ (BO)

### Automatismes > Calcul numérique et algébrique

- **2-489** — Effectuer un calcul littéral élémentaire : expressions multiplicatives
  - Les égalités de la liste du BO : x = 1 × x, x = x/1, (−1) × a = a/(−1) = −a ; 0 = 0x, 0/a = 0, x/a = (1/a)x, ab/c = a × (b/c) = (a/c) × b ; 1/(1/a) = a, 1/(a/b) = b/a, (a/b)/(c/d) = (a/b) : (c/d) = (a/b) ÷ (c/d) = (a/b) × (d/c) = ad/(bc). — _BO 2de p.5_ (BO)
  - ⚠ Fractions de la puce relues sur le rendu image de la page 5 du PDF (extraction pdftotext en plusieurs lignes).

### Automatismes > Fonctions et représentations

- **2-491** — Déterminer graphiquement des images
  - Lecture graphique sur une courbe donnée. — _BO 2de p.6_ (BO)
- **2-492** — Déterminer graphiquement des antécédents
  - Lecture graphique sur une courbe donnée. — _BO 2de p.6_ (BO)

### Automatismes > Géométrie

- **2-401** — Calculer le périmètre d'un polygone.
  - Polygones ; le cercle, cité dans la même puce, est un autre savoir. — _BO 2de p.6_ (BO)

### Automatismes > Proportions et pourcentages

- **2-490** — Utiliser une proportion pour calculer le tout connaissant une partie
  - Proportion donnée sous forme décimale, fractionnaire ou de pourcentage. — _BO 2de p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : les trois formes viennent de la puce précédente du même bloc (« exprimer une proportion sous différentes formes (décimale, fractionnaire, pourcentage) »).

### Automatismes > Statistiques

- **2-402** — Interpréter les quartiles d'une série statistique (Q1 = 12 : au moins un quart des valeurs sont inférieures ou égales à 12).
  - Série présentée en données brutes, regroupées par classes, ou par une représentation graphique. — _BO 2de p.6_ (BO)
  - ⚠ La définition des quartiles reste celle de 3e (décision c4-2) : le BO de 2de ne la redonne pas.

### Fonctions > Représentation algébrique et graphique des fonctions

- **2-325** — Fonction à valeurs réelles définie sur un intervalle ou une réunion finie d'intervalles de $\mathbb{R}$
  - Ensemble de définition : un intervalle ou une réunion finie d'intervalles de ℝ. — _BO 2de p.10_ (BO)
- **2-326** — Recherche de domaine d'étude (ensemble de définition)
  - Ensemble de définition d'une expression, en lien avec l'équation quotient (dénominateur non nul). — _BO 2de p.8, 10_ (BO)
  - ⚠ Domaine d'une expression avec racine carrée (√(x − 2)) : dépend du statut de la fonction racine carrée (question l2-2).
- **2-327** — Courbe représentative : la courbe d'équation $y = f(x)$ est l'ensemble des points du plan dont les coordonnées $(x\,;\,y)$ vérifient $y = f(x)$
  - Courbe d'équation y = f(x) : points dont les coordonnées (x, y) vérifient y = f(x). — _BO 2de p.10_ (BO)
- **2-328** — Signe d'une fonction affine
  - Fonctions affines x ↦ mx + p ; signe relié au sens de variation et à la droite. — _BO 2de p.10-11_ (BO)
- **2-329** — Signe des fonctions de référence
  - Fonctions de référence du programme ; la valeur absolue et le carré sont nommés pour le signe. — _BO 2de p.10-11_ (BO)
  - ⚠ La liste des fonctions de référence (racine carrée, cube ?) : question l2-2.
- **2-330** — Tableau de signes pour une fonction produit
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ».
- **2-446** — Tableau de signes pour une fonction quotient
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - Quotient : valeurs où le dénominateur s'annule exclues. — _BO 2de p.8_ (BO)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ».
- **2-331** — Exploiter l'équation $y = f(x)$ d'une courbe : appartenance
  - Appartenance d'un point à la courbe d'équation y = f(x), par calcul de f(x_A). — _BO 2de p.6, 10_ (BO)
- **2-447** — Exploiter l'équation $y = f(x)$ d'une courbe : calcul de coordonnées
  - Calcul d'une coordonnée d'un point de la courbe : l'ordonnée par f(a) ; une abscisse seulement si l'équation f(x) = b est d'un type du programme. — _BO 2de p.6, 10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « calcul de coordonnées » sans précision ; trouver une abscisse revient à résoudre f(x) = b, borné par les types d'équations du programme.
- **2-495** — Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne — _hérite des bornes générales_
  - ⚠ Point-compétence (modéliser) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait écrire l'expression d'une fonction à partir d'une situation, sous les bornes générales.
- **2-333** — Fonction valeur absolue : définition et courbe représentative
  - x ↦ |x| : définition et courbe. — _BO 2de p.10_ (BO)
  - ⚠ Statut de la fonction valeur absolue face à « Toute autre utilisation est hors programme » (BO p.7) : question l2-1.
- **2-334** — Fonction carré : définition et courbe représentative
  - x ↦ x² : définition et courbe. — _BO 2de p.10_ (BO)
- **2-335** — Fonction inverse : définition et courbe représentative
  - x ↦ 1/x : définition et courbe. — _BO 2de p.10_ (BO)
- **2-336** — Résoudre une équation du type $f(x) = k$, en choisissant une méthode adaptée : graphique, algébrique, logicielle
  - Méthode au choix (graphique, algébrique, logicielle) ; la résolution algébrique ne porte que sur les types d'équations et d'inéquations du programme. — _BO 2de p.10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : f est quelconque (courbe, expression, tableau), mais une résolution algébrique n'est attendue que pour les types que le BO liste ailleurs (premier degré, produit nul, quotient, x² = a, fonctions de référence).
- **2-448** — Résoudre une inéquation du type $f(x) < k$, en choisissant une méthode adaptée : graphique, algébrique, logicielle
  - Méthode au choix (graphique, algébrique, logicielle) ; la résolution algébrique ne porte que sur les types d'équations et d'inéquations du programme. — _BO 2de p.10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : f est quelconque (courbe, expression, tableau), mais une résolution algébrique n'est attendue que pour les types que le BO liste ailleurs (premier degré, produit nul, quotient, x² = a, fonctions de référence). Sens de l'inégalité : question l2-3.
- **2-337** — Résoudre une équation de la forme $f(x) = 0$ à l'aide d'un tableau de signes, lorsque $f$ est un produit
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - f produit ; équation f(x) = 0 à l'aide d'un tableau de signes. — _BO 2de p.10_ (BO)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ».
- **2-449** — Résoudre une équation de la forme $f(x) = 0$ à l'aide d'un tableau de signes, lorsque $f$ est un quotient
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - f quotient ; équation f(x) = 0 à l'aide d'un tableau de signes. — _BO 2de p.10_ (BO)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ».
- **2-450** — Résoudre une inéquation de la forme $f(x) > 0$ à l'aide d'un tableau de signes, lorsque $f$ est un produit
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - f produit ; inéquation f(x) > 0 à l'aide d'un tableau de signes. — _BO 2de p.10_ (BO)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ». Sens de l'inégalité : question l2-3.
- **2-451** — Résoudre une inéquation de la forme $f(x) > 0$ à l'aide d'un tableau de signes, lorsque $f$ est un quotient
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - f quotient ; inéquation f(x) > 0 à l'aide d'un tableau de signes. — _BO 2de p.10_ (BO)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ». Sens de l'inégalité : question l2-3.
- **2-338** — Résoudre graphiquement une équation du type $f(x) = g(x)$
  - Graphiquement ou à l'aide d'un outil numérique seulement : aucune résolution algébrique de f(x) = g(x) n'est demandée par ce point. — _BO 2de p.11_ (BO)
- **2-452** — Résoudre à l'aide d'un outil numérique une équation du type $f(x) = g(x)$
  - Graphiquement ou à l'aide d'un outil numérique seulement : aucune résolution algébrique de f(x) = g(x) n'est demandée par ce point. — _BO 2de p.11_ (BO)
- **2-453** — Résoudre graphiquement une inéquation du type $f(x) < g(x)$
  - Graphiquement ou à l'aide d'un outil numérique seulement : aucune résolution algébrique de f(x) = g(x) n'est demandée par ce point. — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-454** — Résoudre à l'aide d'un outil numérique une inéquation du type $f(x) < g(x)$
  - Graphiquement ou à l'aide d'un outil numérique seulement : aucune résolution algébrique de f(x) = g(x) n'est demandée par ce point. — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-339** — Fonction affine : résoudre graphiquement une équation du type $f(x) = k$
  - f affine, x ↦ mx + p. — _BO 2de p.11_ (BO)
- **2-455** — Fonction affine : résoudre algébriquement une équation du type $f(x) = k$
  - f affine, x ↦ mx + p. — _BO 2de p.11_ (BO)
- **2-456** — Fonction affine : résoudre graphiquement une inéquation du type $f(x) < k$
  - f affine, x ↦ mx + p. — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-457** — Fonction affine : résoudre algébriquement une inéquation du type $f(x) < k$
  - f affine, x ↦ mx + p. — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-340** — Fonction valeur absolue : résoudre graphiquement une équation du type $f(x) = k$
  - f(x) = |x|. — _BO 2de p.11_ (BO)
  - ⚠ Question l2-1.
- **2-458** — Fonction valeur absolue : résoudre algébriquement une équation du type $f(x) = k$
  - f(x) = |x|. — _BO 2de p.11_ (BO)
  - ⚠ Question l2-1.
- **2-459** — Fonction valeur absolue : résoudre graphiquement une inéquation du type $f(x) < k$
  - f(x) = |x|. — _BO 2de p.11_ (BO)
  - ⚠ Questions l2-1 et l2-3.
- **2-460** — Fonction valeur absolue : résoudre algébriquement une inéquation du type $f(x) < k$
  - f(x) = |x|. — _BO 2de p.11_ (BO)
  - ⚠ Questions l2-1 et l2-3.
- **2-341** — Fonction carré : résoudre graphiquement une équation du type $f(x) = k$
  - f(x) = x². — _BO 2de p.11_ (BO)
- **2-461** — Fonction carré : résoudre algébriquement une équation du type $f(x) = k$
  - f(x) = x². — _BO 2de p.11_ (BO)
  - x² = a : ensemble des solutions (deux, une ou aucune solution) ; solutions exactes en √a. — _BO 2de p.5, 8_ (BO)
- **2-462** — Fonction carré : résoudre graphiquement une inéquation du type $f(x) < k$
  - f(x) = x². — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-463** — Fonction carré : résoudre algébriquement une inéquation du type $f(x) < k$
  - f(x) = x². — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-342** — Fonction inverse : résoudre graphiquement une équation du type $f(x) = k$
  - f(x) = 1/x. — _BO 2de p.11_ (BO)
- **2-464** — Fonction inverse : résoudre algébriquement une équation du type $f(x) = k$
  - f(x) = 1/x. — _BO 2de p.11_ (BO)
  - Forme a/x = b admise (automatisme). — _BO 2de p.5_ (BO)
- **2-465** — Fonction inverse : résoudre graphiquement une inéquation du type $f(x) < k$
  - f(x) = 1/x. — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-466** — Fonction inverse : résoudre algébriquement une inéquation du type $f(x) < k$
  - f(x) = 1/x. — _BO 2de p.11_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-343** — Fonction racine carrée : résoudre graphiquement une équation du type $f(x) = k$
  - f(x) = √x. — _BO 2de p.11_ (BO)
  - ⚠ La fonction racine carrée n'a ni définition ni courbe au BO de 2de (seulement cette puce et un approfondissement) : question l2-2.
- **2-467** — Fonction racine carrée : résoudre algébriquement une équation du type $f(x) = k$
  - f(x) = √x. — _BO 2de p.11_ (BO)
  - ⚠ La fonction racine carrée n'a ni définition ni courbe au BO de 2de (seulement cette puce et un approfondissement) : question l2-2.
- **2-468** — Fonction racine carrée : résoudre graphiquement une inéquation du type $f(x) < k$
  - f(x) = √x. — _BO 2de p.11_ (BO)
  - ⚠ La fonction racine carrée n'a ni définition ni courbe au BO de 2de (seulement cette puce et un approfondissement) : question l2-2. Sens de l'inégalité : question l2-3.
- **2-469** — Fonction racine carrée : résoudre algébriquement une inéquation du type $f(x) < k$
  - f(x) = √x. — _BO 2de p.11_ (BO)
  - ⚠ La fonction racine carrée n'a ni définition ni courbe au BO de 2de (seulement cette puce et un approfondissement) : question l2-2. Sens de l'inégalité : question l2-3.
- **2-344** — Fonction cube : résoudre graphiquement une équation du type $f(x) = k$
  - f(x) = x³. — _BO 2de p.11_ (BO)
  - ⚠ La fonction cube n'a ni définition ni courbe au BO de 2de (seulement cette puce) : question l2-2.
- **2-470** — Fonction cube : résoudre algébriquement une équation du type $f(x) = k$
  - f(x) = x³. — _BO 2de p.11_ (BO)
  - ⚠ La fonction cube n'a ni définition ni courbe au BO de 2de (seulement cette puce) : question l2-2.
- **2-471** — Fonction cube : résoudre graphiquement une inéquation du type $f(x) < k$
  - f(x) = x³. — _BO 2de p.11_ (BO)
  - ⚠ La fonction cube n'a ni définition ni courbe au BO de 2de (seulement cette puce) : question l2-2. Sens de l'inégalité : question l2-3.
- **2-472** — Fonction cube : résoudre algébriquement une inéquation du type $f(x) < k$
  - f(x) = x³. — _BO 2de p.11_ (BO)
  - ⚠ La fonction cube n'a ni définition ni courbe au BO de 2de (seulement cette puce) : question l2-2. Sens de l'inégalité : question l2-3.

### Fonctions > Variations et extrémums d'une fonction

- **2-345** — Croissance, décroissance, monotonie d'une fonction définie sur un intervalle
  - Fonction définie sur un intervalle. — _BO 2de p.11_ (BO)
- **2-473** — Tableau de variations — _hérite des bornes générales_
- **2-346** — Maximum, minimum d'une fonction sur un intervalle
  - Sur un intervalle. — _BO 2de p.11_ (BO)
- **2-347** — Pour une fonction affine donnée par $f(x) = mx + p$, interprétation de $m$ comme taux d'accroissement
  - f(x) = mx + p : m taux d'accroissement. — _BO 2de p.11_ (BO)
- **2-474** — Pour une fonction affine donnée par $f(x) = mx + p$, interprétation de $p$ comme ordonnée à l'origine
  - f(x) = mx + p : p ordonnée à l'origine. — _BO 2de p.11_ (BO)
- **2-348** — Variations d'une fonction affine selon le signe du coefficient directeur
  - Selon le signe du coefficient directeur. — _BO 2de p.11_ (BO)
- **2-349** — Relier représentation graphique et tableau de variations — _hérite des bornes générales_
- **2-350** — Déterminer graphiquement les extrémums d'une fonction sur un intervalle
  - Lecture graphique, sur un intervalle. — _BO 2de p.11_ (BO)
- **2-351** — Exploiter un logiciel de géométrie dynamique ou de calcul formel, la calculatrice ou Python pour décrire les variations d'une fonction donnée par une formule
  - Outil : logiciel de géométrie dynamique ou de calcul formel, calculatrice, Python ; fonction donnée par une formule. — _BO 2de p.11_ (BO)
- **2-352** — Pour une fonction affine, relier sens de variation, signe de la fonction et droite représentative
  - Fonctions affines seulement. — _BO 2de p.11_ (BO)
- **2-353** — Traiter des problèmes d'optimisation — _hérite des bornes générales_
  - ⚠ Point-compétence (résoudre un problème) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait chercher un extremum dans une situation (graphiquement, à l'outil numérique ou par les variations connues ; pas de dérivée en 2de), sous les bornes générales.
- **2-475** — Fonction valeur absolue : signe
  - f(x) = |x|. — _BO 2de p.11_ (BO)
  - ⚠ Question l2-1.
- **2-354** — Fonction valeur absolue : variations
  - f(x) = |x|. — _BO 2de p.11_ (BO)
  - ⚠ Question l2-1.
- **2-476** — Fonction carré : signe
  - f(x) = x². — _BO 2de p.11_ (BO)
- **2-355** — Fonction carré : variations
  - f(x) = x². — _BO 2de p.11_ (BO)
- **2-356** — Pour deux nombres $a$ et $b$ donnés et une fonction de référence $f$, comparer $f(a)$ et $f(b)$ numériquement
  - f fonction de référence du programme. — _BO 2de p.11_ (BO)
  - Comparaison numérique. — _BO 2de p.11_ (BO)
  - ⚠ Liste des fonctions de référence (racine carrée, cube ?) : question l2-2.
- **2-477** — Pour deux nombres $a$ et $b$ donnés et une fonction de référence $f$, comparer $f(a)$ et $f(b)$ graphiquement
  - f fonction de référence du programme. — _BO 2de p.11_ (BO)
  - Comparaison graphique. — _BO 2de p.11_ (BO)
  - ⚠ Liste des fonctions de référence (racine carrée, cube ?) : question l2-2.
- **2-357** — Variations des fonctions affines — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-358** — Position relative des courbes d'équation $y = x$ et $y = x^2$, pour $x \geqslant 0$ — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-359** — Variations de la fonction carré — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-360** — Variations de la fonction inverse — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-361** — Pour une fonction dont le tableau de variations est donné, algorithmes d'approximation numérique d'un extrémum (balayage, dichotomie)
  - Tableau de variations donné ; balayage ou dichotomie. — _BO 2de p.11_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-362** — Algorithme de calcul approché de longueur d'une portion de courbe représentative de fonction — _hérite des bornes générales_
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-363** — Relier les courbes représentatives de la fonction racine carrée et de la fonction carré sur $\mathbb{R}^+$
  - Sur ℝ+. — _BO 2de p.11_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Géométrie > Droites du plan

- **2-311** — Vecteur directeur d'une droite — _hérite des bornes générales_
- **2-312** — Équation de droite : équation cartésienne — _hérite des bornes générales_
- **2-439** — Équation de droite : équation réduite
  - y = mx + p, ou x = c pour une droite parallèle à l'axe des ordonnées. — _BO 2de p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO ne donne pas la forme ; il réserve la pente aux droites non parallèles à l'axe des ordonnées, ce qui laisse x = c à ces droites.
- **2-313** — Pente (ou coefficient directeur) d'une droite non parallèle à l'axe des ordonnées
  - Droite non parallèle à l'axe des ordonnées. — _BO 2de p.9_ (BO)
- **2-314** — Déterminer une équation de droite à partir de deux points
  - Équation cartésienne ou réduite (le BO ne fixe pas la forme attendue). — _BO 2de p.9_ (déduite)
  - À partir de deux points. — _BO 2de p.9_ (BO)
  - ⚠ Lecture déduite (texte implicite) : « déterminer une équation de droite » sans forme imposée, les deux formes étant au programme.
- **2-440** — Déterminer une équation de droite à partir d'un point et un vecteur directeur
  - Équation cartésienne ou réduite (le BO ne fixe pas la forme attendue). — _BO 2de p.9_ (déduite)
  - À partir d'un point et d'un vecteur directeur. — _BO 2de p.9_ (BO)
  - ⚠ Lecture déduite (texte implicite) : « déterminer une équation de droite » sans forme imposée, les deux formes étant au programme.
- **2-441** — Déterminer une équation de droite à partir d'un point et la pente
  - Équation cartésienne ou réduite (le BO ne fixe pas la forme attendue). — _BO 2de p.9_ (déduite)
  - À partir d'un point et de la pente. — _BO 2de p.9_ (BO)
  - ⚠ Lecture déduite (texte implicite) : « déterminer une équation de droite » sans forme imposée, les deux formes étant au programme.
- **2-315** — Déterminer la pente d'une droite donnée par une représentation graphique
  - Lecture graphique ; droite non parallèle à l'axe des ordonnées. — _BO 2de p.9_ (BO)
- **2-442** — Déterminer la pente d'une droite donnée par une équation
  - Droite donnée par une équation (cartésienne ou réduite) ; non parallèle à l'axe des ordonnées. — _BO 2de p.9_ (BO)
- **2-443** — Déterminer un vecteur directeur d'une droite donnée par une équation
  - Droite donnée par une équation (cartésienne ou réduite). — _BO 2de p.9_ (BO)
- **2-444** — Déterminer un vecteur directeur d'une droite donnée par une représentation graphique
  - Lecture graphique. — _BO 2de p.9_ (BO)
- **2-316** — Tracer une droite connaissant son équation réduite
  - Équation réduite. — _BO 2de p.9_ (BO)
- **2-445** — Tracer une droite connaissant son équation cartésienne
  - Équation cartésienne. — _BO 2de p.9_ (BO)
- **2-317** — Établir que trois points sont alignés ou non
  - Par la colinéarité (déterminant ou proportionnalité des coordonnées) ou par une équation de droite. — _BO 2de p.9_ (BO)
- **2-318** — Déterminer si deux droites sont parallèles ou sécantes — _hérite des bornes générales_
- **2-319** — Déterminer le point d'intersection de deux droites sécantes données par leur équation réduite
  - Deux droites données par leur équation réduite seulement ; aucun système de deux équations à deux inconnues sous forme générale n'est cité. — _BO 2de p.9_ (BO)
- **2-320** — En utilisant le déterminant, établir la forme générale d'une équation de droite — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-321** — Étudier l'alignement de trois points dans le plan — _hérite des bornes générales_
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-322** — Déterminer une équation de droite passant par deux points donnés — _hérite des bornes générales_
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-323** — Ensemble des points équidistants d'un point et de l'axe des abscisses — _hérite des bornes générales_
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-324** — Représentation, sur des exemples, de parties du plan décrites par des inégalités sur les coordonnées
  - Sur des exemples. — _BO 2de p.10_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Géométrie > Vecteurs et problèmes de géométrie

- **2-287** — Égalité de deux vecteurs ; notation $\vec{u}$
  - Notation u⃗. — _BO 2de p.9_ (BO)
- **2-433** — Vecteur nul — _hérite des bornes générales_
- **2-288** — Représentants d'un vecteur — _hérite des bornes générales_
- **2-289** — Produit d'un vecteur par un nombre réel
  - Produit par un nombre réel. — _BO 2de p.9_ (BO)
- **2-290** — Colinéarité de deux vecteurs — _hérite des bornes générales_
- **2-291** — Représentation d'un vecteur comme combinaison de deux vecteurs non colinéaires
  - Combinaison de deux vecteurs non colinéaires ; relation u⃗ = x i⃗ + y j⃗ mise en évidence. — _BO 2de p.9_ (BO)
- **2-292** — Base orthonormée — _hérite des bornes générales_
- **2-434** — Coordonnées d'un vecteur
  - Coordonnées dans une base ; relation u⃗ = x i⃗ + y j⃗. — _BO 2de p.9_ (BO)
- **2-293** — Expression de la norme d'un vecteur
  - Dans une base orthonormée. — _BO 2de p.9_ (BO)
- **2-294** — Expression des coordonnées de $\vec{AB}$ en fonction de celles de $A$ et de $B$ — _hérite des bornes générales_
- **2-295** — Déterminant de deux vecteurs dans une base orthonormée
  - Dans une base orthonormée. — _BO 2de p.9_ (BO)
- **2-435** — Déterminant de deux vecteurs, critère de colinéarité ; application à l'alignement, au parallélisme
  - Critère de colinéarité ; application à l'alignement et au parallélisme. — _BO 2de p.9_ (BO)
- **2-296** — Caractérisation vectorielle du milieu d'un segment — _hérite des bornes générales_
  - ⚠ Formule des coordonnées du milieu : approfondissement (2-306) ; question l2-8.
- **2-297** — Représenter la somme de deux vecteurs à partir de représentants de même origine
  - À partir de représentants de même origine. — _BO 2de p.9_ (BO)
- **2-298** — Représenter un vecteur dont on connait les coordonnées — _hérite des bornes générales_
- **2-299** — Lire les coordonnées d'un vecteur — _hérite des bornes générales_
- **2-300** — Calculer les coordonnées d'une somme de vecteurs — _hérite des bornes générales_
- **2-436** — Calculer les coordonnées d'un produit d'un vecteur par un nombre réel
  - Produit par un nombre réel. — _BO 2de p.9_ (BO)
- **2-301** — Calculer la distance entre deux points
  - Repère orthonormé. — _BO 2de p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : l'expression de la norme est donnée « dans une base orthonormée » (BO p.9) ; la distance AB est la norme de AB⃗.
- **2-302** — Calculer les coordonnées du milieu d'un segment — _hérite des bornes générales_
  - ⚠ La formule des coordonnées du milieu est un approfondissement (2-306) alors que ce calcul est attendu : question l2-8.
- **2-303** — Caractériser l'alignement par la colinéarité de vecteurs
  - Par la colinéarité de vecteurs (déterminant nul ou proportionnalité des coordonnées). — _BO 2de p.9_ (BO)
- **2-437** — Caractériser le parallélisme par la colinéarité de vecteurs
  - Par la colinéarité de vecteurs (déterminant nul ou proportionnalité des coordonnées). — _BO 2de p.9_ (BO)
- **2-493** — Résoudre des problèmes en utilisant la représentation la plus adaptée des vecteurs — _hérite des bornes générales_
  - ⚠ Point-compétence (résoudre un problème) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait choisir la représentation des vecteurs pour résoudre un problème, sous les bornes générales.
- **2-494** — Résoudre des problèmes avec des méthodes diverses (méthodes vectorielles, repérées ou non, méthodes géométriques) — _hérite des bornes générales_
  - ⚠ Point-compétence (résoudre un problème) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait résoudre un problème de géométrie par une méthode au choix, sous les bornes générales.
- **2-304** — Caractérisation de la colinéarité de deux vecteurs non nuls : nullité du déterminant — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-438** — Caractérisation de la colinéarité de deux vecteurs non nuls : proportionnalité des coordonnées — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-305** — Barycentre de deux ou trois points
  - Deux ou trois points. — _BO 2de p.9_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-306** — Formule permettant le calcul des coordonnées du milieu d'un segment — _hérite des bornes générales_
  - ⚠ Question l2-8. Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-307** — Démontrer que les hauteurs d'un triangle sont concourantes — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins). Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-308** — Expression de l'aire d'un triangle : $\tfrac{1}{2}ab\sin C$
  - Aire = ½ ab sin C. — _BO 2de p.9_ (BO)
  - Angle C aigu. — _BO 2de p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le sinus n'est défini en 2de que dans le triangle rectangle (automatisme p.6, « lignes trigonométriques dans le triangle rectangle ») ; le sinus d'un angle obtus n'est pas au programme. Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-309** — Démontrer que l'isobarycentre de trois points non alignés est l'intersection des médianes — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins). Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-310** — Démontrer que le point de concours des médiatrices est le centre du cercle circonscrit — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins). Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Nombres et calculs, algèbre > Algèbre

- **2-260** — Règles de calcul sur les puissances entières relatives
  - Exposants entiers relatifs. — _BO 2de p.7_ (BO)
  - ⚠ Portée des « règles de calcul » ((aᵐ)ⁿ, (a/b)ⁿ) : question l2-6.
- **2-261** — Règles de calcul sur les racines carrées
  - Règles de calcul sur les racines carrées ; √ab = √a √b (a, b positifs) est démontré. — _BO 2de p.7-8_ (BO)
  - ⚠ Quelles règles au-delà du produit (quotient, a√b, dénominateur rationnel) : question l2-7.
- **2-423** — Relation $\sqrt{a^2} = |a|$
  - √a² = |a|, a réel. — _BO 2de p.7_ (BO)
  - ⚠ Question l2-1.
- **2-262** — Calculer sur des expressions algébriques simples, en particulier sur des expressions fractionnaires
  - Exemples simples de calcul, en particulier sur des expressions fractionnaires. — _BO 2de p.7_ (BO)
- **2-263** — Somme d'inégalités — _hérite des bornes générales_
- **2-424** — Produit d'une inégalité par un réel positif, négatif, en liaison avec le sens de variation d'une fonction affine
  - Multiplication par un réel positif (sens conservé) ou négatif (sens changé), en liaison avec le sens de variation d'une fonction affine. — _BO 2de p.7_ (BO)
- **2-264** — Comparaison additive (par différence)
  - Comparaison par la différence. — _BO 2de p.5, 8_ (BO)
- **2-425** — Comparaison multiplicative (par rapport, pour deux nombres strictement positifs)
  - Deux nombres strictement positifs. — _BO 2de p.5, 8_ (BO)
- **2-265** — Ensemble des solutions des équations du type $ax + b = 0$
  - Type ax + b = 0 ; ensemble des solutions. — _BO 2de p.8_ (BO)
- **2-266** — Ensemble des solutions des inéquations de la forme $ax + b > 0$
  - Forme ax + b > 0 ; ensemble des solutions (intervalle). — _BO 2de p.7-8_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-267** — Équation de la forme $A(x)B(x) = 0$ (équation produit nul)
  - A(x) et B(x) du premier degré. — _BO 2de p.6, 8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : les objectifs visent des équations et inéquations « se ramenant au premier degré » (BO p.6).
- **2-268** — En liaison avec la section « Fonctions », étude du signe des expressions de la forme $A(x)B(x)$
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ».
- **2-426** — En liaison avec la section « Fonctions », étude du signe des expressions de la forme $\tfrac{A(x)}{B(x)}$
  - Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé). — _BO 2de p.8, 10_ (déduite)
  - Quotient : valeurs où B(x) s'annule exclues. — _BO 2de p.8_ (BO)
  - ⚠ Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré ».
- **2-269** — Équation $\tfrac{A(x)}{B(x)} = k$ (équation quotient), en lien avec l'ensemble de définition d'une expression
  - A(x) et B(x) du premier degré. — _BO 2de p.6, 8_ (déduite)
  - En lien avec l'ensemble de définition de l'expression (B(x) ≠ 0) ; a/x = b en est un cas (automatisme). — _BO 2de p.5, 8_ (BO)
  - ⚠ Lecture déduite (texte implicite) : les objectifs visent des équations et inéquations « se ramenant au premier degré » (BO p.6).
- **2-270** — Effectuer des calculs numériques ou littéraux mettant en jeu des puissances
  - Puissances entières relatives ; calculs numériques ou littéraux. — _BO 2de p.7-8_ (BO)
  - ⚠ Question l2-6.
- **2-271** — Effectuer des calculs numériques ou littéraux mettant en jeu des racines carrées
  - Racines carrées ; calculs numériques ou littéraux. — _BO 2de p.8_ (BO)
  - ⚠ Question l2-7.
- **2-272** — Effectuer des calculs numériques ou littéraux mettant en jeu des écritures fractionnaires
  - Écritures fractionnaires numériques et littérales ; égalités de l'automatisme (a/b ÷ c/d = ad/bc…). — _BO 2de p.5, 8_ (BO)
- **2-273** — Sur des cas simples de relations entre variables ($U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres
  - Cas simples de relations entre variables ; U = RI, d = vt, S = πr², V = abc, V = πr²h sont donnés « par exemple » (liste non limitative), y compris des formules d'autres disciplines. — _BO 2de p.5, 8_ (BO)
  - ⚠ ⚠ libellé : le BO écrit « (par exemple U = RI, … ) » ; le libellé a perdu « par exemple » et se lit comme une liste fermée.
- **2-274** — Exprimer une variable en fonction de l'autre dans une relation du premier degré $ax + by = c$
  - Relation du premier degré ax + by = c. — _BO 2de p.8_ (BO)
- **2-275** — Choisir la forme la plus adaptée (factorisée, développée réduite) d'une expression en vue de la résolution d'un problème
  - Deux formes seulement : factorisée, développée réduite. — _BO 2de p.8_ (BO)
- **2-276** — Comparer deux quantités en utilisant leur différence
  - Comparaison par la différence. — _BO 2de p.5, 8_ (BO)
- **2-427** — Comparer deux quantités en utilisant leur rapport (ratio) dans le cas de quantités positives
  - Quantités strictement positives. — _BO 2de p.5, 8_ (BO)
- **2-277** — Interpréter, selon le contexte, la comparaison de deux quantités par leur différence en termes de variation additive
  - Interprétation selon le contexte, en variation additive. — _BO 2de p.8_ (BO)
- **2-428** — Interpréter, selon le contexte, la comparaison de deux quantités par leur rapport en termes de variation multiplicative
  - Interprétation selon le contexte, en variation multiplicative. — _BO 2de p.8_ (BO)
- **2-278** — Modéliser un problème par une inéquation
  - Inéquations « se ramenant au premier degré ». — _BO 2de p.6, 8_ (BO)
  - ⚠ Point en partie compétence (modéliser) : un modèle s'y rattache s'il fait écrire l'inéquation qui traduit la situation.
- **2-279** — Donner l'ensemble des solutions d'une équation du premier degré du type $ax + b = cx + d$
  - Type ax + b = cx + d ; ensemble des solutions. — _BO 2de p.5, 8_ (BO)
- **2-429** — Donner l'ensemble des solutions d'une équation du premier degré du type $ax = b$
  - Type ax = b ; ensemble des solutions. — _BO 2de p.8_ (BO)
- **2-430** — Donner l'ensemble des solutions d'une équation du premier degré du type $a + x = b$
  - Type a + x = b ; ensemble des solutions. — _BO 2de p.8_ (BO)
- **2-280** — Donner l'ensemble des solutions d'une inéquation du premier degré du type $ax + b \geqslant cx + d$
  - Type ax + b ⩾ cx + d ; ensemble des solutions (intervalle). — _BO 2de p.5, 7-8_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-431** — Donner l'ensemble des solutions d'une inéquation du premier degré du type $ax \geqslant b$
  - Type ax ⩾ b ; ensemble des solutions (intervalle). — _BO 2de p.8_ (BO)
  - ⚠ Le BO imprime « a ⩾ b » (coquille vérifiée sur le rendu image de la page 8) : question l2-5. Sens de l'inégalité : question l2-3.
- **2-432** — Donner l'ensemble des solutions d'une inéquation du premier degré du type $a + x \geqslant b$
  - Type a + x ⩾ b ; ensemble des solutions (intervalle). — _BO 2de p.8_ (BO)
  - ⚠ Sens de l'inégalité : question l2-3.
- **2-281** — Donner l'ensemble des solutions d'une équation du type $x^2 = a$
  - Type x² = a ; ensemble des solutions (deux, une ou aucune solution), solutions exactes en √a. — _BO 2de p.5, 8_ (BO)
- **2-282** — Quels que soient les réels positifs $a$ et $b$, on a $\sqrt{ab} = \sqrt{a}\,\sqrt{b}$ — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-283** — Déterminer la première puissance d'un nombre positif donné supérieure ou inférieure à une valeur donnée
  - Nombre positif donné ; première puissance supérieure ou inférieure à une valeur donnée. — _BO 2de p.8_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-284** — Développement de $(a + b + c)^2$
  - (a + b + c)². — _BO 2de p.8_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-285** — Développement de $(a + b)^3$
  - (a + b)³. — _BO 2de p.8_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-286** — Inégalité entre moyennes géométrique et arithmétique de deux réels strictement positifs
  - Deux réels strictement positifs. — _BO 2de p.8_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Nombres et calculs, algèbre > Arithmétique

- **2-235** — Notations $\mathbb{N}$ et $\mathbb{Z}$ — _hérite des bornes générales_
- **2-236** — Définition de la notion de multiple : $a$ est multiple de $b$ s'il existe un entier $k$ tel que $a = kb$ — _hérite des bornes générales_
- **2-418** — Définition de la notion de diviseur — _hérite des bornes générales_
- **2-419** — Définition des notions de nombre pair, de nombre impair — _hérite des bornes générales_
- **2-237** — Modéliser et résoudre des problèmes mobilisant les notions de multiple, de diviseur, de nombre pair, de nombre impair
  - Notions mobilisées : multiple, diviseur, nombre pair, nombre impair (liste du BO). — _BO 2de p.7_ (BO)
  - ⚠ Point en partie compétence (modéliser et résoudre) : un modèle s'y rattache s'il fait traduire ou résoudre un problème avec ces seules notions.
- **2-238** — Présenter les fractions sous forme irréductible
  - Forme irréductible, en liaison avec l'étude des multiples et diviseurs. — _BO 2de p.6-7_ (BO)
- **2-239** — Pour une valeur numérique de $a$, la somme de deux multiples de $a$ est multiple de $a$ — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-240** — Le carré d'un nombre impair est impair — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-241** — Déterminer si un entier naturel $a$ est multiple d'un entier naturel $b$
  - Entiers naturels. — _BO 2de p.7_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-242** — Pour des entiers $a$ et $b$ donnés, déterminer le plus grand multiple de $a$ inférieur ou égal à $b$
  - Entiers donnés a et b. — _BO 2de p.7_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Nombres et calculs, algèbre > Nombres réels

- **2-243** — Ensemble $\mathbb{R}$ des nombres réels, droite numérique — _hérite des bornes générales_
- **2-244** — Intervalles de $\mathbb{R}$ ; représentation graphique, notations du type $[a\,;\,+\infty[$, $]-\infty\,;\,a]$, $[a\,;\,b]$
  - Notations du type [a ; +∞[, ]−∞ ; a], [a ; b], etc. ; représentation graphique (le BO écrit la virgule : [a, b]). — _BO 2de p.7_ (BO)
- **2-245** — Notation en valeur absolue $|a|$ pour la distance de $a$ à $0$
  - |a| = distance de a à 0. — _BO 2de p.7_ (BO)
  - ⚠ Question l2-1.
- **2-420** — Distance entre deux nombres réels
  - Distance entre deux réels a et b, exprimée par |a − b|. — _BO 2de p.7_ (BO)
  - ⚠ Question l2-1.
- **2-246** — Inéquation du type $|x - a| \leqslant r$ ; représentation graphique des solutions, intervalle $[a - r\,;\,a + r]$
  - Inéquation |x − a| ⩽ r ; solutions représentées graphiquement, intervalle [a − r ; a + r]. — _BO 2de p.7_ (BO)
  - ⚠ Questions l2-1 et l2-3.
- **2-247** — Ensemble $\mathbb{D}$ des nombres décimaux — _hérite des bornes générales_
- **2-421** — Encadrement décimal d'un nombre réel à $10^{-n}$ près
  - Encadrement décimal à 10⁻ⁿ près. — _BO 2de p.7_ (BO)
- **2-248** — Ensemble $\mathbb{Q}$ des nombres rationnels — _hérite des bornes générales_
- **2-422** — Nombres irrationnels, exemples fournis par la géométrie comme $\sqrt{2}$ et $\pi$
  - Exemples fournis par la géométrie, « par exemple √2 et π » (liste non limitative). — _BO 2de p.7_ (BO)
- **2-249** — Lire l'abscisse d'un nombre réel sur une droite graduée
  - Abscisses réelles. — _BO 2de p.7_ (BO)
- **2-250** — Placer un nombre réel d'abscisse donnée sur une droite graduée
  - Abscisses réelles. — _BO 2de p.7_ (BO)
- **2-251** — Représenter un intervalle de la droite numérique
  - Intervalle de la droite numérique, borné ou non. — _BO 2de p.7_ (BO)
- **2-252** — Déterminer si un nombre réel appartient à un intervalle donné — _hérite des bornes générales_
- **2-253** — Donner un encadrement, d'amplitude donnée, d'un nombre réel par des décimaux
  - Encadrement d'amplitude donnée par des décimaux. — _BO 2de p.7_ (BO)
- **2-254** — Dans le cadre de la résolution de problèmes, arrondir en donnant le nombre de chiffres significatifs adapté à la situation étudiée
  - Arrondi au nombre de chiffres significatifs adapté, dans le cadre d'un problème. — _BO 2de p.7_ (BO)
- **2-255** — Le nombre rationnel $\tfrac{1}{3}$ n'est pas décimal — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-256** — Le nombre réel $\sqrt{2}$ est irrationnel — _hérite des bornes générales_
  - ⚠ Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins).
- **2-257** — Déterminer par balayage un encadrement de $\sqrt{2}$ d'amplitude inférieure ou égale à $10^{-n}$
  - Balayage ; amplitude inférieure ou égale à 10⁻ⁿ. — _BO 2de p.7_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-258** — Développement décimal illimité d'un nombre réel — _hérite des bornes générales_
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-259** — Observation, sur des exemples, de la périodicité du développement décimal de nombres rationnels
  - Sur des exemples. — _BO 2de p.7_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Statistiques et probabilités > Croisement de deux variables qualitatives

- **2-383** — Tableau croisé d'effectifs
  - Deux variables qualitatives (nominales ou ordinales). — _BO 2de p.12_ (BO)
  - ⚠ « Données réelles » : question l2-9.
- **2-384** — Fréquence conditionnelle — _hérite des bornes générales_
  - ⚠ « Données réelles » : question l2-9.
- **2-485** — Fréquence marginale — _hérite des bornes générales_
  - ⚠ « Données réelles » : question l2-9.
- **2-385** — Calculer des fréquences conditionnelles — _hérite des bornes générales_
  - ⚠ « Données réelles » : question l2-9.
- **2-486** — Calculer des fréquences marginales — _hérite des bornes générales_
  - ⚠ « Données réelles » : question l2-9.
- **2-386** — Compléter un tableau croisé par des raisonnements sur les effectifs
  - Par des raisonnements sur les effectifs. — _BO 2de p.12_ (BO)
  - ⚠ « Données réelles » : question l2-9.
- **2-487** — Compléter un tableau croisé en utilisant des fréquences conditionnelles
  - En utilisant des fréquences conditionnelles. — _BO 2de p.12_ (BO)
  - ⚠ « Données réelles » : question l2-9.
- **2-387** — À partir de deux listes représentant deux caractères d'individus, déterminer un sous-ensemble d'individus répondant à un critère (filtre, utilisation de ET, OU, NON)
  - Deux listes représentant deux caractères ; filtre avec ET, OU, NON. — _BO 2de p.12_ (BO)
  - ⚠ Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).
- **2-388** — Dresser le tableau croisé de deux variables qualitatives à partir du fichier des individus et calculer des fréquences conditionnelles ou marginales — _hérite des bornes générales_
  - ⚠ « Données réelles » : question l2-9. Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).

### Statistiques et probabilités > Information chiffrée et statistique descriptive

- **2-364** — Ensembles de référence inclus les uns dans les autres : pourcentage de pourcentage — _hérite des bornes générales_
- **2-365** — Évolution : variation absolue (variation additive) $V_2 - V_1$ — _hérite des bornes générales_
- **2-366** — Évolution : coefficient multiplicateur (variation multiplicative) $\tfrac{V_2}{V_1}$ — _hérite des bornes générales_
- **2-367** — Évolution : variation relative (taux d'évolution) $\tfrac{V_2 - V_1}{V_1}$ — _hérite des bornes générales_
- **2-368** — Évolutions successives : relation sur les coefficients multiplicateurs (produit)
  - Coefficient multiplicateur global = produit des coefficients. — _BO 2de p.12_ (BO)
- **2-478** — Évolution réciproque : relation sur les coefficients multiplicateurs (inverse)
  - Coefficient multiplicateur réciproque = inverse. — _BO 2de p.12_ (BO)
- **2-369** — Linéarité de la moyenne — _hérite des bornes générales_
- **2-370** — Indicateurs de dispersion : écart type
  - L'écart type est le seul indicateur de dispersion cité dans les contenus (la variance n'est pas citée). — _BO 2de p.12_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « Indicateurs de dispersion : écart type » ; la variance n'apparait nulle part au BO de 2de.
- **2-371** — Influence sur la moyenne de l'ajout ou de la suppression d'une valeur dans la série
  - Ajout ou suppression d'une valeur. — _BO 2de p.12_ (BO)
- **2-479** — Influence sur la médiane de l'ajout ou de la suppression d'une valeur dans la série
  - Ajout ou suppression d'une valeur. — _BO 2de p.12_ (BO)
- **2-372** — Représentation graphique : histogramme
  - Série continue regroupée en classes de même amplitude. — _BO 2de p.12_ (BO)
- **2-480** — Représentation graphique : polygone des fréquences cumulées
  - Série continue regroupée en classes de même amplitude. — _BO 2de p.12_ (BO)
- **2-375** — Exploiter la relation entre effectifs, proportions et pourcentages — _hérite des bornes générales_
- **2-376** — Traiter des situations simples mettant en jeu des pourcentages de pourcentages
  - Situations simples. — _BO 2de p.12_ (BO)
- **2-377** — Exploiter la relation entre deux valeurs successives et leur taux d'évolution — _hérite des bornes générales_
- **2-378** — Calculer le taux d'évolution global à partir des taux d'évolution successifs — _hérite des bornes générales_
- **2-379** — Calculer un taux d'évolution réciproque — _hérite des bornes générales_
- **2-380** — Pour une série regroupée en classes, calculer la moyenne à partir de la moyenne et des effectifs de chaque classe (moyenne pondérée)
  - Série regroupée en classes de même amplitude. — _BO 2de p.12_ (BO)
- **2-481** — Pour une série regroupée en classes, calculer la moyenne dans le cas particulier où la répartition est uniforme dans chaque classe (donc égale au centre de la classe)
  - Série regroupée en classes de même amplitude. — _BO 2de p.12_ (BO)
  - Répartition uniforme dans chaque classe : centre de la classe. — _BO 2de p.12_ (BO)
- **2-381** — Pour une série regroupée en classes, déterminer la classe médiane à partir des effectifs des classes
  - Série regroupée en classes de même amplitude. — _BO 2de p.12_ (BO)
- **2-482** — Pour une série regroupée en classes, estimer la médiane dans le cas d'une répartition uniforme dans la classe médiane
  - Série regroupée en classes de même amplitude. — _BO 2de p.12_ (BO)
  - Répartition uniforme dans la classe médiane. — _BO 2de p.12_ (BO)
- **2-382** — Décrire les différences entre deux séries statistiques, en s'appuyant sur le couple moyenne–écart type
  - Couple moyenne–écart type. — _BO 2de p.12_ (BO)
- **2-483** — Décrire les différences entre deux séries statistiques, en s'appuyant sur le couple médiane–écart interquartile
  - Couple médiane–écart interquartile. — _BO 2de p.12_ (BO)
- **2-484** — Décrire les différences entre deux séries statistiques, en s'appuyant sur des représentations graphiques données
  - Représentations graphiques données. — _BO 2de p.12_ (BO)

### Statistiques et probabilités > Probabilités

- **2-389** — Version vulgarisée de la loi des grands nombres : lorsque $n$ est grand, sauf exception, la fréquence observée est proche de la probabilité — _hérite des bornes générales_
- **2-390** — Probabilité conditionnelle d'un évènement $B$ sachant un évènement $A$ de probabilité non nulle ; notation $P_A(B)$
  - Notation P_A(B), A de probabilité non nulle. — _BO 2de p.13_ (BO)
- **2-391** — Arbres de probabilité, application au calcul de probabilités
  - Pas de calcul par les probabilités totales (partition de l'univers). — _BO 2de p.13_ (BO)
  - ⚠ Question l2-4.
- **2-392** — Observer, à l'aide d'une simulation sur Python ou tableur, que lorsque $n$ est grand la fréquence observée est proche de la probabilité (loi des grands nombres)
  - Simulation sur Python ou tableur. — _BO 2de p.13_ (BO)
- **2-393** — Construire un arbre pondéré en lien avec une situation donnée
  - En lien avec une situation donnée. — _BO 2de p.13_ (BO)
- **2-394** — Construire un tableau croisé d'effectifs en lien avec une situation donnée
  - En lien avec une situation donnée. — _BO 2de p.13_ (BO)
  - ⚠ ⚠ libellé : le BO dit « Construire un arbre pondéré ou un tableau », sans « croisé d'effectifs » ; question l2-10.
- **2-395** — Traduire un énoncé en langage naturel à l'aide des notations des probabilités ($P(A)$, $\bar{A}$, $P(A \cap B)$, $P_A(B)$)
  - Notations du programme : P(A), Ā, P(A ∩ B), P_A(B). — _BO 2de p.4, 13_ (BO)
  - ⚠ ⚠ libellé : la puce du BO dit seulement « Passer du registre de la langue naturelle au registre symbolique et inversement » ; la liste de notations est ajoutée (chaque notation est bien au BO, p.4 et p.13).
- **2-488** — Passer du registre symbolique ($P(A)$, $\bar{A}$, $P(A \cap B)$, $P_A(B)$) au registre de la langue naturelle
  - Notations du programme : P(A), Ā, P(A ∩ B), P_A(B). — _BO 2de p.4, 13_ (BO)
  - ⚠ ⚠ libellé : la puce du BO dit seulement « Passer du registre de la langue naturelle au registre symbolique et inversement » ; la liste de notations est ajoutée (chaque notation est bien au BO, p.4 et p.13).
- **2-396** — Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme de tableau croisé d'effectifs
  - Tableau croisé d'effectifs ; tirage au sort avec équiprobabilité d'un individu dans une population : P_B(A) = Card(A ∩ B) / Card(B). — _BO 2de p.13_ (BO)
- **2-397** — Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme d'arbre de probabilité
  - Arbre de probabilité ; pas de calcul par les probabilités totales. — _BO 2de p.13_ (BO)
  - ⚠ Question l2-4.
- **2-398** — Interpréter les pondérations de chaque branche d'un arbre en termes de probabilités, et notamment de probabilités conditionnelles — _hérite des bornes générales_
- **2-399** — Faire le lien entre la définition des probabilités conditionnelles et la multiplication des probabilités des branches du chemin correspondant
  - Probabilité d'un chemin = produit des probabilités de ses branches. — _BO 2de p.13_ (BO)
  - ⚠ Somme de chemins : question l2-4.
- **2-400** — Distinguer en situation $P_A(B)$ et $P_B(A)$, par exemple dans des situations de type « faux positifs »
  - Situations de type « faux positifs » ; vocabulaire des tests : faux positifs, faux négatifs, spécificité, sensibilité. — _BO 2de p.13_ (BO)
  - ⚠ Inversion du conditionnement sur un arbre : passe par P(B), donc par la question l2-4.

### Vocabulaire ensembliste et logique

- **2-201** — Notions d'élément d'un ensemble et d'appartenance
  - Symbole ∈ ; ensembles écrits {…}. — _BO 2de p.4_ (BO)
- **2-403** — Notions de sous-ensemble et d'inclusion
  - Symbole ⊂. — _BO 2de p.4_ (BO)
- **2-202** — Notion d'ensemble vide
  - Symbole Ø. — _BO 2de p.4_ (BO)
- **2-404** — Notion de réunion
  - Symbole ∪. — _BO 2de p.4_ (BO)
- **2-405** — Notion d'intersection
  - Symbole ∩. — _BO 2de p.4_ (BO)
- **2-406** — Notion de complémentaire
  - Notations Ā (celle des probabilités) ou E \ A. — _BO 2de p.4_ (BO)
- **2-203** — Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\ldots\,\}$
  - Symboles Ø, ∈, ⊂, ∩, ∪, {…} (liste du BO). — _BO 2de p.4_ (BO)
- **2-204** — Notation des ensembles de nombres
  - ℕ, ℤ, 𝔻, ℚ, ℝ. — _BO 2de p.4, 7_ (BO)
- **2-407** — Notation des intervalles
  - Notations du type [a ; +∞[, ]−∞ ; a], [a ; b], etc. (le BO écrit la virgule : [a, b]). — _BO 2de p.7_ (BO)
- **2-205** — Notion de couple et de produit cartésien de deux ensembles
  - Notion « rencontrée » seulement (« Ils rencontrent également la notion de couple et celle de produit cartésien ») ; aucune notation (E × F) n'est citée. — _BO 2de p.4_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « rencontrent » dit une rencontre, pas une connaissance exigible ; la notation E × F n'est pas écrite au BO.
- **2-206** — Notation du complémentaire d'un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$
  - Ā (notation des probabilités) ou E \ A. — _BO 2de p.4_ (BO)
- **2-207** — Notation $\operatorname{Card}(A)$ pour le cardinal d'un ensemble fini
  - Card(A), ensemble fini seulement. — _BO 2de p.4_ (BO)
- **2-208** — Reconnaitre ce qu'est une proposition mathématique
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-209** — Utiliser des variables pour écrire des propositions mathématiques
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-210** — Lire et écrire des propositions contenant le connecteur « et »
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
  - Connecteur « et ». — _BO 2de p.4_ (BO)
- **2-408** — Lire et écrire des propositions contenant le connecteur « ou »
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
  - Connecteur « ou ». — _BO 2de p.4_ (BO)
- **2-211** — Formuler la négation de propositions simples (sans implication ni quantificateurs)
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
  - Propositions simples, sans implication ni quantificateurs. — _BO 2de p.4_ (BO)
- **2-212** — Mobiliser un contre-exemple pour montrer qu'une proposition est fausse
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-213** — Formuler une implication
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-409** — Formuler une équivalence logique
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-410** — Mobiliser une implication, une équivalence logique dans un raisonnement simple
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
  - Raisonnement simple. — _BO 2de p.4_ (BO)
- **2-214** — Formuler la réciproque d'une implication
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-411** — Formuler la contraposée d'une implication
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
- **2-215** — Lire et écrire des propositions contenant une quantification universelle (les symboles $\forall$ et $\exists$ sont hors programme)
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
  - Quantification universelle en mots (« pour tout ») ; symbole ∀ hors programme. — _BO 2de p.4_ (BO)
- **2-412** — Lire et écrire des propositions contenant une quantification existentielle (les symboles $\forall$ et $\exists$ sont hors programme)
  - Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle). — _BO 2de p.4_ (BO)
  - Quantification existentielle en mots (« il existe ») ; symbole ∃ hors programme. — _BO 2de p.4_ (BO)
- **2-216** — Produire un raisonnement par disjonction des cas — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait produire un raisonnement par disjonction des cas, sous les bornes générales.
- **2-217** — Produire un raisonnement par l'absurde — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait produire un raisonnement par l'absurde, sous les bornes générales.
