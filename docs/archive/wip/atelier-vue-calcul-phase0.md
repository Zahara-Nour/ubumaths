---
titre: Atelier — vue Calcul (lot 3), comportements attendus
statut: Phase 0, validée le 2026-09-16 — les tests peuvent être écrits
date: 2026-09-16
scope: la vue Calcul de l'atelier ; fusion /calc + /cas en partant de /cas
---

# Vue Calcul — comportements attendus

> **Validé le 2026-09-16.** Les trois questions du §7 sont tranchées dans le
> sens des recommandations. Les comportements ci-dessous (nominal `N` / limite
> `L` / erreur `E`) sont ceux que les tests doivent vérifier.

Le lot 2 a donné à l'élève de quoi **nommer** et **tracer**. Le lot 3 lui donne
de quoi **calculer sur ce qu'il a nommé** — c'est celui qui fait de « Mes
objets » un outil de recherche plutôt qu'une liste.

---

## 1. Ce qui existe, re-mesuré aujourd'hui

Les constats du cadrage dataient du 2026-09-15. Je les ai tous rejoués.

| Constat                                                                                                                                                                                                                                                                                                                        | Mesure du 2026-09-16                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Le moteur sait faire beaucoup plus que ce qu'il montre.** 26 commandes au registre + 10 branchées en dur (`latex`, `custom`, `auto`, `exact`, `decimal`, `unitmode`, `convert`, `stats`, `linreg`, `export`), dont **`latex` et `custom` figurent dans les deux** = **34 réelles**. `/calc` en propose **8**, écrites en dur | **26 invisibles** dans `/calc`. ⚠️ Le cadrage disait 22 (il ne comptait que 4 des 10 hors registre) et ce document a d'abord dit 28 (il ne voyait pas le recouvrement) — compté le 2026-09-16 |
| **Aucune des deux pages ne rend le résultat en mathématiques.** `/cas` affiche du HTML échappé en `font-mono` ; `/calc` affiche le texte brut, avec le commentaire « _will be replaced by proper LaTeX rendering_ »                                                                                                            | Vrai. `ResultDisplay.svelte:142`                                                                                                                                                              |
| **Le registre parle anglais.** « Differentiate expression », « Solve equation », « Compute domain of definition »…                                                                                                                                                                                                             | **24 des 26** descriptions sont en anglais. Seules `help` et `variations` sont en français                                                                                                    |
| **Deux moteurs, deux espaces de noms.** `/calc` et `/cas` instancient chacun leur `WebReplEngine`                                                                                                                                                                                                                              | Vrai, et l'atelier en ajoute un **troisième** espace de noms : le sien                                                                                                                        |
| **Aucune de ces pages n'est atteignable.** Ni `/calc`, ni `/cas`, ni **`/atelier`**                                                                                                                                                                                                                                            | Zéro lien entrant dans tout `src`. L'atelier qu'on construit est invisible                                                                                                                    |
| **La provenance n'est pas branchée** (dette D10)                                                                                                                                                                                                                                                                               | Vrai : `Atelier.create()` et `update()` ne prennent pas de provenance, tout passe par le défaut `'url'` → lecture custom                                                                      |

Le dernier point n'est pas une dette théorique : **la vue Calcul est l'endroit
exact où elle se paie**, puisque c'est elle qui aura à la fois un éditeur
MathLive (qui produit du LaTeX) et un champ de commande (qui produit du texte).

---

## 2. La saisie

