---
title: Atelier — `/grapheur` passe par l'atelier (phase 0)
date: 2026-10-04
status: phase 0 VALIDÉE par David le 2026-10-04 (Q1, Q2 tranchées, reprise abandonnée)
---

# `/grapheur` passe par l'atelier — phase 0

> Comportements attendus, en français. Rien n'est codé. Chaque ligne deviendra
> un test qui doit **échouer** avant l'implémentation.
>
> Sources : discussion du 2026-10-04 (`atelier-progress.md`, section 4),
> cadrage `atelier-recherche-eleve.md` §9 bis, phase 0 v1 §7.

## Décisions de David (2026-10-04)

| #   | Décision                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| G1  | L'atelier est **l'entrée unique** : plus d'entrée « Grapheur » dans la navigation (modifie la décision figée n° 5)                  |
| G2  | L'adresse `/grapheur` **continue de marcher** et ouvre l'atelier sur la vue Graphe                                                  |
| G3  | **Pas de panneau dans la vue Graphe** : tout passe par les cartes de « Mes objets »                                                 |
| G4  | On **garde tout** ce que fait le grapheur (f′, tangente, aire, cercle osculateur, couleurs, curseurs, suites)                       |
| G5  | Saisie de la carte en **MathLive** ; la courbe **suit la frappe** (délai ~0,3 s)                                                    |
| G6  | **Dériver** crée une carte nommée **`f′`** (jamais `g`) ; `.dériver f` fait de même                                                 |
| G7  | Une action qui crée des objets crée **une carte par objet** ; toute action écrit **une ligne dans Calcul**, **sans changer de vue** |
| G8  | « Mes objets » **ouvert** à l'arrivée sur `/grapheur`                                                                               |

## Faits mesurés dans le code (2026-10-04)

- La vue Graphe monte `GrapheurContainer` avec `panel={false}` : aucun des
  réglages du grapheur n'existe dans l'atelier.
- La carte (`ObjectCard.svelte`) n'a **aucun champ** : « + Fonction » crée un
  objet vide qu'on ne peut remplir que depuis Calcul.
- Les noms sont `^[A-Za-z](?:_\d+)?$` (`names.ts`) : `f′` est refusé.
- Le parseur lit déjà `f'` comme la dérivée de `f` (`expandDerivatives`,
  `engine.ts`) : la dérivée vivante existe, il manque l'objet.
- « Garder la dérivée » crée une dérivée **figée** nommée par la lettre suivante.
- Les actions de carte basculent vers Calcul (`AtelierContainer.handleAction`).
- Sauvegarde locale regroupée : `SAVE_DELAY_MS = 500` (`session.ts`) — la
  frappe en direct n'écrit pas à chaque touche.
