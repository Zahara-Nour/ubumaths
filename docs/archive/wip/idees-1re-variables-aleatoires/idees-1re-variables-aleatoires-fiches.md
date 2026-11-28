# Fiches de phase 0 : variables aléatoires réelles de Première (2026-11-26)

Chantier [`idees-1re-variables-aleatoires`](idees-1re-variables-aleatoires-progress.md) ·
[relevé](idees-1re-variables-aleatoires-releve.md). Une seule idée : la rubrique n'a qu'un exercice.
Chaque variation aura ses `testSpecs`, trois erreurs prévues par case visée et un coup de pouce qui
ne donne pas la réponse.

**Question d'accès** : personne ne gagne d'accès. Les migrations ne font que ranger un modèle neuf
(nœud et point).

## F1. Déterminer la loi de X : tableau à compléter (1P20-1) — modèle neuf, 1SPE-355

- **Chez eux → chez nous** : chez eux, la ligne des valeurs est donnée et l'élève ne tape que les
  probabilités. Chez nous, un tableau markdown à cases `$?$` : en v1 et v2, l'élève remplit **aussi
  la ligne des valeurs**, rangées dans l'ordre croissant. C'est là que se fait l'erreur typique
  (oublier de déduire la mise). En v3 les valeurs 0, 1, 2 sont évidentes : elles sont données.
- **Point** : 1SPE-355 « Déterminer la loi de probabilité d'une variable aléatoire ». **Sous-notion** :
  « loi d'une variable aléatoire » (celle de d683e906). **Niveaux** : `1_SPE`, et `1_TECHNO` avec le
  point 1TECHNO-095 si David le veut (question Q1), comme d683e906.
- **Forme de réponse** : une case par cellule cachée ; probabilités en fraction irréductible ou en
  décimal exact (consigne de b83f1392 et 97b3a376).
- **V1 — Pari aux cartes** : jeu de 32 **ou** 52 cartes, dont la composition est rappelée dans
  l'énoncé (4 as, 12 figures). Mise $a$ de 2 à 10 € ; un as rapporte $b$ (30, 40 ou 50 €) ; une
  figure rapporte $c$, de $a + 5$ à $a + 10$ € ; le reste rien. $X$ = gain algébrique (ce qu'on reçoit
  moins la mise). Six cases : $-a < c - a < b - a$, puis $\frac{16}{32}=\frac12$, $\frac38$, $\frac18$
  (32 cartes) ou $\frac{9}{13}$, $\frac{3}{13}$, $\frac{1}{13}$ (52 cartes). Le jeu de 52 cartes
  évite que les probabilités soient toujours les mêmes, comme chez eux.
- **V2 — Loterie** : $N$ tickets (2 000 à 5 000, par centaines) vendus $p$ € (2 à 5 €) ; 1 gros lot
  $L_1$ (1 000 à 5 000 €), $n_2$ lots $L_2$ (5 à 10 lots de 500 à 1 000 €), $n_3$ lots $L_3$ (50 à
  100 lots de 50 à 100 €), les autres perdants. $X$ = gain algébrique du joueur qui achète un ticket :
  le prix du ticket est déduit, comme dans nos 97a4df30 et b83f1392 (chez eux, valeur brute). Huit
  cases : $-p < L_3 - p < L_2 - p < L_1 - p$, puis $\frac{N-1-n_2-n_3}{N}$, $\frac{n_3}{N}$,
  $\frac{n_2}{N}$, $\frac{1}{N}$, irréductibles.
- **V3 — Deux tirs au but** : une joueuse marque avec la probabilité $\frac{a}{b}$ ($b$ de 3 à 9,
  $a < b$, premiers entre eux), deux tirs indépendants ; $X$ = nombre de buts. Pas d'arbre dans
  l'énoncé, l'élève le construit (dans les bornes : deux épreuves indépendantes, sur un arbre). Valeurs
  0, 1, 2 données ; trois cases : $\frac{(b-a)^2}{b^2}$, $\frac{2a(b-a)}{b^2}$, $\frac{a^2}{b^2}$.
- **Erreurs prévues** :
  - V1, V2 (valeurs) : le montant reçu sans déduire la mise ($b$ au lieu de $b - a$) ; $0$ au lieu de
    $-a$ pour « rien gagné » ; la mise comptée en plus ($b + a$).
  - V1 (probabilités) : $\frac{4}{32}$ non simplifiée ; $\frac{1}{4}$ pour un as (« 4 as » lu comme
    un quart) ; les figures comptées sans les rois ($\frac{8}{32}$).
  - V2 (probabilités) : $\frac{N - n_2 - n_3}{N}$ (le gros lot oublié dans les perdants) ;
    $\frac{n_2}{N - 1}$ ; une fraction non simplifiée.
  - V3 : $P(X=1) = \frac{a(b-a)}{b^2}$ (un seul chemin) ; $P(X=0) = 1 - \frac{a}{b}$ (un seul tir) ;
    $P(X=2) = \frac{2a}{b}$ (somme au lieu du produit).
- **Coups de pouce** : V1 « Commence par la ligne des valeurs : pour chaque carte, ce que reçoit le
  joueur moins ce qu'il a misé. » ; V2 « Le joueur paie son ticket dans tous les cas, même s'il
  gagne. » ; V3 « Dessine l'arbre des deux tirs : combien de chemins donnent exactement un but ? »

## Questions à David

- **Q1** : ranger aussi le modèle en **1re techno** (point 1TECHNO-095, « loi, sans formalisme, en
  contexte »), comme d683e906 ? Leur exercice y est rangé aussi. **Ma recommandation : oui.**
- **Q2** : en v1 et v2, faire remplir **la ligne des valeurs** (ordre croissant imposé) en plus des
  probabilités ? **Ma recommandation : oui** : c'est la modélisation, et l'erreur de la mise oubliée
  se voit là. Sinon, les valeurs sont données comme chez eux.
