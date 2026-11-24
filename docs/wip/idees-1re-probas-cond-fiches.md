# Fiches de phase 0 : probabilités conditionnelles de Première (2026-11-24)

Chantier [`idees-1re-probas-cond`](idees-1re-probas-cond-progress.md) ·
[relevé](idees-1re-probas-cond-releve.md). Pour chaque idée : ma recommandation, son point (un seul,
ADR 0020), sa sous-notion, ses variations, ses plages, sa forme de réponse et le passage « chez eux →
chez nous ». Chaque variation aura ses `testSpecs`, trois erreurs prévues par case et un coup de
pouce qui ne donne pas la réponse.

**Question d'accès** : personne ne gagne d'accès. Les migrations ne font que ranger des modèles
(nœud et point) et ajouter des variations.

## F1. Lire une probabilité dans un énoncé chargé (1P10-1) : variation de 31096bae (2-395)

- **Chez eux → chez nous** : chez eux, trois cases où l'on tape une notation, ou sa valeur. Taper une
  notation, notre QCM 31096bae le fait déjà mieux, avec des leurres choisis. On reprend le sens
  inverse : la notation est donnée, l'élève lit sa valeur dans un énoncé à six informations.
- **V5** : énoncé de six phrases en pourcentages (valises : deux ou quatre roues, tests réussis). Trois
  cases : P_Ā(B), P(A ∩ B) et P_B(Ā), en décimaux. Les six valeurs sont écrites dans l'énoncé, il
  n'y a rien à calculer : c'est de la lecture, donc dans les bornes de 2de (l2-4).
- **Plages** : P(A) de 45 à 55 % (sans 50), P_A(B) de 83 à 93 %, P_Ā(B) de 85 à 98 %. Les autres
  valeurs sont arrondies au dixième de pour cent, et l'énoncé affiche exactement les nombres attendus.
- **Erreurs prévues** : pour P_Ā(B), la valeur de P(B) ou celle de P_A(B) ; pour P(A ∩ B), celle de
  P_A(B) ; pour P_B(Ā), celle de P_Ā(B).
- **Coup de pouce** : « "Parmi les …" désigne la condition : c'est l'évènement écrit en indice. »

## F2. P(A ∩ B) = P(A) × P_A(B), dans les deux sens (1P10-2) : modèle neuf, 2de, 2-390

- **Chez eux → chez nous** : une case, en décimal ou en fraction irréductible. Chez nous aussi une
  case, avec la consigne « fraction irréductible ou décimal exact », comme 5ba712bc.
- **Sous-notion** : la notion « Probabilités conditionnelles » elle-même, là où se trouve 31096bae.
  **Niveau** : `grades = ["2"]`. Le modèle sert aussi en 1re, mais un point de 2de ne peut pas porter
  1_SPE.
- **V1** : P(A) = 0,a et P_A(B) = 0,b sont donnés, calculer P(A ∩ B) (a, b de 1 à 9).
- **V2** : P(A) = 0,a et P(A ∩ B) = 0,ab sont donnés, calculer P_A(B).
- **V3** : en fractions (P(A) = n/d, P_A(B) = r/s, dénominateurs ≤ 9), calculer P(A ∩ B) en fraction
  irréductible.
- **V4** : en fractions, P_A(B) à partir de P(A) et de P(A ∩ B) (une division de fractions).
- **V5** : en situation (spams : x % des messages sont des spams, le logiciel supprime y % des
  spams). On demande la probabilité qu'un message soit un spam supprimé, P(A ∩ B).
