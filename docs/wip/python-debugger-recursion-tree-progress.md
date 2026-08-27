# Débogueur Python — Vue arbre d'appels / récursion (#4)

> Amélioration **#4** de la [roadmap](./python-debugger-improvements-roadmap.md). Branche :
> `feat/python-debugger-recursion-tree`. Débloqué par le moteur settrace (vraies frames).
> **Rien ne se merge sans accord explicite.**

## Décisions (validées)

1. **Capture des valeurs de retour** : le tracer settrace stocke maintenant `returnValue` (repr
   tronqué) sur les events `return` → l'arbre montre `f(args) → résultat`.
2. **Layout elkjs `mrtree`** (Reingold–Tilford, direction DOWN) — pas de nouvelle dépendance.
3. **`buildCallTree(trace)` pur** (transitions call/return).
4. **Onglet « Arbre d'appels »** dans `DebugPanel` (4ᵉ vue), visible si la trace contient des appels.
5. **Sous-problèmes dupliqués teintés** (mémoïsation) — livré en V1.

## Découpage (tout vérifié)

- **Increment 1 — capture des retours** ✅ : worker (`build_snapshot(frame, event, arg)` → `returnValue`),
  type `DebugSnapshot.returnValue?`, schéma Zod. **Test Pyodide réel 4/4** (`fact(3)` → `6`/`1`).
  ⚠️ Piège évité : un backtick dans un commentaire Python cassait le template literal JS du worker.
- **Increment 2 — `buildCallTree`** ✅ (`call-tree.ts`, pur) : **7 tests** (récursion, branches, exception,
  racines multiples).
- **Increment 3 — layout** ✅ (`call-tree-layout.ts`, elkjs mrtree) : **3 tests ELK réelle**.
- **Increment 4 — UI** ✅ (code) — ⏳ vérif visuelle : `RecursionTreeView.svelte` (mesure → layout →
  cartes `f(args)→retour`, teinte des doublons, nœud actif surligné selon `stepIndex`, animation
  `animate:flip`) + onglet dans `DebugPanel`. autofixer 0 issue · check:incremental 0 erreur.

## À vérifier sur `/python`

Mode Debug → fonction récursive, ex. `def fib(n): return n if n < 2 else fib(n-1)+fib(n-2)` puis
`fib(5)`. Onglet **« Arbre d'appels »** → arbre des appels `fib(k) → v`, sous-problèmes répétés
teintés, scrube → le nœud actif se surligne.

## Raffinements (retours David)

- **Construction progressive** : `pruneTree(tree, step)` (pur, +4 tests) → l'arbre se **construit au
  fil du scrub** (appels démarrés seulement) ; les `→ retour` se remplissent quand les appels remontent.
- **Couleur du nom stabilisée** : la teinte des sous-problèmes dupliqués ne s'applique plus au nom
  (distrayant en construction), seulement au **fond** des cartes.

## DoD

- [x] Tests (4 réels + 11 pur + 3 layout) · check:incremental 0 erreur · autofixer 0 issue
- [x] Vérif visuelle sur `/python` (construction progressive OK, nom stable)
- [x] MAJ roadmap (#4 → livré) + `docs/ref/python/`
