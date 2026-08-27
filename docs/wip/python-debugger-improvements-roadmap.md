# Débogueur Python / visualisation d'exécution — Roadmap des améliorations

> **Vue d'ensemble** du chantier « meilleur outil de visualisation façon Python Tutor » pour le
> playground `/python`. Détail d'exécution de la phase en cours : [python-debugger-scrubber-progress.md](./python-debugger-scrubber-progress.md).
> Branche : `feat/python-debugger-scrubber`.

## Objectif

Faire du débogueur du playground le **meilleur outil possible de visualisation d'exécution**
(niveau / au-dessus de Python Tutor), pour des élèves francophones débutants en Python.

## État de l'art (recherche sourcée)

- **Python Tutor** (Guo, [SIGCSE 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)) = la référence. Deux panneaux (frames | heap), références = flèches, primitives inline / objets sur la heap.
- **Validations de notre approche** : notre découpage primitives-inline / objets-sur-heap + fusion des alias par `id()` est exactement ce que préconise le papier ; **Pandas Tutor** (Guo, [pyodide.org](https://blog.pyodide.org/posts/pandastutor/)) prouve que tout le traceur tourne 100 % client via Pyodide.
- **Là où PT n'est PAS une barre haute** (nos différenciateurs) : (a) **pas d'algorithme de layout** (grille + heuristique « pousser à droite », aplati sur arbres/graphes) ; (b) **pas d'animation** (renoncé explicitement) ; (c) antérieur aux LLM (pas d'IA ancrée sur la trace).
- Techniques réutilisables : `elkjs` (layout Sugiyama + routage orthogonal, en worker), `animate:flip`/`crossfade` Svelte (object-constancy, [Heer & Robertson 2007](https://idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf)), Reingold–Tilford (arbre de récursion), `np.array2string`/pandas repr pour les grosses structures, birdseye/futurecoder (enregistrement par sous-expression).

## Moteur — prérequis LIVRÉ ✅

**Réécriture du traceur en `sys.settrace`** (commit `452dc6fc0`). L'ancien interpréteur AST maison
n'entrait **pas** dans les fonctions (`call_stack` jamais rempli) → aucun step-into, marqueurs,
frames ou récursion possibles. Le nouveau `_chiphre_record_trace` (worker) descend dans les
fonctions user (filtre `co_filename`), pas dans les libs. **C'est le socle qui débloque tout le
reste.** Vérifié Pyodide réel (`debug-record-real.svelte.test.ts`).

## Les améliorations, classées (impact ÷ effort) + statut

| #   | Amélioration                                                                                                                                                                                      | Statut                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Scrubber temporel** sur trace immuable complète (slider + marqueurs call/return/exception + play/pause + nav pas-à-pas + saut aux points d'arrêt + gouttière cliquable + step-over + mode live) | ✅ **LIVRÉ** (commit `452dc6fc0`) — reste l'animation (#2)                                                                       |
| 2   | **Transitions animées** des cartes mémoire (`animate:flip` + `crossfade`, clé = `id()`, respect `reduced-motion`)                                                                                 | ⏳ **PROCHAINE** (Étape 4)                                                                                                       |
| 3   | **IA « explique ce pas »** ancrée sur la trace + teach-back gate                                                                                                                                  | ⏸️ **ÉCARTÉ pour l'instant** (RGPD — code d'élèves mineurs → API externe à cadrer). Runtime = Haiku/Sonnet, pas Fable/Opus live. |
| 4   | **Vue arbre de récursion** (Reingold–Tilford, nœuds args→retour, sous-problèmes teintés)                                                                                                          | ⏳ planifié — débloqué par settrace (vraies frames)                                                                              |
| 5   | **Layout heap via `elkjs`** (Sugiyama + routage orthogonal, en worker) — remplace l'empilement DOM + flèches Bézier à la main                                                                     | ✅ **LIVRÉ** (ELK en-thread V1 ; worker = follow-up) — socle prêt pour #2                                                        |
| 6   | **UX grosses structures** (`np.array2string`/pandas repr, fetch-on-expand, sparklines)                                                                                                            | ⏳ planifié                                                                                                                      |
| 7   | **Enregistrement par sous-expression** (réécriture AST style birdseye)                                                                                                                            | ⏳ phase ultérieure (gros changement archi)                                                                                      |

## Décisions actées

- **Modèle unifié enregistrer-puis-rejouer** (comme Python Tutor) : un seul mode. Plus de step-into/over/out _live_ ; le pas-à-pas navigue dans l'enregistrement (avant ET arrière).
- **Mode live** : en mode Debug, auto-enregistrement à l'entrée + ré-enregistrement débouncé (600 ms) à chaque modif du code. Plus de bouton « Lancer » ni « Effacer ».
- **Moteur `sys.settrace`** plutôt qu'étendre l'interpréteur AST (plafond bas) — voir ci-dessus.
- **Modèle IA** : construire avec Opus 4.8 ; narration IA runtime (si un jour) = Haiku 4.5 / Sonnet 4.6 + précalcul, **jamais Fable/Opus en live** (coût/latence à l'échelle).

## Dette / suites connues

- **Indicateur de boucle** (`loops`) : vide depuis le passage à settrace — à réimplémenter si besoin pédagogique.
- **Code mort** : l'ancien interpréteur AST (`_chiphre_debug_generator` legacy) est devenu inatteignable (après `return`) — à retirer au nettoyage.
- **Perf** : record-then-replay pilote ~1000 aller-retours `postMessage` (drive `step`) — optimisable en un seul message `debug-record` synchrone plus tard.
- **a11y** : flèches SVG du diagramme `aria-hidden` (dette existante).
- **Doc de référence** : `docs/ref/python/README.md` (section Debugger) à mettre à jour **au merge** (tracer settrace, scrubber, mode live, gouttière breakpoint livrée).

## Maintenance de ce document

Mettre à jour la colonne **Statut** à chaque avancée. Au merge de la branche, reporter l'état final
dans `docs/ref/python/` et archiver ce roadmap + le progress doc.