- **Erreurs prévues** : P(A) + P_A(B) ; P(A ∩ B) × P(A) en V2 ; P(A)/P(A ∩ B) (quotient à
  l'envers) ; en fractions, le produit des numérateurs sur la somme des dénominateurs.
- **Coup de pouce** : « La définition : P_A(B) = P(A ∩ B)/P(A). »

## F3. Inversion sur un arbre, condition contraire (1P11-1) : variation de 69a05f98 (1SPE-340)

- **Chez eux → chez nous** : même forme, une case en fraction irréductible.
- **V4** : arbre en dixièmes, calculer P_B̄(A). 69a05f98 n'a que P_B(A) et P_B̄(Ā).
- **Erreurs prévues** : P_A(B̄) (le conditionnement à l'envers) ; P(A ∩ B̄) (on oublie de diviser) ;
  P_B(A) (on oublie la barre).
- **Coup de pouce** : « Calcule d'abord P(B̄) par la formule des probabilités totales. »
- C'est petit. Si tu juges que trois variations suffisent, on ne fait rien.

## F4. Tableau croisé d'effectifs (1P11-2) : rien

cf548ea1, f3e68e4b et 4016b05c couvrent la probabilité simple, l'intersection et les deux
conditionnelles, contraires compris.

## F5. Retrouver P(A) par les probabilités totales (1P12-1) : modèle neuf, 1SPE-340

- **Chez eux → chez nous** : chez eux, une case (P(A) en dixième), ou six cases dans l'arbre. Chez
  nous, une case, et l'arbre ` ```probtree ` dont les deux premières branches portent `?`. Compléter
  tout l'arbre existe déjà (fe6f5606, 9d7c4d98). L'idée neuve, c'est l'équation.
- **Sous-notion** : « probabilités totales ». **Niveau** : `grades = ["1_SPE"]`.
- **V1** : sans arbre. P(B) = 0,xy, P_A(B) = 0,b et P_Ā(B̄) = 0,c sont donnés, calculer P(A).
- **V2** : avec l'arbre, P(A) = ? et P(Ā) = ? sur les branches, P(B) donnée, calculer P(A).
- **V3** : en situation (« x % des élèves viennent en bus ; parmi les demi-pensionnaires … »), quelle
  proportion d'élèves est demi-pensionnaire ?
- **Plages** : P(A) de 0,2 à 0,8 (dixièmes), P_A(B) et P_Ā(B) des dixièmes distincts. P(B) tombe
  alors juste au centième, sans arrondi.
- **Erreurs prévues** : P(B)/P_A(B) ; P(B) − P_Ā(B), sans diviser ; P(Ā) donnée à la place de
  P(A) ; P(B) × P_A(B).
- **Coup de pouce** : « Note x = P(A) et écris P(B) avec la formule des probabilités totales : tu
  obtiens une équation d'inconnue x. »
- **Variante de point** : 1SPE-421 (« formule des probabilités totales relative à une partition »)
  n'a aucun modèle. Je recommande pourtant 1SPE-340, comme nos cinq modèles de la formule : 421 est
  le libellé du savoir, 340 le savoir-faire. À toi de voir.

## F6. Indépendance lue sur un tableau d'effectifs (1P13-1) : modèle neuf, 1SPE-424

- **Chez eux → chez nous** : chez eux, cinq cases (trois fractions, « = / ≠ », « Oui / Non »). Un
  Oui / Non se devine une fois sur deux. Chez nous :
  - **V1** : QCM à quatre propositions qui portent leur justification, avec les valeurs du tirage :
    « Oui, car P(A ∩ B) = P(A) × P(B) = … » / « Non, car P(A ∩ B) = … ≠ P(A) × P(B) = … » /
    « Oui, car P(A ∩ B) ≠ 0 » / « Non, car P(A) ≠ P(B) ». Les deux issues (indépendants ou non)
    sortent chacune une fois sur deux.
  - **V2** : même tableau, méthode P_A(B) = P(B) : les propositions comparent P_A(B) et P(B).
  - **V3** : une case. Le tableau a une case effacée : « Quel effectif rend A et B indépendants ? »
    La réponse se calcule, n(A ∩ B) = n(A) × n(B)/N, et elle ne se devine pas.
- **Sous-notion** : « indépendance ». **Niveau** : `grades = ["1_SPE"]`.
- **Situations** : festival (soirée × tarif réduit), ateliers d'un lycée (théâtre × demi-pension),
  salle de sport (formule × mensualités).
- **Plages** : effectifs des colonnes multiples de 10, de 20 à 90 ; P(S) = p/10 avec p de 3 à 7 ;
  écart nul (indépendants) ou de 3 à 8 personnes.
- **Erreurs prévues** (V3) : n(A) × n(B) sans diviser par N ; n(A) + n(B) − N ; n(A)/N.
- **Coup de pouce** : « Indépendants : P(A ∩ B) = P(A) × P(B). Écris chaque probabilité comme un
  effectif sur l'effectif total. »

## F7. Problème à données mélangées (1P14-1, 1P14-2) : modèle neuf, 1SPE-340

- **Chez eux → chez nous** : chez eux, un sujet d'E3C rédigé, sans saisie. Chez nous, les trois
  questions calculables en trois cases, comme 2c116f4d (P(B), puis inversion arrondie, avec
  `precision`). L'arbre et les interprétations restent dans le corrigé.
- **L'idée neuve** : l'énoncé donne P(A), **P(A ∩ B)** et P_Ā(B), mais pas P_A(B). Il faut d'abord
  retrouver P_A(B), puis P(B), puis inverser. Nos problèmes donnent toujours P_A(B).
- **Sous-notion** : « probabilités totales ». **Niveau** : `grades = ["1_SPE"]`.
- **V1** : agence de voyage (A : avion ; V : visite guidée). Cases : P_A(V), P(V), puis P_V̄(A) au
  centième.
- **V2** : salon de coiffure (C : couleur-soin ; E : effet « coup de soleil »). Cases : P_C(E),
  P(E), puis P(C̄ ∩ Ē).
- **V3** : snack (S : sandwich ; D : dessert ; données P(S), P_S(D) et P_S̄(D̄)). Cases : P(S ∩ D),
  P(D), puis P_D(S̄) au centième. C'est le sens classique : il en reprend le contexte.
- **Plages** : pourcentages entiers ; P(A) de 30 à 70 %, P(A ∩ B) de 20 % à P(A) − 5 %, P_Ā(B) de
  30 à 70 %.
- **Erreurs prévues** : P_A(V) pris égal à P(A ∩ V) ; P(V) = P(A ∩ V) + P_Ā(V) (oubli du facteur
  P(Ā)) ; P_V̄(A) = P(A ∩ V̄), sans diviser.
- **Coup de pouce** : « Commence par retrouver P_A(V) = P(A ∩ V)/P(A), puis complète l'arbre. »

## Écartés

- « Deux clients indépendants : aucun ne prend l'option » (1P14-2) : couvert par d5780995.
- Taper une notation au clavier (1P10-1) : 31096bae le fait en QCM (voir F1).