Un seul champ, comme aujourd'hui dans `/cas` : ce que l'élève tape est soit une
**définition** (ça crée ou met à jour un objet), soit un **calcul** (ça produit
une ligne d'historique), soit une **commande** (ça commence par un point).

| #      | Cas                                            | Attendu                                                                                                                   |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **N1** | `f(x) = x^2 - 3x + 1`                          | Objet `f` créé dans le panneau (§2.1 N1 de la Phase 0 générale) ; l'historique le confirme en une ligne                   |
| **N2** | `2 + 3`                                        | Ligne d'historique `5`. **Aucun objet créé** — un calcul jeté n'encombre pas le panneau                                   |
| **N3** | `f(2)` alors que `f` est un objet de l'atelier | `−1`. Le moteur connaît les objets du panneau **sans que l'élève les redéclare**                                          |
| **N4** | `.dériver f`                                   | Commande reconnue en français (§5)                                                                                        |
| **N5** | Une définition frappée dans l'éditeur MathLive | Lue en **LaTeX** (D10)                                                                                                    |
| **N6** | La même définition tapée au clavier texte      | Lue en **custom** (D10). `sin(x)` reste `sin(x)`, jamais `s·i·n·(x)`                                                      |
| **L1** | `3 = 3`                                        | Test d'égalité, pas une définition : le moteur sait déjà le faire (`executeEquality`), rien n'est créé                    |
| **L2** | `x = 3`                                        | Refus §2.2 E1 — `x` est réservé. Le message existe déjà                                                                   |
| **L3** | Champ vide, touche Entrée                      | Rien. Pas de ligne d'historique vide                                                                                      |
| **E1** | `f(x) = x^^2`                                  | L'objet `f` **existe et porte son erreur** (§2.1 E2) ; l'historique dit ce qui ne se lit pas ; l'atelier reste utilisable |
| **E2** | `.dériiver f` (commande inconnue)              | Message en français nommant la commande, **plus les deux plus proches** — pas « unknown command »                         |

> ⚠️ **N3 est le cœur du lot.** Sans lui, l'élève définit `f` dans le panneau
> puis doit le redéfinir pour l'évaluer — c'est exactement le défaut n° 2 du
> cadrage (« deux stores, un seul moteur »), reproduit **à l'intérieur** de
> l'atelier. Il dépend de la question **Q1** (§7).

---

## 3. Le résultat

| #      | Cas                                     | Attendu                                                                                                                    |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **N1** | `1/3 + 1/6`                             | `1/2` **rendu en mathématiques**, pas en `font-mono`. C'est une fraction, elle doit se voir comme une fraction             |
| **N2** | `sqrt(8)`                               | `2√2` en mode exact — l'exactitude est une des deux promesses du cadrage                                                   |
| **N3** | Le même en mode décimal                 | `2,83`. La bascule est visible, et **son état aussi** : l'élève doit savoir dans quel mode il est sans faire d'essai       |
| **N4** | `12 km + 300 m`                         | `12,3 km`. Les unités sont l'autre promesse (moitié collège de la cible)                                                   |
| **N5** | Un résultat long                        | Il s'enroule ou défile dans son cadre ; il ne pousse jamais le panneau d'objets hors de l'écran                            |
| **L1** | Un résultat que le moteur rend en texte | Affiché tel quel, lisiblement. **Mieux vaut du texte propre qu'un rendu mathématique faux**                                |
| **L2** | Historique long (50 lignes)             | Défile ; la saisie reste visible sans défiler                                                                              |
| **E1** | Le calcul échoue                        | Message en français, l'historique garde la ligne fautive (l'élève doit pouvoir la relire et la corriger), l'atelier intact |

> Le rendu mathématique est le point 1 de l'ordre de travail du cadrage, et il
> n'est fait **nulle part** aujourd'hui. Sans lui, tout le reste du lot s'affiche
> en `font-mono` — et un élève de 6ᵉ ne lit pas `(x^2-1)/(x+1)`.

---

## 4. Garder un résultat (décision D5)

Le geste « je tiens quelque chose » de la recherche : promouvoir une ligne
d'historique en objet nommé.

| #      | Cas                                                  | Attendu                                                                                   |
| ------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **N1** | « Garder » sur la ligne `2√2`                        | Un nom est **proposé** (`a`, sinon `b`…) et modifiable ; l'objet apparaît dans le panneau |
| **N2** | Garder un résultat qui est une expression en `x`     | Créé comme **fonction**, donc traçable — le type suit le contenu, pas le geste            |
| **N3** | Garder deux résultats de suite                       | Deux objets, deux noms distincts. Jamais d'écrasement silencieux                          |
| **L1** | Garder sous un nom déjà pris                         | Refus §2.2 L1, avec son message. Ni fusion, ni écrasement                                 |
| **L2** | Garder une ligne en erreur                           | L'action n'est **pas proposée** : il n'y a rien à garder                                  |
| **L3** | Garder un résultat qui cite un objet supprimé depuis | L'objet créé est **en attente** de ce nom (D9), il n'est pas refusé                       |
| **E1** | L'atelier est plein (plafond D8)                     | Refus nommé et chiffré, en français                                                       |

---

## 5. Les commandes deviennent découvrables

Aujourd'hui, un élève ne peut pas savoir que `.variations` existe : **26 des 34
commandes réelles ne lui sont jamais proposées**.

