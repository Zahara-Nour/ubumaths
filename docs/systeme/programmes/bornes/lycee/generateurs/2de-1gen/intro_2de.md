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
