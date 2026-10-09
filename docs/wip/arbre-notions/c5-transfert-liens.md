# C5, étape 2 — transfert des liens modèles → points : proposition

> **Statut : SUSPENDU (2026-10-09)** — David a mis en doute le double travail (nœud ET tags) ;
> analyse et recommandation d'architecture dans [c5-architecture-liens.md](c5-architecture-liens.md).
> Si l'option 4 est retenue, ce transfert n'a plus lieu : les anciens tags servent d'audit. Rien n'est écrit en base.
> Séquence C5 (`schema-cible-spec.md`) : (1) seeds neufs ✅ ; **(2) transfert des liens des
> modèles vers les nouveaux points** ; (3) bascule du code ; (4) suppression de l'ancien monde.
> Mesuré en prod le 2026-10-09 : **1 026 liens**, tous vers des anciens points (grade NULL),
> sur 5 programmes. Table complète, lien par lien : [c5-transfert-liens.csv](c5-transfert-liens.csv).

## Comment chaque lien trouve son nouveau point

1. **La colonne « ex- » des documents de seed** (reprise, scission ✂, fusion `+`) ;
2. **les reports écrits dans les seeds** : vocabulaire de 1re repris de la 2de (22 liens vers des
   points de 2de) ; puces trop larges de 1re non retenues (1SPE-129 → 1SPE-321, 1SPE-142 → 1SPE-330) ;