| #      | Cas                                                                             | Attendu                                                                                                                        |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **N1** | L'élève tape `.`                                                                | La liste des commandes **réelles** apparaît — depuis `getCommands()`, jamais une liste écrite en dur                           |
| **N2** | Il tape `.d`                                                                    | Filtré sur les commandes qui commencent par `d`, alias compris                                                                 |
| **N3** | Chaque commande est décrite **en français**                                     | « Dériver une expression », pas « Differentiate expression »                                                                   |
| **N4** | Une commande porte un exemple                                                   | `.dériver x^2` → l'élève voit à quoi ça ressemble avant de l'écrire                                                            |
| **L1** | Deux commandes partagent un alias                                               | ⚠️ **Mesuré : `.help` et `.hash` réclament tous deux l'alias `h`.** La liste doit rester déterministe et le conflit être nommé |
| **L2** | Une commande sans intérêt pour un élève (`.parse`, `.tree`, `.hash`, `.export`) | Reléguée : elle reste tapable, mais ne s'affiche pas en premier. Voir **Q3**                                                   |
| **E1** | Le registre change (commande ajoutée au moteur)                                 | Elle apparaît **sans toucher à l'interface** — c'est ce que la liste en dur interdit aujourd'hui                               |

---

## 6. Les actions du panneau enfin câblées

Le lot 2 a laissé six actions « visibles, désactivées, avec leur raison ». La
vue Calcul en câble **quatre** — celles qui produisent un calcul symbolique.

| Action                  | Attendu                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| **Dériver**             | Les **deux gestes distincts** de D7 : « afficher la dérivée » (attaché à `f`) et « garder `f'` » (objet) |
| **Résoudre `f(x) = 0`** | Les solutions affichées près de l'objet ; aucune solution est une **réponse**, pas une erreur            |
| **Variations**          | Affichage attaché (§3 N4), sans créer d'objet                                                            |
| **Image d'un nombre**   | L'élève donne un nombre, lit `f(nombre)`                                                                 |

| #      | Cas                                       | Attendu                                                                      |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------- |
| **N1** | « Dériver » sur `f(x) = x^2`              | `2x` affiché sur `f`                                                         |
| **N2** | Puis « garder `f'` »                      | Objet `f'` dans le panneau, **traçable** comme n'importe quelle fonction     |
| **L1** | Le CAS ne sait pas traiter cette fonction | Action **visible, désactivée, avec la raison en français** (§3 L1)           |
| **L2** | `f` est en attente d'un nom inconnu       | Toutes ces actions sont désactivées avec le message de l'objet — déjà le cas |
| **E1** | L'action échoue au calcul                 | Message en français ; **l'objet et l'atelier restent intacts** (§3 E1)       |

Restent non câblées après ce lot : `table`, `slider`, `convert`, et tout ce qui
relève des listes (lot 4).

---

## 6 bis. ⚠️ Une commande reçoit l'expression, jamais le nom

**Mesuré le 2026-09-16.** Avec `f` défini dans l'`EvalState` comme `x^2-3x+1` :

| Appel                  | Ce que le moteur rend                                                             | Verdict                   |
| ---------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| `.diff f(x)`           | `2x-3`                                                                            | ✅ juste                  |
| `.solve f(x)=0`        | « Equation inconnue » / « Type d'equation non supporte: unknown »                 | ❌ échec **visible**      |
| `.variations f(x)`     | « Derivee : f'(x) = f'(x) », « Points critiques : aucun », domaine ℝ, sans erreur | ☠️ **faux et silencieux** |
| `.variations x^2-3x+1` | « Points critiques : x = 3/2 », signe de la dérivée, sens de variation            | ✅ juste                  |
| `.solve x^2-3x+1=0`    | Discriminant Δ = 5, les deux racines, étape par étape                             | ✅ juste                  |

Le troisième est le dangereux : **l'élève lit un tableau de variations
d'apparence normale, qui ne dit rien de sa fonction.** Aucune erreur, aucun
message — juste une réponse vide présentée comme une réponse.

> **Règle : la vue Calcul substitue la définition de l'objet avant d'appeler une
> commande.** Elle n'envoie jamais `f(x)` au moteur, toujours `x^2-3x+1`.

| #      | Cas                                   | Attendu                                                                                    |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| **N1** | « Variations » sur `f`                | La commande reçoit `x^2-3x+1` ; le résultat nomme des points critiques                     |
| **N2** | « Résoudre `f(x) = 0` »               | La commande reçoit `x^2-3x+1=0` ; le discriminant apparaît                                 |
| **L1** | `f` cite `g`, elle-même définie       | La substitution est **récursive** — sinon `g(x)` repart au défaut ci-dessus                |
| **L2** | `f` est en attente d'un nom inconnu   | Aucune commande n'est lancée : l'action est désactivée avec le message de l'objet          |
| **E1** | La substitution boucle (`f` cite `f`) | Détecté et nommé en français (§2.3 L2) ; **aucune commande lancée, aucune boucle infinie** |

