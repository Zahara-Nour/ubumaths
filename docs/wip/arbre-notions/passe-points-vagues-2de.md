# Passe « points vagues » sur la 2de (seed en prod)

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (« je valide tout » : P1 retrait
> de 2-332, P2 nœud de 2-262, 5 reformulations). Livraison en cours.**
> Règle de David (2026-10-08, seed 1re spé, V2) : « des points trop vagues mériteraient
> d'être spécifiés pour être questionnables, à moins que ce soit un point relevant de
> l'évaluation par compétence ». Contraintes : **ne rien ajouter au BO** (on spécifie avec
> les mots du BO, pris dans la puce voisine ou le contenu qui la porte) ; les **titres
> d'approfondissements et d'exemples d'algorithme** restent tels quels. La 2de était en
> prod avant la règle : cette passe la rattrape, en une PR dédiée.
> Relu : les **200 points** `2-201`…`2-400` (seed `seed-2de.md`, PR #944/#957).

## Bilan

**6 points touchés sur 200** : 1 retrait (compétence), 5 reformulations (dont 1 change de
nœud). Les 194 autres sont gardés tels quels (liste des cas examinés plus bas).

**Usages en prod, vérifiés le 2026-10-08** pour les 6 : aucun modèle de question, aucun
exercice, aucun suivi élève, aucune entrée de journal, aucun signalement SRS. Seul 2-277
est visé par **6 références d'automatismes** (listes de 2de, 1re…) — une reformulation ne
les touche pas.

## Les 6 décisions proposées

| Point     | Libellé actuel (BO)                                                                                                                | Décision                                                                                                                                                                                                                                                                                                                                              | Nouveau libellé / nœud                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2-332** | « Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne » | ⛔ **retrait** — compétence « modéliser », sans objet précis (même décision qu'en 1re techno pour « Modéliser la dépendance entre deux grandeurs à l'aide d'une fonction ») ; sa part questionnable est portée par les points des fonctions de référence et de résolution.                                                                            | — (question P1)                                                                                                                                                                                                   |
| **2-277** | « Interpréter, selon le contexte, **cette comparaison** en termes de variation additive ou multiplicative »                        | ✏️ ne se lit pas seul : « cette comparaison » renvoie à la puce précédente (2-276), dont on reprend les mots.                                                                                                                                                                                                                                         | « Interpréter, selon le contexte, la comparaison de deux quantités par leur différence ou par leur rapport en termes de variation additive ou multiplicative »                                                    |
| **2-392** | « **Observer** la loi des grands nombres à l'aide d'une simulation sur Python ou tableur »                                         | ✏️ « observer » sans objet questionnable ; l'objet est le contenu 2-389 (« lorsque $n$ est grand, sauf exception, la fréquence observée est proche de la probabilité »).                                                                                                                                                                              | « Observer, à l'aide d'une simulation sur Python ou tableur, que lorsque $n$ est grand la fréquence observée est proche de la probabilité (loi des grands nombres) »                                              |
| **2-394** | « Construire **un tableau** en lien avec une situation donnée »                                                                    | ✏️ « un tableau » : issu de la scission de « Construire un arbre pondéré ou un tableau » ; en probabilités conditionnelles, le BO ne parle que du **tableau croisé d'effectifs** (2-396).                                                                                                                                                             | « Construire un tableau croisé d'effectifs en lien avec une situation donnée »                                                                                                                                    |
| **2-395** | « Passer du registre de la langue naturelle au registre symbolique et inversement »                                                | ✏️ « changer de registre » en général est une compétence ; ici le registre symbolique est celui des **notations de probabilités que le BO de 2de introduit** ($P_A(B)$ en 2-390, $\bar{A}$ en 2-206, $\cap$ en 2-203). Même traitement qu'en 1re spé (le libellé nomme les notations).                                                                | « Traduire un énoncé en langage naturel à l'aide des notations des probabilités ($P(A)$, $\bar{A}$, $P(A \cap B)$, $P_A(B)$), et inversement »                                                                    |
| **2-262** | « **Exemples simples de calcul** sur des expressions algébriques, en particulier sur des expressions fractionnaires »              | ✏️ « exemples simples de calcul » n'a pas de geste ; on garde les mots du BO en verbe. **Nœud** : son ancien jumeau (2-060) porte **7 modèles**, tous de calcul littéral général (développer $(a+b)^2$, $(a-b)^2$, factoriser, opposé, réduire) — le transfert C5 les amènera ici ; la sous-notion `expressions fractionnaires` ne leur convient pas. | « Calculer sur des expressions algébriques simples, en particulier sur des expressions fractionnaires » → **`Calcul littéral`** (notion), au lieu de `Calcul littéral > expressions fractionnaires` (question P2) |

## Questions — TRANCHÉES (David, 2026-10-08 : « je valide tout »)

- **P1 — Retrait de 2-332 : c'est une suppression (`DELETE`) en prod.** Ce qui sera
  perdu : **la ligne du point, et rien d'autre** — 0 modèle, 0 exercice, 0 suivi élève,
  0 journal, 0 référence vers lui ; son ancien jumeau (2-128) n'a **aucun lien**, le
  transfert C5 n'a donc rien à y porter. La migration refusera de supprimer si un usage
  apparaît d'ici là (garde dans la migration). Reco : **retirer**. Alternative : le garder
  tel quel (il resterait non questionnable).
- **P2 — 2-262 change de nœud** (`Calcul littéral > expressions fractionnaires` →
  `Calcul littéral`), pour accueillir les 7 modèles de calcul littéral de son ancien
  jumeau. Reco : **oui**. Alternative : garder la sous-notion et, au transfert C5,
  envoyer ces 7 modèles vers d'autres points (développer/factoriser n'ont pas de point
  propre en 2de : c'est un contenu de collège, ils iraient vers le cycle 4).
- **Validation d'ensemble** des 5 reformulations et de la liste des cas gardés.

## Cas examinés et GARDÉS (194)

- **Questionnables tels quels** (verbe et objet précis) : 2-208 (reconnaître une
  proposition), 2-209 (écrire des propositions avec des variables), 2-213 et 2-214
  (implication, équivalence, réciproque), 2-216 et 2-217 (raisonnements nommés : disjonction
  des cas, absurde), 2-228 et 2-232 (lire, modifier, compléter un programme ou une
  fonction : questionnable par un programme à trous), 2-349 (relier courbe et tableau de
  variations), 2-351 (outil numérique pour décrire des variations), 2-375, 2-377, 2-382.
- **Un problème circonscrit à UN outil** (règle déjà appliquée en 1re spé) : 2-237
  (multiples, diviseurs, parité), 2-275 (choisir la forme adaptée), 2-278 (mettre en
  inéquation), 2-336 (résoudre $f(x) = k$ par une méthode adaptée), 2-353 (problèmes
  d'optimisation, sous `extremums`).
- **Titres d'approfondissements et d'exemples d'algorithme** (règle) : 2-241, 2-242,
  2-257 à 2-259, 2-283 à 2-286, 2-305 à 2-310, 2-321 à 2-324, 2-361 à 2-363, 2-387, 2-388.
- **Contenus nominaux** (« Séquence d'instructions », « Linéarité de la moyenne »,
  « Barycentre… ») : le contenu nomme un objet précis, la question porte sur lui.
- Non retenu : 2-268 commence par « En liaison avec la section « Fonctions », … » —
  du bruit, pas du flou ; on n'y touche pas pour une passe « points vagues ».

## Après validation (plan de livraison)

Une PR dédiée : migration (4 `update` de libellé + 1 `update` libellé et nœud + 1
`delete` gardé, tous scopés par code **et** grade `'2'`, bloc DO de vérification, rollback
écrit avec les libellés et le nœud d'origine), mise à jour de `seed-2de.md` (source de
vérité), de la fixture et du test intégral de la 2de (199 points). Preuve rouge, suite
d'intégration, audit, CI, merge, `db:migrate`, vérification en prod.