3. **quand un ancien point a été scindé**, le **rangement du modèle** (en prod depuis #981) désigne
   la partie : celle rangée sous le même nœud, sinon la même notion ;
4. là où ni l'un ni l'autre ne tranche, **ma recommandation**, au vu du titre du modèle (lot B).

Le transfert **ajoute** les nouveaux liens ; les anciens restent jusqu'à l'étape 4 (ils partiront
avec les anciens points — étape destructive, arrêt et décision de David). Plusieurs anciens liens
d'un même modèle peuvent viser le même nouveau point : ils fusionnent.

## Bilan

| Programme | Liens    | Lot A (mécanique) | Lot B (à valider un par un) | Abandon |
| --------- | -------- | ----------------- | --------------------------- | ------- |
| 2de       | 63       | 60                | 3                           | 0       |
| 1re spé   | 342      | 328               | 13                          | 1       |
| Tle spé   | 308      | 303               | 5                           | 0       |
| Tle comp. | 140      | 138               | 2                           | 0       |
| Expertes  | 173      | 173               | 0                           | 0       |
| **Total** | **1026** | **1002**          | **23**                      | **1**   |

→ **1023 nouveaux liens** (après fusion des doublons), vers 511 nouveaux points.

## Lot A — mécanique (1002 liens) : validable en bloc

Chaque lien suit la trace « ex- » ou un report écrit dans les seeds. Contrôle par le rangement du
modèle (le nouveau point est-il rangé au même endroit que le modèle ?) :

| Accord modèle ↔ nouveau point | Liens |
| ------------------------------ | ----- |
| même nœud                      | 507   |
| même notion                    | 334   |
| même branche                   | 142   |
| autre branche                  | 19    |

Un désaccord n'est pas une erreur : un modèle est rangé par **ce qu'il fait**, un point par **ce
que dit le programme**. Exemple typique : « Calculer les racines avec le discriminant » est rangé
sous `Fonctions > Second degré > racines`, son point (1SPE-248, discriminant) sous `Algèbre >
Équations : second degré`. Les cas « autre branche », pour que tu les voies :

- 1SPE-003 → **2-204** « Notation des ensembles de nombres et des intervalles » (1 modèle, ex. « « Et », « ou » et intervalles » rangé sous `Logique > Proposition mathématique > et, ou, non`)
- 1SPE-007 → **2-212** « Mobiliser un contre-exemple pour montrer qu'une proposition … » (1 modèle, ex. « Vrai ou faux : inclusion » rangé sous `Ensembles > Ensembles de nombres > appartenance et inclusion`)
- 1SPE-028 → **1SPE-217** « Suites géométriques : lien avec l'étude d'évolutions success… » (1 modèle, ex. « Coefficient multiplicateur d'une évolution répétée » rangé sous `Proportionnalité > Évolutions > variations en pourcentage`)
- 1SPE-053 → **1SPE-248** « Discriminant ; factorisation éventuelle ; résolution d'une é… » (5 modèles, ex. « Calculer la racine double » rangé sous `Fonctions > Second degré > racines`)
- 1SPE-055 → **1SPE-248** « Discriminant ; factorisation éventuelle ; résolution d'une é… » (2 modèles, ex. « Calculer les racines avec le discriminant (valeurs exactes) » rangé sous `Fonctions > Second degré > racines`)
- 1SPE-056 → **1SPE-250** « Résolution d'une inéquation du second degré » (2 modèles, ex. « Intervalles où f est croissante, f′ trinôme du second degré » rangé sous `Fonctions > Dérivation > variations`)
- 2-059 → **2-261** « Règles de calcul sur les racines carrées ; relation $\sqrt{a… » (1 modèle, ex. « Calculer la valeur d'une valeur absolue » rangé sous `Fonctions > Fonction valeur absolue > définition et distance`)
- 2-112 → **2-315** « Déterminer la pente ou un vecteur directeur d'une droite don… » (1 modèle, ex. « Déterminer le coefficient directeur » rangé sous `Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine`)
- TSPE-037 → **TSPE-312** « Combinaisons de $k$ éléments d'un ensemble à $n$ éléments : … » (1 modèle, ex. « Coefficients binomiaux : chemins, symétrie, triangle de Pasc » rangé sous `Probabilités > Loi binomiale > coefficients binomiaux`)
- TSPE-040 → **TSPE-315** « Symétrie » (1 modèle, ex. « Coefficients binomiaux : chemins, symétrie, triangle de Pasc » rangé sous `Probabilités > Loi binomiale > coefficients binomiaux`)
- TSPE-041 → **TSPE-316** « Relation et triangle de Pascal » (1 modèle, ex. « Coefficients binomiaux : chemins, symétrie, triangle de Pasc » rangé sous `Probabilités > Loi binomiale > coefficients binomiaux`)
- TSPE-130 → **TSPE-401** « Opérations sur les limites » (1 modèle, ex. « Opérations sur les limites » rangé sous `Suites > Limites de suites > opérations`)
- TSPE-175 → **TSPE-447** « Dans le cadre d'une résolution de problème, utiliser les pro… » (1 modèle, ex. « Seuil : plus petit entier n tel que qⁿ dépasse une valeur (l » rangé sous `Suites > Suites et modélisation > seuil`)

## Lot B — à valider un par un (mon jugement intervient)

| Ancien point | Modèle                                                                 | Rangé sous                                                            | Proposé                                                                                                                   |
| ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1SPE-036     | Deviner le terme général à partir d'une liste des premiers termes      | `Suites > Généralités sur les suites > deviner le terme général`      | 1SPE-224 « Pour une suite arithmétique, calculer le term… » + 1SPE-225 « Pour une suite géométrique, calculer le terme… » |
| 1SPE-036     | Valeur d'un placement à intérêts simples ou composés                   | `Suites > Suites et modélisation > placements`                        | 1SPE-224 « Pour une suite arithmétique, calculer le term… » + 1SPE-225 « Pour une suite géométrique, calculer le terme… » |
| 1SPE-036     | Associer une formule à un nuage de points                              | `Suites > Généralités sur les suites > représentation graphique`      | 1SPE-224 « Pour une suite arithmétique, calculer le term… » + 1SPE-225 « Pour une suite géométrique, calculer le terme… » |
| 1SPE-036     | Deviner le terme général à partir d'une liste des premiers termes      | `Suites > Généralités sur les suites > deviner le terme général`      | 1SPE-224 « Pour une suite arithmétique, calculer le term… » + 1SPE-225 « Pour une suite géométrique, calculer le terme… » |
| 1SPE-036     | Seuil d'une suite arithmétique par le calcul                           | `Suites > Suites et modélisation > seuil`                             | 1SPE-224 « Pour une suite arithmétique, calculer le term… »                                                               |
| 1SPE-036     | Deviner le terme général à partir d'une liste des premiers termes      | `Suites > Généralités sur les suites > deviner le terme général`      | 1SPE-224 « Pour une suite arithmétique, calculer le term… » + 1SPE-225 « Pour une suite géométrique, calculer le terme… » |
| 1SPE-038     | Sens de variation d'une suite géométrique de raison positive           | `Suites > Généralités sur les suites > sens de variation`             | 1SPE-229 « Pour une suite géométrique, déterminer le sen… »                                                               |
| 1SPE-038     | Sens de variation d'une suite arithmétique                             | `Suites > Généralités sur les suites > sens de variation`             | 1SPE-228 « Pour une suite arithmétique, déterminer le se… »                                                               |
| 1SPE-129     | Cercle de diamètre [AB]                                                | `Géométrie > Produit scalaire > lieux de points`                      | 1SPE-323 « Ensemble des points $M$ tels que $\vec{MA} \c… »                                                               |
| 1SPE-129     | Ensemble des points M tels que MA·MB = k                               | `Géométrie > Produit scalaire > lieux de points`                      | 1SPE-317 « Transformation de l'expression $\vec{MA} \cdo… »                                                               |
| 1SPE-142     | Distance d'un point à une droite                                       | `Géométrie > Géométrie repérée > projeté orthogonal`                  | 1SPE-331 « Déterminer les coordonnées du projeté orthogo… »                                                               |
| 1SPE-165     | Jeu favorable, équitable ou défavorable                                | `Probabilités > Variables aléatoires > jeux et gains`                 | 1SPE-356 « Calculer une espérance »                                                                                       |
| 1SPE-165     | Gain algébrique moyen                                                  | `Probabilités > Variables aléatoires > jeux et gains`                 | 1SPE-356 « Calculer une espérance »                                                                                       |
| 2-067        | Réduire une racine carrée                                              | `Nombres et calculs > Racines carrées : sens et écritures > réduire`  | 2-271 « Effectuer des calculs numériques ou littéraux… »                                                                  |
| 2-067        | Réduire une expression avec des racines carrées                        | `Nombres et calculs > Racines carrées : sens et écritures > réduire`  | 2-271 « Effectuer des calculs numériques ou littéraux… »                                                                  |
| 2-182        | Parmi les… : modéliser un tableau croisé ou un sondage                 | `Probabilités > Probabilités conditionnelles > problèmes en contexte` | 2-396 « Calculer des probabilités conditionnelles lor… »                                                                  |
| TCOMP-018    | Étude de fonction : où chercher les limites                            | `Fonctions > Dérivation > étude de fonction`                          | TCOMP-219 « Notion de limite d'une fonction ; asymptotes … »                                                              |
| TCOMP-036    | Seuil : plus petit entier n tel que qⁿ dépasse une valeur (logarithme) | `Suites > Suites et modélisation > seuil`                             | TCOMP-238 « Utiliser l'équation fonctionnelle du logarith… »                                                              |
| TSPE-174     | Seuil : plus petit entier n tel que qⁿ dépasse une valeur (logarithme) | `Suites > Suites et modélisation > seuil`                             | TSPE-446 « Utiliser l'équation fonctionnelle du logarith… »                                                               |
| TSPE-194     | Primitive de sinus et cosinus vérifiant une condition                  | `Équations différentielles > y′ = f > sinus et cosinus`               | TSPE-467 « Calculer une primitive en utilisant les primi… »                                                               |
| TSPE-194     | Primitive de u′eᵘ, 2uu′ ou u′/u vérifiant une condition                | `Équations différentielles > y′ = f > formes u′eᵘ, 2uu′, u′/u`        | TSPE-468 « Calculer une primitive en utilisant les fonct… »                                                               |
| TSPE-194     | Coefficient d'une primitive de la forme u′eᵘ, 2uu′ ou u′/u             | `Équations différentielles > y′ = f > formes u′eᵘ, 2uu′, u′/u`        | TSPE-468 « Calculer une primitive en utilisant les fonct… »                                                               |
| TSPE-206     | Encadrer une intégrale ou une valeur moyenne                           | `Intégration > Valeur moyenne > encadrement`                          | TSPE-481 « Positivité et intégration des inégalités »                                                                     |

Pour les 5 modèles de 1SPE-036 liés aux **deux** points (suites arithmétique ET géométrique) : ils
travaillent les deux familles (« Deviner le terme général », « Valeur d'un placement à intérêts
simples ou composés », « Associer une formule à un nuage de points »).

Pour 1SPE-129 et 1SPE-142, le seed disait « liens → 1SPE-321 / 1SPE-330 » ; pour 3 des 5 modèles,
le rangement montre un objet plus précis (lieux de points, projeté orthogonal) : je propose le point
précis. Les 2 autres suivent le seed.

## Abandon (1 lien)

- 1SPE-062 « Résoudre ces problèmes à l'aide du discriminant » : son seul modèle (« Résoudre une
  inéquation du second degré ») est déjà lié à 1SPE-056, qui devient 1SPE-250 (décision S1).

## Questions

- **Lot A** : le valider en bloc ?
- **Lot B** : valider mes propositions (ou me dire lesquelles changer).

## Après validation (plan de livraison)

Une migration de données **additive** : insertion des nouveaux liens (modèle, nouveau point) —
aucun ancien lien supprimé, aucune donnée d'élève touchée. Prouvée comme les rangements (copies
des identifiants de la prod, rejeu du fichier, comparaison intégrale) ; garde « tout ou rien » ;
audit, PR, CI, `db:migrate`, vérification.