---

## 6 ter. Ce que le moteur rend aujourd'hui, et qu'il faut nettoyer

Trois défauts de sortie, tous mesurés le 2026-09-16 :

| Entrée                | Sortie actuelle                       | Problème                                                                                  |
| --------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `12[km] + 300[m]`     | `\dfrac{123}{10} km`                  | Du **LaTeX dans le champ texte**. En `font-mono`, l'élève lit `\dfrac{123}{10} km`        |
| `.diff x^2`           | `d/dx(x^2) = 2x\nLaTeX: 2 x`          | Le LaTeX est **collé dans la chaîne**, précédé du mot « LaTeX: » — une sortie de terminal |
| n'importe quel calcul | `latex` vaut **toujours `undefined`** | Le champ existe dans le type `ReplExecutionResult` mais **aucun chemin ne le remplit**    |

Le troisième est la vraie information : le rendu mathématique (§3 N1) n'est pas
« déjà là, il suffit de brancher » — c'est du travail, et il faut décider où le
LaTeX est produit. Le faire **dans la vue** (à partir de l'AST, que le moteur
rend déjà dans `ast`) évite de toucher `mathAST`, partagé avec le CLI.

---

## 7. Les trois questions — tranchées le 2026-09-16

### Q1 — Qui détient les noms ? → **B, l'atelier détient**

`WebReplEngine` tient son propre `EvalState` (variables + fonctions). L'atelier
tient ses objets. Si les deux vivent côte à côte, `f` défini dans le panneau et
`f` défini au clavier sont **deux `f` différents** — le défaut n° 2 du cadrage,
reproduit à l'intérieur de l'atelier.

| Approche                                                           | Avantages                                                                                                                 | Inconvénients                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **A — le moteur détient, l'atelier reflète**                       | Zéro travail sur le moteur ; `f(2)` marche tout de suite                                                                  | **Contredit la décision figée n° 1.** La persistance, l'URL et le panneau devraient tous relire le moteur |
| **B — l'atelier détient, il pousse dans le moteur** _(recommandé)_ | Tient la décision figée n° 1 ; un seul sens, comme `plot-sync` au lot 2 ; le moteur redevient un calculateur sans mémoire | Il faut pousser avant chaque évaluation. Coût mesurable : à faire, pas à supposer                         |
| **C — fusion : l'atelier EST l'`EvalState`**                       | Un seul objet, aucune synchronisation                                                                                     | Refonte du moteur, partagé avec `/cas` et les tests de `mathAST`. Hors de portée de ce lot                |

**Ma recommandation : B**, pour la même raison qu'au lot 2 — un seul sens, et
l'atelier reste la source. C est la bonne fin de course, avec le même
déclencheur que pour le grapheur : _quand `/cas` n'aura plus d'autre usage que
l'atelier_.

### Q2 — Que deviennent `/calc` et `/cas` ? → **gardées, décision au lot 5**

Le cadrage §13 laisse la question ouverte. Trois sorties : les garder telles
quelles ; les rediriger vers `/atelier` ; les supprimer.

**Tranché : gardées ce lot-ci, décision au lot 5.** Les rediriger maintenant
supprimerait le seul moyen de comparer l'ancien et le nouveau pendant qu'on
construit. Mais **`/atelier` entre en navigation dès ce lot** : il est
aujourd'hui inatteignable, et un outil que l'élève ne trouve pas n'existe pas.

### Q3 — Franciser les commandes ? → **alias français côté atelier**

Le registre est partagé avec le CLI de `mathAST` (`pnpm repl`), où l'anglais a
sa place.

**Tranché : une couche de traduction côté atelier**, pas un renommage dans
`mathAST`. Les alias français (`.dériver`, `.résoudre`, `.simplifier`)
s'ajoutent, les anglais continuent de marcher, le CLI ne bouge pas. Et les
commandes de développeur (`.parse`, `.tree`, `.hash`, `.export`) restent
tapables sans être proposées.

---

## 8. Ce que ce lot ne fait pas

- Les listes, les statistiques, le nuage de points → **lot 4**
- Le partage par URL et le mode éphémère → **lot 5**
- `table`, `slider`, `convert` restent désactivés avec leur raison
- Aucune refonte de `WebReplEngine` (c'est C, et C n'est pas ce lot)
