# Lot cycle2 (CP, CE1, CE2) — questions à trancher

Analyse du 2026-10-18, 159 modèles. Résultats : [cycle2.csv](cycle2.csv).

## Q-c2-a — `e94c03b6` « Calculer astucieusement un produit » (CE1)

- **Modèle** : 2 × a × 5, 5 × a × 2, a × 5 × 2, a × 2 × 5, avec a de 19 à 40 ; consigne
  « Calcule de manière astucieuse ». Résultats de 190 à 400 (dans le champ du CE1).
- **Exemple** : 2 × 26 × 5 = ? → 260 (on calcule 2 × 5 = 10, puis 26 × 10).
- **Le point candidat** : CE1-024 « Comprendre et savoir que la multiplication est
  commutative » (exemple du BO : potager 8 × 4 = 4 × 8). Le modèle est sur le nœud
  « multiplication > calcul astucieux ».
- **L'hésitation** : la tâche se sert de la commutativité pour réordonner les facteurs. Mais
  elle demande aussi l'associativité (regrouper 2 × 5), que le BO ne nomme pas au CE1, et la
  multiplication d'un nombre à deux chiffres par 10 (CE1-030). Le point est une connaissance
  de propriété ; le modèle est un calcul astucieux à trois facteurs.
- **Options** :
  1. `TAG CE1-024` : le point décrit le ressort de la tâche (réordonner les facteurs).
  2. `HORS_PROGRAMME` : CE1-024 est une propriété voisine, il ne décrit pas un calcul à trois
     facteurs ; le modèle reste dans l'arbre sans tag.
- **Reco** : option 1. Réordonner les facteurs, c'est exactement « savoir que la
  multiplication est commutative » mis en œuvre. Les nombres restent dans le champ du CE1, et
  aucun autre point du CE1 ne décrit mieux la tâche. Son équivalent CE2 (`fbd02016`, a × b × c
  avec a × b = 100, jusqu'à 9 900) n'a pas de point de commutativité au CE2 : il est
  `HORS_PROGRAMME`, quelle que soit la réponse.

## À signaler (pas des questions)

- **`716d5c68` (CP), TAG_PAR_VARIATION** : V1-V4 (deux nombres à deux chiffres) relèvent de
  CP-026 ; V5-V8 (deux chiffres + un chiffre) relèvent de CP-024. Proposition : retirer
  V5-V8 du modèle pour le taguer CP-026.
- **Tables de multiplication jusqu'à × 12** (5 modèles CE1, 4 modèles CE2) : a = 2..12. Or le
  BO borne les deux facteurs à 10. La correction proposée est a = 2..10. L'ancien CSV les
  taguait tels quels.
- **Changements de nœud nécessaires au tag** (le point est sur un autre nœud) : `12c377ec`
  (complément → tables, CP-018), `5bd4b19a`, `17ed1fc1` et `13d52989` (écritures →
  décomposition), `022130ca` (addition → multiplication > double et moitié, CE1-028),
  `acf15102` (tables → calcul astucieux), `c73734a8` (numération > écritures → Arithmétique >
  Divisibilité > pair ou impair, CE1-025), `4988fdac` et `56b2737d` (quadruple et quart →
  calcul astucieux, CE2-026).
- **Jumeaux sur le nœud sans point** (R4) : au CP les doubles et moitiés côté multiplication
  (`89bef942`, `25285413`, `a3ef26ab`), au CE2 côté addition (`427c735c`, `44c46578`). Ils
  restent sans tag, même quand leurs valeurs sont dans les bornes. Le jumeau de l'autre nœud
  porte le tag.
