---
titre: Atelier — vue Données (lot 4), comportements attendus
statut: Phase 0, validée le 2026-09-16 — les tests peuvent être écrits
date: 2026-09-16
scope: la vue Données, le type liste, le nuage de points, l'ajustement affine
---

# Vue Données — comportements attendus

> **Validée le 2026-09-16**, les trois questions du §5 tranchées dans le sens
> des recommandations. Le §4 de la
> [Phase 0 générale](atelier-recherche-eleve-phase0.md) reste la référence : ce
> document ajoute ce que les **mesures** changent.

Le lot 4 est celui qui relie d'un coup une colonne de nombres, les statistiques,
le nuage de points et l'ajustement affine. C'est aussi le seul lot du v1 qui
demande d'ajouter quelque chose au **grapheur**.

---

## 1. Ce que les mesures ont trouvé

### ⚠️ `.stats` ne lit qu'une valeur sur trois séparateurs possibles

| Appel                  | Ce que le moteur rend                                 |
| ---------------------- | ----------------------------------------------------- |
| `.stats 12 15 9 20 15` | « n=1, Moyenne: 12 » — **succès**, statistique fausse |
| `.stats 12;15;9`       | « n=1, Moyenne: 12 » — idem                           |
| `.stats 12,15,9`       | n=3, moyenne 12, écart-type 3, variance 9 ✅          |

**Le séparateur du moteur est la virgule.** Or la Phase 0 générale a tranché
(§4 E2) que **le séparateur de l'atelier est le point-virgule**, parce que
distinguer `1,2` (décimal) de `1, 2` (séparateur) par une espace est intenable
en classe. `parse.ts` découpe donc bien sur `;`.

Les deux conventions doivent coexister : **l'atelier traduit avant d'appeler**.
Jamais l'élève ne doit voir la virgule séparatrice.

> Conséquence immédiate, déjà corrigée : l'exemple `.stats 12 15 9` livré au
> lot 3 était **faux** — il réussissait en ne lisant que `12`. Mon test « les
> exemples s'exécutent » ne l'avait pas vu parce qu'il ne vérifiait que
> `success: true`. Il compte désormais les valeurs.

### `.linreg` marche, et signale ce qui cloche

`​.linreg 1,2,3,4 : 2,4,6,8` rend `y = 2x + 0`, pente, ordonnée à l'origine et
**R² = 1**. Sur des longueurs différentes : « Erreur: nombre de valeurs X (3)
different de Y (2) ». Le séparateur des deux séries est `:`, celui des valeurs
la virgule.

### L'étendue manque

Le §4 N2 promet « effectif, moyenne, médiane, min, max, **étendue**, écart-type,
variance ». `.stats` rend tout **sauf l'étendue**. Elle vaut `max − min` : à
calculer côté atelier, ou à ajouter au moteur (voir **Q2**).

### Le grapheur sait tracer un nuage — mais pas celui-là

Le §4 N3 dit « le grapheur ne sait tracer aucun nuage ». **Imprécis** :
`SequencePlottable` avec `representation: 'ranks'` dessine bien un nuage de
points — mais `(n, uₙ)`, abscisse = le rang, ordonnée = une formule.

Il n'existe **aucun** traçable prenant deux séries de nombres arbitraires. Il
faut donc un troisième membre à `Plottable`, avec son schéma de persistance et
son rendu.

---

## 2. Saisir une liste

| #      | Cas                                    | Attendu                                                                                             |
| ------ | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **N1** | « + Liste » dans le panneau            | Objet `L` vide, marqué **incomplet** — pas une erreur (§2.1 L2)                                     |
| **N2** | L'élève tape `12 ; 15 ; 9`             | Trois valeurs. Le point-virgule est le séparateur, et l'aide le dit                                 |
| **N3** | `3,14 ; 3.14`                          | Deux valeurs décimales, la virgule et le point acceptés tous deux (§4 E2)                           |
| **N4** | Coller une colonne de nombres          | Proposée comme liste, les sauts de ligne valant séparateurs (§2.1 N4)                               |
| **L1** | Liste vide                             | Statistiques **visibles et désactivées** avec leur raison, aucune erreur (§4 L2)                    |
| **L2** | Une seule valeur                       | Moyenne = médiane = min = max = cette valeur, écart-type 0 ; **ajustement impossible**, dit (§4 L3) |
| **L3** | Plus de 200 valeurs (D8)               | La liste **garde sa saisie** et porte son erreur — on ne jette pas le travail de l'élève            |
| **L4** | 9ᵉ liste (plafond de 8, D8)            | Refus nommé et chiffré                                                                              |
| **E1** | `12 ; abc ; 9`                         | `abc` **ignorée et signalée** (« 1 valeur ignorée ») ; le reste fonctionne (§4 E1)                  |
| **E2** | `12, 15, 9` — l'élève met des virgules | ⚠️ Lu comme **une seule valeur** `12,15,9` illisible. Voir **Q1**                                   |

---

## 3. Les trois actions des listes

### Statistiques

| #      | Cas                      | Attendu                                                                               |
| ------ | ------------------------ | ------------------------------------------------------------------------------------- |
| **N1** | « Statistiques » sur `L` | Effectif, moyenne, médiane, min, max, **étendue**, écart-type, variance — en français |
| **N2** | Affichage                | Attaché à l'objet, **sans créer d'objet** (§3 N4)                                     |
| **L1** | Liste vide               | Action visible, désactivée, avec la raison                                            |
| **E1** | Le calcul échoue         | Message en français ; l'objet et l'atelier restent intacts                            |

