---
title: Atelier — ce qui manque avant de retirer /cas (phase 0)
date: 2026-10-11
status: phase 0 validée par David (2026-10-11) ; PR 1 en cours (branche feat/atelier-calcul-clavier)
---

# Atelier — ce qui manque avant de retirer `/cas`

Inventaire du 2026-10-11 (`/cas` contre l'atelier, lu dans le code) et décisions de David du même jour.
Chapeau du chantier : [atelier-progress.md](atelier-progress.md).

## Décisions de David (2026-10-11)

- On ajoute à Calcul : **le rappel des saisies (↑/↓)**, **le bouton exact ⇄ décimal par ligne**,
  **la complétion** (commandes ET noms).
- On **laisse perdre** : l'historique conservé au rechargement (l'export JSON existe), la recherche
  Ctrl+R, la saisie sur plusieurs lignes, les onglets MathLive de `/cas`, `.inv` et `.def'` (réciproque
  et dérivée données à la main).
- **Entrée dans une liste ouverte** :
  - liste des **commandes** (après `.`) → Entrée **choisit** (une commande incomplète ne calcule rien) ;
  - liste des **noms et fonctions** (au milieu d'un calcul) → Entrée **calcule** ; Tab ou un clic
    choisit. Exemple : `t = 2`, `a = 5`, l'élève tape `3ta`, la liste propose `tan(` — Entrée doit
    donner 30, pas `3tan(`.
- **Après le choix d'une commande, son modèle reste affiché sous le champ** (`.taylor sin(x) ordre 5 en 0`)
  pendant que l'élève tape la suite — plutôt qu'une complétion des mots-clés.
- **`/cas` n'est PAS retirée pour l'instant** (David, 2026-10-11). La PR 4 est suspendue ; le jour
  venu, reste à trancher : redirection vers `/atelier` (reco) ou 404.

## Trois PR (le retrait est suspendu)

### PR 1 — le clavier de Calcul et le modèle de la commande (en cours)

**Rappel des saisies**

| Cas                                                       | Attendu                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Trois lignes tapées, champ vide, ↑                        | le champ reçoit la dernière saisie, curseur à la fin                                     |
| ↑ encore                                                  | l'avant-dernière ; ↑ sur la plus ancienne : rien ne bouge                                |
| ↓ après des ↑                                             | la saisie suivante ; ↓ après la plus récente : le brouillon d'avant le premier ↑ revient |
| L'élève avait commencé `2x+` puis ↑, puis ↓ jusqu'au bout | `2x+` revient, intact                                                                    |
| Ligne produite par un bouton (action d'une carte)         | **pas rappelée** : seules les saisies tapées le sont                                     |
| Deux saisies identiques de suite                          | rappelées une seule fois                                                                 |
| Rechargement de la page                                   | rien à rappeler (les lignes ne sont pas conservées)                                      |
| Saisie refusée (ligne rouge)                              | rappelée : c'est celle qu'on veut corriger                                               |
| Liste ouverte                                             | ↑/↓ choisissent dans la liste, pas dans l'historique                                     |

**Liste des commandes au clavier**

| Cas                     | Attendu                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `.dé`                   | liste ouverte, première commande disponible surlignée                               |
| ↓ / ↑                   | le surlignage descend / monte, en boucle ; les commandes indisponibles sont sautées |
| Entrée ou Tab           | le champ devient `.dériver ` (avec l'espace), liste fermée                          |
| Échap                   | liste fermée, champ inchangé ; la liste ne revient qu'à la frappe suivante          |
| `.zz` (aucune commande) | pas de liste ; Entrée calcule comme aujourd'hui (message de commande inconnue)      |
| Clic                    | comme aujourd'hui                                                                   |
| Lecteur d'écran         | la liste est annoncée comme une liste de choix, l'élément surligné est annoncé      |

**Modèle de la commande**

| Cas                                                    | Attendu                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Champ `.taylor ` (choisie ou tapée à la main)          | sous le champ : `.taylor sin(x) ordre 5 en 0` (l'exemple du catalogue)               |
| L'élève tape la suite                                  | le modèle reste                                                                      |
| Champ vidé, ou qui ne commence plus par cette commande | le modèle disparaît                                                                  |
| Commande sans exemple dans le catalogue                | sa description à la place ; un test exige un exemple pour chaque commande disponible |
| Alias tapé (`.deriver`, `.diff`)                       | le modèle de la commande, écrit avec son nom français                                |

### PR 2 — le bouton exact ⇄ décimal

| Cas                                          | Attendu                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `\sqrt{2}/2`, `π/3`, `2/7`, `ln(3)`, `e^2`   | bouton ≈ ; un clic : `≈ 0,7071` (arrondi de `.mode décimal`, virgule décimale) ; un second clic : la valeur exacte |
| `.résoudre x^2=2`                            | bouton sur l'ensemble : `S = {−1,4142 ; 1,4142}` ; les étapes ne bougent pas                                       |
| Résultat déjà décimal ou entier (`0,5`, `3`) | pas de bouton                                                                                                      |
| Résultat littéral (`2x+1`, `f′(x) = …`)      | pas de bouton                                                                                                      |
| Ligne refusée, message, `.aide`              | pas de bouton                                                                                                      |
| `.mode décimal` actif                        | la ligne arrive en décimal ; le bouton montre la valeur exacte                                                     |
| Export, rejeu, « Garder »                    | ignorent le bouton : on exporte et on garde la valeur EXACTE                                                       |

### PR 3 — la complétion des noms et des fonctions

**Règle unique** : la liste s'ouvre quand le mot en cours (lettres seulement) a **au moins 2 lettres**, est
le **début** d'une proposition, et que choisir cette proposition **changerait** le champ.

| Cas                                         | Attendu                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `si`                                        | propose `sin(` (et `sinh(` si Calcul l'accepte)                                |
| `al`                                        | propose `α` (le symbole, pas `\alpha`)                                         |
| `pi`                                        | propose `π` (`pi` en lettres est refusé depuis #896)                           |
| Panneau avec `aire = 12`, l'élève tape `ai` | propose `aire`                                                                 |
| `f`, `x`, `a` (une lettre)                  | rien                                                                           |
| `3ta` avec `t` et `a` dans le panneau       | `tan(` proposé ; **Entrée calcule** 3·t·a = 30                                 |
| Tab ou clic                                 | remplace le mot par la proposition ; `sin(` met le curseur après la parenthèse |
| Échap                                       | ferme la liste                                                                 |
| `.dériver si` (après la commande)           | propose `sin(` comme ailleurs                                                  |
| Sur le nom de la commande (`.dé`)           | c'est la liste des commandes (PR 1), pas celle-ci                              |
| Au plus 8 propositions                      | les noms du panneau d'abord, puis fonctions, puis lettres grecques             |

**Garde-fou** : un test insère chaque proposition dans une saisie type (`sin(` → `sin(1)`, `α` → `2α`…)
et exige que Calcul l'**accepte** ; une proposition refusée fait échouer le test. Raison : le module de
complétion de `/cas` (`mathAST/cli/completion`) insère `\alpha` et `\pi` en LaTeX à côté de `sin(` en
syntaxe maison — une saisie mêlée que Calcul refuse depuis #911.

### PR 4 — le retrait de `/cas` (⏸ suspendu : « pour l'instant on n'enlève pas /cas »)

Part : la route `src/routes/(public)/cas/`, `src/lib/components/cas/` (dont `AstDrawer` et
`AstTreeViewer`, jamais montés), `src/lib/stores/repl.svelte.ts`. Restent : `WebReplEngine` (moteur
de l'atelier) et `mathAST/cli/completion` (utilisé par la PR 3). Aucun lien ne pointe vers `/cas`,
absente du sitemap. `/calc` (autre page, autre composant, dans le sitemap) : inventaire à part.

## Journal

- 2026-10-11 — phase 0 validée par David (« je valide »). PR 1 codée sur
  `feat/atelier-calcul-clavier` : `CalcDesk.recallPrevious` / `recallNext` (saisies tapées
  seulement, `#submit(text, typed)`), `commandBeingWritten` (`commands.ts`), combobox dans
  `CalculView.svelte`. Mesuré : le curseur se place seul à la fin d'une ligne rappelée (norme HTML) —
  un `setSelectionRange` ajouté ne changeait rien au test, retiré.
- 2026-10-11 — revue `code-reviewer` de la PR 1 : corrigés une ligne rappelée commençant par un
  point qui rouvrait la liste (`.pose` bloquait ↑/↓), « Comparer » en plein rappel qui perdait le
  brouillon, un historique rejoué rappelable (« Comparer » compris), le surlignage gardé après
  effacement, Maj+↑/↓, l'Entrée IME de Safari (code 229), les ids fixes (`$props.id()`), « Modèle »
  affiché pour une commande indisponible.
- 2026-10-11 — DÉCISION DE DAVID (« oui ») : une commande sans argument tapée en entier se lance
  d'une seule Entrée. Marqueur explicite `runsAlone` dans le catalogue (aide, valeurs, fonctions,
  exact, décimal, auto, exporter) : « sans exemple » ne suffisait pas, `.arbre` n'en a pas et attend
  une expression. Garde : chacune répond tapée seule.
