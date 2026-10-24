# Scission des modèles TAG_PAR_VARIATION : plan

_2026-10-23, d'après `scissions-lignes.csv` (60 modèles) et les relevés ; détail : `scissions-plan.csv`._

## Comptes

| Classe     | Modèles | Résultat                                                               |
| ---------- | ------- | ---------------------------------------------------------------------- |
| SCINDER    | 47      | 47 origines + **62 modèles neufs** (109 modèles)                       |
| SANS_TAG   | 2       | `f8ccc8b6` (vrai/faux, 7 points), `a80a780f` (QCM de cours, 4 groupes) |
| A_TRANCHER | 11      | voir ci-dessous                                                        |

Règles appliquées : l'origine garde le groupe le plus nombreux ; à égalité, celui du tag actuel ; si le tag actuel
n'est dans aucun groupe, le premier code de la colonne `code` du CSV (`119b9148`, `49fac266`, `efb12f4b`).
Pour les modèles T_SPE,T_COMP qui n'ont qu'une ligne (l'autre programme est TAG), le point de l'autre programme
vient de `tspe-tcomp.csv` et vaut pour tous les groupes.

Une seule variable commune (`shared`) dans les 60 modèles : `a` (3..5) de `a86442c1`, utilisée par V3 et V6, qui
restent sur l'origine ; ne pas la copier dans le neuf (V5, √x).

Modèles neufs à **instance unique** (variation sans aucune variable) : `a86442c1` V5, `68166a11` V1 et V5,
`9ad36217` V1 (z = 1 fixe). Ils ont un sens seuls (question flash), mais l'élève verra toujours la même question.

## A_TRANCHER

### 1-5. Famille E3 : `61e2ac1f`, `d2943133`, `f63408c5`, `d2067413`, `c90fa022`

Aucune partition par variation : chaque question (QCM arithmétique / géométrique / ni l'un ni l'autre) mobilise les
deux définitions, quelle que soit sa réponse. La décision m-1spe-a-3 (« scinder ») ne se fait donc pas en répartissant
des variations.

- **A** — Dédoubler et réécrire : chaque modèle donne deux modèles qui gardent **toutes** les variations, la question
  devenant binaire. « La suite est-elle arithmétique ? » sur l'origine (1SPE-213 ; 1SPE-230 pour `c90fa022`), « est-elle
  géométrique ? » sur le neuf (1SPE-216 ; 1SPE-379). 5 neufs. Pour `d2067413`, le tag 1SPE-214 est retiré.
- **B** — Répartir les variations par réponse attendue (arithmétiques → 1SPE-213, géométriques → 1SPE-216, « ni l'un
  ni l'autre » partagées) en gardant le QCM à trois choix. Chaque question resterait sur les deux définitions, ce qui
  contredit l'inclusion stricte.
- **C** — Sans tag de 1re spé (option « hors » de m-1spe-a-3).

**Recommandation : A**, qui est la décision m-1spe-a-3 telle que David l'a validée. Ce n'est pas une scission
mécanique : les énoncés et les choix sont à réécrire, comme pour un MODIFIER.

### 6. `0dee4515` Somme et produit des racines

Les deux variations (a = 1, a ≠ 1) demandent chacune la somme **et** le produit. La partition se fait par case.

- **A** — Scission par case : l'origine garde V1, V2 avec la seule case « somme » (1SPE-245) ; le neuf reprend V1, V2
  avec la seule case « produit » (1SPE-383).
- **B** — Garder 1SPE-245 tel quel (la case « produit » déborde).
- **C** — Sans tag. **Recommandation : A** (décision m-1spe-a-6, « scinder »).

### 7. `37ce7759` Convexité et inflexion : lecture graphique (QCM, pas de cours)

T_SPE : V1 → TSPE-419, V2 → TSPE-588, V3 → TSPE-590, V4 → TSPE-587. T_COMP : V1-V3 → TCOMP-264, V4 → TCOMP-353.
On obtient 4 groupes, chacun d'une variation tirée au hasard (s, h, k).

- **A** — Scinder en 4 : l'origine garde V1 (TSPE-419 + TCOMP-264, tags actuels) ; trois neufs : V2 (TSPE-588 +
  TCOMP-264), V3 (TSPE-590 + TCOMP-264), V4 (TSPE-587 + TCOMP-353).
- **B** — Scinder en 2 selon T_COMP (V1-V3 sans point de Tle spé, V4) : la Tle spé perd trois questions.
- **C** — Sans tag. **Recommandation : A.** Ce sont quatre capacités distinctes du BO, et chaque variation tient seule.

### 8. `ef3c495c` Coefficients binomiaux : chemins, symétrie, triangle de Pascal

T_SPE : 5 points (V1 546, V2 315, V3 316, V4 314, V5 547). T_COMP : {V1, V4} 288, {V2} 362, {V3, V5} 296. La
partition commune donne 5 groupes.

- **A** — Scinder en 5, un modèle par variation. L'origine garde V4 (tag actuel TSPE-314, TCOMP-288).
- **B** — Relire V5 en TSPE-316. V5 déduit une ligne du triangle de la précédente : c'est l'application de la relation
  de Pascal, comme V3, et la Tle compl. les met déjà ensemble. On obtient 4 modèles : {V1} (546, 288), {V2} (315, 362),
  {V3, V5} (316, 296) et {V4} (314, 288). L'origine garde {V3, V5}, groupe le plus nombreux.
- **C** — Sans tag.

**Recommandation : B**, mais il faut que David change le verdict de V5 en Tle spé (TSPE-547 devient TSPE-316).

### 9. `6c80b4ec` Loi binomiale : utiliser une table de P(X ⩽ k)

T_SPE : V1 619, V2 510, V3 620, {V4, V5} 511. T_COMP : V1-V3 297, {V4, V5} 299. On obtient 4 groupes.

- **A** — Scinder en 4 : l'origine garde V4, V5 (TSPE-511 + TCOMP-299) ; neufs V1 (619 + 297), V2 (510 + 297), V3
  (620 + 297).
- **B** — Scinder en 2 selon T_COMP : V1-V3 sans point de Tle spé.
- **C** — Sans tag. **Recommandation : A.** Chaque variation a sa propre table et son propre k tiré au hasard, et tient seule.

### 10. `45d1cdd6` Formules d'Euler, de Moivre, d'addition et de duplication (T_EXP)

On obtient 4 groupes : {V1, V2} 240, {V3} 363, {V4} 230, {V5} 231. V1 à V4 n'ont aucune variable (instance unique).

- **A** — Scinder en 4 : l'origine garde V1, V2 (TEXP-240, Euler) ; neufs V3 (Moivre, instance unique), V4 (cos π/12,
  instance unique), V5 (duplication, m et q tirés).