### Nuage de points

| #      | Cas                                       | Attendu                                                                                     |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| **N1** | Nuage de `L` (abscisses), `M` (ordonnées) | Tracé dans la vue Graphe, qui s'ouvre — comme « Tracer » au lot 2                           |
| **N2** | `L` ou `M` change                         | Le nuage suit, sans re-tracer : c'est l'option B du lot 2                                   |
| **N3** | Retirer du graphe                         | Même bouton qui bascule, comme pour une fonction                                            |
| **L1** | Longueurs différentes                     | Seules les paires complètes sont tracées, **et on le dit** (« 3 valeurs ignorées ») (§4 L1) |
| **L2** | Une seule liste dans l'atelier            | Action visible, désactivée : « il faut deux listes »                                        |
| **L3** | Liste vide                                | Rien n'est tracé, la raison est donnée                                                      |
| **E1** | Valeurs toutes identiques                 | Tracé quand même — c'est une donnée légitime, pas une erreur                                |

### Ajustement affine

| #      | Cas                          | Attendu                                                                                                   |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| **N1** | Ajustement de `L` et `M`     | Crée une **fonction** `f(x) = ax + b` comme objet, traçable, avec son R² (§4 N4)                          |
| **N2** | Le nom                       | Proposé et modifiable, comme « Garder » au lot 3                                                          |
| **N3** | R² affiché                   | Près de l'objet créé — c'est ce qui dit si l'ajustement vaut quelque chose                                |
| **L1** | Moins de deux points         | Impossible, avec la raison (§4 L3)                                                                        |
| **L2** | Points alignés verticalement | Pente infinie : refus expliqué en français, pas une erreur technique                                      |
| **E1** | Longueurs différentes        | Le moteur le dit déjà (« nombre de valeurs X (3) different de Y (2) ») — à **traduire** en français clair |

---

## 4. Ce que le grapheur doit apprendre

Un troisième traçable, à côté de la fonction et de la suite.

| #      | Cas                               | Attendu                                                                              |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ |
| **N1** | Un nuage est posé                 | Des points dessinés aux coordonnées `(xᵢ, yᵢ)`, avec la couleur de l'objet           |
| **N2** | `/grapheur` seul                  | **Inchangé** : aucun nuage n'apparaît si l'atelier n'en pose pas (garantie du lot 2) |
| **L1** | Un point hors du cadre            | Il n'est pas dessiné ; les autres le sont. Aucun recadrage automatique               |
| **L2** | Deux nuages                       | Deux couleurs distinctes                                                             |
| **E1** | Une valeur non finie (`NaN`, `∞`) | Le point est sauté, les autres sont dessinés                                         |

---

## 5. Les trois questions — tranchées le 2026-09-16

### Q1 — Une liste séparée par des virgules ? → **refusée, avec la correction montrée**

`12, 15, 9` est ce qu'un élève écrira spontanément — c'est ce qu'il voit
partout. Aujourd'hui l'atelier le lit comme **une seule valeur illisible**.

| Approche                                                       | Avantages                       | Inconvénients                                                                               |
| -------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| **A — refuser et expliquer** _(recommandé)_                    | Une seule règle, jamais ambiguë | Il faut retaper                                                                             |
| **B — accepter la virgule quand elle est suivie d'une espace** | Accepte l'écriture spontanée    | **C'est exactement la règle jugée intenable** au §4 E2 : une espace change le sens          |
| **C — accepter les deux, la virgule ne pouvant être décimale** | Tolérant                        | `3,14` deviendrait deux valeurs — et c'est l'écriture décimale française, la plus fréquente |

**Tranché : A**, avec un message qui **montre** la correction :
« Sépare tes valeurs par des points-virgules : `12 ; 15 ; 9` ». Refuser sans
montrer serait dur ; accepter serait rouvrir l'ambiguïté que D8 a fermée.

### Q2 — L'étendue ? → **calculée côté atelier**

`.stats` ne la rend pas. **Tranché : côté atelier.** L'atelier
recalcule déjà ses statistiques d'affichage à partir des valeurs qu'il détient,
et `max − min` ne justifie pas de toucher un module partagé avec le CLI. Si
d'autres manques apparaissent, on reverra en bloc.

### Q3 — Le nuage ? → **un troisième traçable dans le grapheur**

| Approche                                                 | Avantages                                                                                          | Inconvénients                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **A — un `ScatterPlottable` au grapheur** _(recommandé)_ | Le nuage vit dans le même repère que les courbes : on **voit** l'ajustement passer dans les points | Touche le grapheur, en production                                                                   |
| **B — un graphe séparé dans la vue Données**             | N'y touche pas                                                                                     | Deux repères rivaux, et l'ajustement ne peut pas se superposer aux points — ce qui est **le geste** |

**Tranché : A.** Superposer le nuage et sa droite d'ajustement est
tout l'intérêt pédagogique ; deux repères séparés rendraient le lot inutile.
Le risque sur `/grapheur` est borné par le comportement N2 du §4 : sans nuage
posé, rien ne change.

---

## 6. Ce que ce lot ne fait pas

- Le partage par URL et le mode éphémère → **lot 5**
- `table` (tabuler une fonction) et `slider` restent désactivés avec leur raison
- Aucune saisie en tableur : une liste se tape sur une ligne, séparée par `;`
