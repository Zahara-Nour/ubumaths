# Lot `tspe` : questions à trancher

Analyse du 2026-10-23 (étape d, passe lycée), 71 modèles de Tle spé. Détail ligne à ligne : [tspe.csv](tspe.csv).
Trois questions, cinq modèles.

## 1. Suite majorée, minorée, bornée : quel point ? (1 modèle)

**Modèle** `b59fe450-e57a-4dfc-8aa7-29337b3fa28f`, « Suite majorée, minorée ou bornée » (aucun point aujourd'hui).

**Exemple tiré du relevé** : « Soit (uₙ) la suite définie pour tout entier naturel n par uₙ = n² − 9. Quelle
affirmation est vraie ? » A. majorée, mais pas minorée · B. minorée, mais pas majorée · C. ni majorée ni minorée ·
D. bornée (réponse : B). Les autres variations : a − bn, a + b/(n + 1), (−q)ⁿ avec q ∈ {2, 3, 4}, a + b(−1)ⁿ.

**Le problème** : le BO de Tle spé n'a aucun contenu « suite majorée, minorée, bornée ». Le mot n'apparaît que dans
les hypothèses de deux théorèmes (bo/tspe.txt l. 550 et 559). Le BO de 1re spé ne le définit pas non plus. Aucun
point ne décrit la tâche « qualifier une suite de majorée, minorée ou bornée ».

**Options**

- **A. TSPE-384** « Théorème admis : toute suite croissante majorée (ou décroissante minorée) converge » : la notion
  sert d'hypothèse à ce théorème, et le modèle l'exerce. Mais le modèle n'utilise jamais le théorème.
- **B. TSPE-385** « Établir la convergence d'une suite, ou sa divergence vers +∞ ou −∞ » (outils : « monotonie et
  bornes ») : il est plus large, mais le modèle ne fait établir aucune limite.
- **C. Pas de point (hors programme au sens strict)** : le modèle reste dans l'arbre comme prérequis, sans point
  de programme.

**Recommandation** : **A**. La notion est exigée de fait par TSPE-384, dont le libellé la nomme. C'est le point le
plus proche de ce que le modèle fait travailler.

## 2. Fonctions x ↦ cos(ax + b) et sin(ax + b) : dans les points sinus et cosinus ? (3 modèles)

**Modèles**

- `7df468d6-647c-4b59-9a6c-026a2279fd86`, « Période de x ↦ cos(ax + b) et x ↦ sin(ax + b) ». Exemple : « Soit f la
  fonction définie sur ℝ par f(x) = sin(6x − 4). Donne la plus petite période strictement positive de f. » →
  π/3. Autres : cos(x/5) → 10π, 5 sin(πx) → 2.
- `5072030d-8036-4621-a92b-75df54d371f9`, « Lire la période sur la courbe d'une fonction trigonométrique ». Exemple :
  la courbe de c·cos(4x) (c ∈ {1, 2}) tracée sur [−2π ; 2π] ; « Par lecture graphique, donne sa plus petite période strictement
  positive » → π/2. Autres : sin(3x), cos(x/2), sin(πx).
- `42f091c1-35f2-47e4-8fb3-e38c1bbf0dfd`, « Résoudre cos(2x) = a ou sin(2x) = a sur un intervalle ». Exemple :
  « Résous dans ]−π ; π] l'équation cos(2x) = √3/2 » → {−11π/12 ; −π/12 ; π/12 ; 11π/12}.

**Le problème** : le BO ne parle que des fonctions sinus et cosinus elles-mêmes.

- TSPE-598 « Périodicité des fonctions sinus et cosinus » est borné à « périodicité (2π) ».
- TSPE-601 « Traduire graphiquement la périodicité des fonctions sinus et cosinus » est borné de même.
- TSPE-457 « Résoudre une équation du type cos(x) = a » : les décisions lts-1 à lts-3 ont tranché le sinus,
  l'intervalle et les valeurs de a, pas un argument 2x ou ax + b.