- **B** — Scinder en 2 (origine V1, V2 et neuf V5), en retirant V3 et V4.
- **C** — Sans tag.

**Recommandation : A.** Ce sont des questions de cours fixes mais légitimes, et B perdrait Moivre et les formules
d'addition.

### 11. `30b597c3` Bernoulli, binomiale ou géométrique : identifier la loi

La partition est nette en 3 groupes, identiques dans les deux programmes : {V1, V4} (618, 367), {V2} (516, 368),
{V3} (502, 295). Le découpage reste douteux pour deux raisons. La tâche consiste à discriminer les lois, et chaque neuf
aurait toujours la même réponse. De plus, V2 n'a aucune variable (instance unique, réponse 𝒢(1/6)).

- **A** — Scinder en 3 tel quel. L'origine garde V1, V4 (binomiale ou pas), où la discrimination subsiste.
- **B** — A, puis enrichir V2 (dé à n faces, probabilité p tirée), à traiter comme un MODIFIER.
- **C** — Sans tag.

**Recommandation : B.**

## Contradictions et écarts relevés

1. **`d3301f2d` et `14036c68`, verdicts T_SPE** : `tspe-tcomp.csv` tague toutes les variations en TSPE-446 (équation,
   ln) et TSPE-596 (inéquation, ln), en invoquant une borne commune. Or le BO découpé a ses points « exp » :
   **TSPE-445** (équation) et **TSPE-595** (inéquation). Une fois scindés, les neufs en exp (V2, V4 et V3, V5)
   relèvent de ces deux points, et le plan les propose. Si David s'en tient au CSV, les neufs reprennent TSPE-446 et
   TSPE-596.
2. **`7690e290` V3** (affixe du milieu) : le CSV la met en TEXP-212 « Affixe d'un point » (notion) et dit que le tag
   actuel TEXP-223 « Déterminer l'affixe d'un point » ne décrit aucune variation. Or TEXP-223 décrit exactement V3. Le
   plan garde TEXP-212 ; à confirmer.
3. **`7d552757`** : TSPE-457 « Résoudre une équation du type cos(x) = a » et TSPE-458 « … cos(x) ⩽ a » ne parlent que
   de cos, alors que V2 (sin x ⩾ a) et V3 (sin x = a) portent sur sin. C'est à vérifier dans la borne.
4. **`dbee4649` en T_COMP** : V2 et V4 demandent une **variance**, mais leurs points TCOMP-363 et TCOMP-359 parlent
   d'**écart type**. Le CSV le signale pour V2 seulement.
5. **`95ee8348`** : en T_COMP, le verdict est MODIFIER (TCOMP-272, l'intégrande √(t² + c) de V2 est à remplacer). V2
   reste sur l'origine : la scission ne lève pas ce MODIFIER.
6. Les autres justifications concordent avec les relevés (variables, conditions, réponses tirées).