- ⚠️ **`adoptGrapheurState` (reprise des courbes de l'ancien grapheur) n'est
  appelée nulle part**, et ne reprend que si l'atelier est **vide**.
- L'objet de l'atelier ne porte aujourd'hui que `plotted` ; le grapheur porte
  couleur, épaisseur, style, `showDerivative`, `tangentAt`, `integral`,
  `showOsculating`, longueur.

---

## §1 — La carte

### Fermée

| #   | Cas                                   | Attendu                                                                                                |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| C1  | Fonction tracée                       | Pastille de la couleur de la courbe · définition **rendue en écriture mathématique** · type · 👁 actif |
| C2  | Fonction non tracée                   | Pastille grise · 👁 barré                                                                              |
| C3  | Clic sur 👁                           | Trace / retire la courbe **sans ouvrir la carte et sans changer de vue**                               |
| C4  | Objet en erreur / attente / incomplet | L'état reste affiché, comme aujourd'hui                                                                |

### Ouverte (une seule à la fois, comme aujourd'hui)

| #   | Cas                                     | Attendu                                                                                                   |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| C5  | Ouvrir une fonction                     | Champ MathLive précédé de `f(x) =` (non modifiable), contenant la définition                              |
| C6  | Taper dans le champ                     | ~0,3 s après la dernière touche : l'objet est mis à jour, la courbe et les objets dépendants suivent      |
| C7  | Définition illisible en cours de frappe | Erreur affichée sous le champ ; la courbe disparaît (pas d'« ancienne courbe » gardée : une seule vérité) |
| C8  | Modifier dans Calcul (`f(x) = …`)       | La carte et son champ affichent la nouvelle définition                                                    |
| C9  | « + Fonction »                          | Carte vide **ouverte**, curseur dans le champ                                                             |
| C10 | Valeur, suite                           | Même principe : `a =` / `u(n) =` ou `u(n+1) =` fixe, champ MathLive                                       |
| C11 | Liste                                   | **Inchangée** : la saisie reste dans la vue Données                                                       |

### « Sur le graphique » (fonction tracée seulement)

| #   | Réglage                   | Attendu                                                                              |
| --- | ------------------------- | ------------------------------------------------------------------------------------ |
| S1  | Couleur, épaisseur, style | Mêmes choix que le grapheur ; la pastille de la carte suit la couleur                |
| S2  | Tangente                  | Curseur x₀, pente f′(x₀) affichée, case « cercle osculateur » (κ affiché)            |
| S3  | Aire                      | Bornes « de … à … », aire **signée** affichée, case « longueur » (longueur affichée) |
| S4  | Ces réglages              | Sont **sauvegardés** avec l'objet, et **voyagent dans le lien de partage**           |
| S5  | Les réglages              | **N'écrivent pas** dans Calcul (ce sont des réglages, pas des actions)               |
| L1  | Retirer la courbe         | Les réglages sont **conservés** : la retracer les retrouve                           |

---

## §2 — Dériver crée `f′`

| #   | Cas                                          | Attendu                                                                                                                                 |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | « Dériver » sur la carte de `f`              | Nouvelle carte **`f′`**, affichée `f′(x) = 2x − 3` ; ligne dans Calcul (`f′(x) = 2x − 3`, étapes dépliables) ; **la vue ne change pas** |
| D2  | `f` est tracée                               | `f′` est tracée d'office                                                                                                                |
| D3  | `.dériver f` dans Calcul                     | Même résultat que D1                                                                                                                    |
| D4  | Modifier `f`                                 | `f′` suit (dérivée vivante)                                                                                                             |
| D5  | `f` dépend d'un curseur `a`                  | `f′` en dépend aussi et suit le curseur                                                                                                 |
| D6  | « Dériver » sur `f′`                         | Carte **`f″`**                                                                                                                          |
| D7  | `f′` est citée ailleurs (`h(x) = f′(x) + 1`) | Fonctionne, comme aujourd'hui                                                                                                           |
| L1  | « Dériver » alors que `f′` existe déjà       | Pas de doublon : la carte `f′` est sélectionnée ; ligne « f′ existe déjà »                                                              |
| L2  | Champ de la carte `f′`                       | **Non modifiable** : la carte dit « dérivée de f ». Réglages d'affichage modifiables                                                    |
| L3  | Supprimer `f`                                | `f′` passe **en attente** (« f n'existe plus »), comme tout dépendant (D9) ; recréer `f` la ranime                                      |
| L4  | `.dériver x^2 + 1` (une expression)          | Pas de carte ; seulement la ligne dans Calcul                                                                                           |
| E1  | Taper `f′(x) = 3x` dans Calcul               | Refusé : « f′ est la dérivée de f : elle se calcule, elle ne se définit pas »                                                           |
| E2  | « Dériver » sur `f` vide ou en erreur        | Bouton désactivé **avec sa raison** (§3 E1 de la v1)                                                                                    |
| E3  | Dérivée qui n'aboutit pas                    | Pas de carte ; ligne d'échec en français dans Calcul                                                                                    |
| —   | « Garder la dérivée »                        | **Disparaît**                                                                                                                           |

---

## §3 — La règle générale des actions (G7)

| #   | Cas                                                                 | Attendu                                                                                                        |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A1  | Action qui crée des objets (Dériver, Ajustement affine, `.simuler`) | Une carte par objet créé + une ligne dans Calcul ; **pas de changement de vue**                                |
| A2  | Action sans objet (Variations, Résoudre, Tabuler)                   | Une ligne dans Calcul ; **pas de changement de vue**                                                           |
| A3  | Une ligne arrive dans Calcul pendant qu'on est ailleurs             | L'onglet Calcul signale **« nouveau résultat »** (sinon la ligne passe inaperçue) ; annoncé au lecteur d'écran |
| A4  | « Image d'un nombre »                                               | Petit champ dans la carte : `f( 2 ) = −1` ; la ligne va aussi dans Calcul                                      |
| A5  | Tracer, Nuage, Diagramme                                            | Gardent leur bascule vers Graphe / Données ; **pas** de ligne dans Calcul (Q2)                                 |

---

## §4 — Curseurs (valeurs)

| #   | Cas                           | Attendu                                                                                      |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| K1  | Ouvrir la carte de `a`        | Curseur, valeur, bornes min/max, pas (repris de `ParameterInput`)                            |
| K2  | Bouger le curseur             | Les fonctions qui citent `a` suivent en direct                                               |
| K3  | Modifier la définition de `a` | **Les bornes réglées sont conservées** (solde la dette n° 2 : `build()` recréait le curseur) |
| E1  | min ≥ max                     | Refusé avec un message ; l'ancien réglage reste                                              |
| L1  | Valeur hors bornes saisie     | Les bornes s'élargissent pour l'inclure                                                      |

---

## §5 — Suites

| #   | Cas                    | Attendu                                                                                |
| --- | ---------------------- | -------------------------------------------------------------------------------------- |
| U1  | Carte de suite ouverte | Mode explicite / récurrence, premier terme, champ MathLive (repris de `SequenceInput`) |
| U2  | « Sur le graphique »   | En nuage ou en escalier (récurrence seulement), nombre de marches                      |
| U3  | « Premiers termes »    | Ligne dans Calcul (A2)                                                                 |

---

### Décisions de David pour les suites (2026-10-04)

| #   | Décision                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Premier terme d'une récurrence : un **nombre** ou le **nom d'une valeur** de l'atelier (`u₀ = a` : le curseur de `a` fait varier u₀)                                                                             |
| S2  | `u(n)` et `u_n` sont acceptés tous les deux                                                                                                                                                                      |
| S3  | Dans Calcul : `u(n+1) = 0,5u(n) + 3` crée une suite récurrente (u₀ = 0 à régler dans la carte) ; `u(5)` donne le terme de rang 5, y compris pour une récurrence (aujourd'hui : résultat faux sans avertissement) |
| S4  | Suites déjà rangées, sans mode : une suite qui se cite elle-même devient une récurrence, les autres sont explicites                                                                                              |

Le lot 5 est coupé en deux PR : 5a = modèle + Calcul (S1–S4), 5b = carte + graphique (U1–U3).

## §6 — La bascule de `/grapheur`

| #   | Cas                       | Attendu                                                                                                                      |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| B1  | Navigation                | Une seule entrée « Atelier » dans la Sidebar **et** le Header (aujourd'hui le Header n'a même pas l'atelier)                 |
| B2  | `/grapheur`               | L'atelier personnel, vue Graphe active, « Mes objets » ouvert                                                                |
| B3  | `/grapheur`, atelier vide | Une carte `f` vide, ouverte, curseur dans le champ — **pas de `x^2` d'office**                                               |
| B4  | `/grapheur?f=x^2-3x+1`    | **Mode éphémère** : cette courbe seule, tracée ; l'atelier personnel n'est ni lu ni écrit (même mécanisme que `/atelier?a=`) |
| B5  | `/grapheur?f=…&f=…`       | Plusieurs courbes : `f`, `g`, `h`…                                                                                           |
| B6  | `?f=` illisible           | On le dit, et on ouvre l'atelier personnel (comme §6 E1 de la v1)                                                            |
| B7  | « Repartir de zéro »      | Vide l'atelier **après confirmation**                                                                                        |

---

> **Reprise des courbes de l'ancien grapheur : ABANDONNÉE** (David, 2026-10-04).
> Les courbes que l'ancien `/grapheur` a rangées dans le navigateur
> (`chiphre-grapheur-state`) ne sont pas reprises : elles se retapent en
> quelques secondes, et cette mémoire était plutôt un défaut en classe. La clé
> reste intacte dans le navigateur — la reprise pourra s'ajouter si quelqu'un la
> réclame. `adoptGrapheurState` (`persistence.ts`, jamais appelée) devient du
> code mort : à retirer au lot 6.

> **Exception à A1, tranchée par David le 2026-10-04** : « Tableau croisé » et
> « Simuler » PRÉPARENT une commande à compléter au clavier ; elles emmènent
> donc dans Calcul (sans ça, le clic ne produirait rien de visible).

## Questions tranchées (2026-10-04)

**Q1 — La case « f′ » du grapheur fait doublon avec « Dériver ».** ✅ **Tranché : la case est supprimée.** Dans le
grapheur, cocher f′ trace la courbe dérivée sans créer d'objet. Avec G6,
« Dériver » crée `f′` et la trace : même courbe, deux gestes.
**Reco : supprimer la case**, « Dériver » la remplace (une seule façon de
faire). Nuance avec G4 (« tout garder ») : la fonction est gardée, pas la case.

**Q2 — Tracer, Nuage, Diagramme changent-ils de vue ?** ✅ **Tranché : ils gardent leur bascule, sans ligne dans Calcul.** Aujourd'hui « Tracer »
bascule vers Graphe, « Nuage » vers Graphe, « Diagramme » vers Données.
G7 interdit d'aller dans **Calcul** sans le vouloir ; il ne dit rien des autres
vues. **Reco : garder ces bascules** — sinon on clique « Tracer » depuis Calcul
et rien ne se voit. Et ils n'écrivent **pas** de ligne dans Calcul (ce sont des
affichages, comme les réglages S5).

---

## Lots, par ordre de dépendance

| Lot | Contenu                                                                                            | Visible en classe ? |
| --- | -------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Réglages d'affichage portés par l'objet (S1–S4), synchro vers le graphique, sauvegarde, lien       | non                 |
| 2   | Carte modifiable : MathLive, frappe en direct, rendu math, pastille, 👁, « Sur le graphique » (§1) | atelier seulement   |
| 3   | Dériver → `f′`, `.dériver f`, règle des actions sans changement de vue (§2, §3)                    | atelier seulement   |
| 4   | Curseurs (§4)                                                                                      | atelier seulement   |
| 5   | Suites (§5)                                                                                        | atelier seulement   |
| 6   | Bascule de `/grapheur` (§6)                                                                        | **oui**             |

Chaque lot : branche + PR, tests rouges d'abord, `code-reviewer`. Le lot 6 se
livre quand les lots 1 à 5 ont été **essayés par David** dans l'atelier.

À vérifier en tête du lot 2 : ce que MathLive produit quand on tape `'`
(`f'` ou `f^{\prime}`) — test sur le vrai MathLive, comme
`mathlive-shortcuts.svelte.test.ts`.

## Décisions du 2026-10-05

**Couleur des dérivées.** `f′` se trace de la couleur de `f`, en tirets (comme
la case « f′ » de l'ancien grapheur) ; `f″` en pointillés, `f‴` en tiret-point.
Changer la couleur de `f` change celle de ses dérivées déjà tracées, pas leur
trait. `f′` reste réglable à la main. Tests : `derivee-couleur.test.ts`.