La seule ouverture du BO est TSPE-459 « étudier une fonction simple définie à partir de fonctions trigonométriques,
pour déterminer des variations, un optimum ». Ces trois modèles ne demandent ni variations ni optimum.

**Options**

- **A. Admettre x ↦ cos(ax + b) et x ↦ sin(ax + b)** dans les trois points : « du type cos(x) = a » couvre
  cos(ax + b) = a (changement de variable X = ax + b), et la périodicité de cos(ax + b) découle de celle de cos.
  Les trois modèles prennent alors leur point : 7df468d6 → TSPE-598, 5072030d → TSPE-601, 42f091c1 → TSPE-457.
- **B. Sinus et cosinus seulement, comme le texte l'écrit** : les trois modèles restent sans point (hors programme
  dans l'arbre). Le modèle 4314e62e (cos x = a dans ℝ) et le modèle 7b4b149a (courbe de sin(x − π/2) parmi d'autres)
  ne changent pas.
- **C. Équation oui, période non** : cos(2x) = a est admis dans TSPE-457 (changement de variable), mais la période
  2π/a reste hors des points de périodicité. 42f091c1 → TSPE-457 ; 7df468d6 et 5072030d sans point.

**Recommandation** : **A**. « Du type » désigne une famille d'équations résolues de la même façon (même lecture
que lts-1), et cos(2x) = a est l'exemple le plus courant de cette famille au baccalauréat. La période de cos(ax)
n'est qu'un changement d'échelle, que l'on traduit sur la courbe comme pour cos. Si David veut s'en tenir au texte,
choisir B.

## 3. Variables indépendantes « données » sans expérience : dans la borne ? (1 modèle)

**Modèle** `71cb8ab7-664a-45f6-83b0-6b0739ebb5a1`, « Somme de variables aléatoires : espérance et variance ».

**Exemple tiré du relevé** : « Deux variables aléatoires **indépendantes** X et Y vérifient V(X) = 9 et V(Y) = 7.
Calcule V(4X + 3Y). » → 207. Autres variations : V(X + Y) avec variances décimales, V(X − Y), σ(X + Y) avec
σ(X) = 8 et σ(Y) = 15 (→ 17) ; et une variation sans indépendance, E(4X + 5Y).

**Le problème** : la borne générale de T_SPE dit que les variables aléatoires indépendantes sont « toujours
envisagées dans le cadre de la succession d'épreuves indépendantes » ; toute question qui fait **justifier**
l'indépendance de variables données a priori est hors programme. TSPE-520 « relation d'additivité
V(X + Y) = V(X) + V(Y) » est borné à « X, Y indépendantes issues d'une succession d'épreuves indépendantes ». Ici
l'énoncé déclare l'indépendance sans aucune expérience : rien n'est à justifier, mais le cadre de la succession
d'épreuves est absent.

**Options**

- **A. Accepter** : l'indépendance est une donnée, rien n'est à justifier. TSPE-527 « Calculer la variance d'une
  variable aléatoire, notamment en l'exprimant comme somme de variables aléatoires indépendantes » couvre V2 à V5.
  Il reste à séparer V1 (espérance, TSPE-526) pour un TAG strict.
- **B. MODIFIER** : habiller V2 à V5 d'une succession d'épreuves (« X est le gain du premier jeu, Y celui du second,
  joué indépendamment… »), puis TSPE-527.
- **C. Refuser** V2 à V5 : sans cadre, pas de point.

**Recommandation** : **A**. La borne vise le cadre dans lequel on rencontre l'indépendance et interdit de la faire
justifier. Une donnée « X et Y indépendantes » n'est pas une justification. L'habillage de l'option B ne changerait
pas le calcul demandé. Si David lit « toujours envisagées dans le cadre » comme une obligation d'énoncé, choisir B.
