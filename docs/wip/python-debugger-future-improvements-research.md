# Débogueur Python — État des lieux & recherches (améliorations futures)

> Compagnon de la [roadmap](./python-debugger-improvements-roadmap.md). Capture (1) l'**état des
> lieux livré** et (2) les **recherches faites** pour les améliorations pas encore construites
> (#6, #7) — décisions, faits **vérifiés dans le code / les sources**, et points de départ — pour
> qu'une future session reparte sans tout réinvestiguer.
>
> **Recherche datée du 2026-08-28.** Une mémoire reflète l'état au moment où elle est écrite :
> re-vérifier les fichiers/fonctions cités avant de s'en servir.

---

## 1. État des lieux — ce qui est livré et en prod

| Brique                           | Statut                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| **Moteur `sys.settrace`**        | ✅ `_chiphre_record_trace` (worker) — vrai step-into, frames, call/return, récursion       |
| **#1 Scrubber temporel**         | ✅ trace immuable + slider + marqueurs + play/pause + mode live (auto-record débouncé)     |
| **#2 Transitions animées**       | ✅ `animate:flip` + fade, reduced-motion                                                   |
| **#4 Vue arbre de récursion**    | ✅ `buildCallTree` + elkjs `mrtree`, construction progressive, doublons teintés            |
| **#5 Layout heap via elkjs**     | ✅ `layered` + routage orthogonal (ELK en-thread V1 ; worker = follow-up)                  |
| **Nettoyage code mort** (PR #88) | ✅ ancien interpréteur AST inatteignable retiré (~469 lignes) + specs placeholder périmées |

Modèle acté : **enregistrer-puis-rejouer** (un seul mode, le pas-à-pas navigue l'enregistrement).
Vues du panneau Debug : liste / table / heap (diagramme mémoire) / arbre d'appels.

---

## 2. #6 — UX grosses structures (recherche faite, **EN PAUSE**)

### Décisions validées (David, 2026-08-28)

- **Priorité : listes/dicts natifs** (cas du débutant : boucles, compréhensions). numpy/pandas
  **secondaire** (rare pour ce public).
- **Périmètre MVP = reprs dédiées + résumé.** **PAS** de « voir plus », **PAS** de sparklines.

### Comportement actuel (vérifié dans `src/lib/workers/pyodide.worker.ts`)

Sérialiseur = `_chiphre_serialize_with_heap` (ligne ~686). Constantes : `MAX_SERIALIZE_DEPTH=5`,
`MAX_SERIALIZE_ITEMS=50`, `MAX_STRING_LENGTH=200`.

| Type                                             | Aujourd'hui                                                                                                | Verdict                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| **list/tuple/set/dict natifs**                   | 50 items enregistrés + `length` **réelle** conservée + entrée marqueur `{type:'truncated', value:'items'}` | ✅ borné correctement    |
| **str / bytes longs**                            | tronqués à 200 + `...`                                                                                     | ✅ ok                    |
| **numpy `ndarray`, pandas `DataFrame`/`Series`** | ni container ni user-instance → **fallback** `repr()` **coupé à 200 caractères** (ligne ~835)              | ❌ vrai point douloureux |

### Contrainte architecturale (imposée, pas un choix)

Modèle **enregistrer-puis-rejouer** : au scrub, **les objets Python n'existent plus** (seuls les
snapshots subsistent). Donc **pas de `fetch-on-expand` live** possible ; un futur « voir plus » ne
pourrait que **révéler du détail déjà enregistré** (et enregistrer plus se paie **×N snapshots** en
mémoire). C'est pourquoi le MVP se limite aux reprs + résumé.

### Points de départ pour l'implémentation (côté client — c'est là qu'est le gros du gap)

Le rendu heap est dans **`src/lib/components/python/debug/`** :

- **`heap-utils.ts`** :
  - `heapTypeLabel(obj)` renvoie déjà `` `${obj.type}[${obj.length}]` `` → **le header affiche DÉJÀ
    la longueur réelle** (ex. `list[1000]`). ⚠️ (Ne pas re-« corriger » ce faux problème.)
  - `formatInline({type:'truncated', value:'items'})` renvoie **`… (items)`** — **vague**. Le vrai
    gap MVP natif = rendre ce marqueur explicite, ex. **« … 950 autres (50 sur 1000 affichés) »**.
- **`HeapCard.svelte`** (carte du diagramme mémoire elkjs) + **`HeapPanel.svelte`** (vue liste) :
  itèrent `obj.entries` (50 max + le marqueur). C'est ici qu'on améliore l'affichage du marqueur.
- **numpy/pandas** (secondaire) : ajouter, **côté worker**, une branche avant le fallback qui
  détecte `ndarray`/`DataFrame`/`Series` et produit un résumé (`np.array2string` coins + forme +
  dtype ; `DataFrame` → forme + dtypes + `head`). Reste **borné** (coût ×N snapshots).

**Résumé de l'effort #6 MVP** : petit côté worker (marqueur plus riche + éventuel résumé
numpy/pandas), petit-moyen côté client (rendu du marqueur). Beaucoup plus étroit que le #6
« complet » de la roadmap d'origine.

---

## 3. #7 — Enregistrement par sous-expression (**faisabilité étudiée**)

> Capturer la valeur de **chaque sous-expression** dans l'ordre réel d'évaluation (façon
> [birdseye](https://github.com/alexmojaki/birdseye)). Ex. `resultat = 2 + 3 * 4` → montrer
> `3*4 = 12` **puis** `2 + 12 = 14`. Enseigne priorité des opérateurs, ordre d'évaluation, valeurs
> de retour inline, court-circuit booléen. **Le seul point où on dépasserait vraiment Python Tutor.**

### Verdict : nettement plus faisable qu'il n'y paraît, grâce au précédent **futurecoder**

Le morceau qui fait peur (instrumenter l'AST correctement : court-circuit `and`/`or`, générateurs,
exceptions en milieu d'expression) est **déjà résolu, réutilisable, et prouvé sous Pyodide**.

### Faits qui dé-risquent (vérifiés dans les sources, 2026-08-28)

- **futurecoder** (Alex Hall) = cours Python **100 % navigateur via Pyodide**, birdseye intégré
  comme fonctionnalité centrale. Preuve d'existence directe.
- **Le fork `birdseye@futurecoder` est allégé pour le navigateur** :
  - `bird.py` : `self.store = dict(functions={}, calls={})` → **store en mémoire pur**. **Plus de
    SQLAlchemy, plus de SQLite, plus de Flask.**
  - Le paquet ne contient que `__init__.py, bird.py, tracer.py, utils.py, static/` (le `db.py` /
    serveur ont été supprimés). `tracer.py` = le cœur AST éprouvé.
  - Sortie = des **dicts JSON-sérialisables** → transmissibles au client comme nos snapshots.
- **Licence MIT** → réutilisable avec attribution.
- **C'est un MODE à part** chez futurecoder (`if mode == "birdseye"`, bouton dédié), **pas** fusionné
  au pas-à-pas → **zéro perturbation** de notre scrubber/settrace actuels.
- **Référence UI** : futurecoder a réimplémenté la vue birdseye en **React** (`frontend/src/`) ; il
  existe un **fork éducation FR** (`forge.apps.education.fr/futurecoder/seconde`) à cribler.

### Recette exacte (verbatim `core/runner/birdseye.py` de futurecoder)

```python
from birdseye.bird import BirdsEye

eye = BirdsEye()
traced_file = eye.trace_string_deep(filename, code)        # instrumente TOUT le code
globals().update(eye._trace_methods_dict(traced_file))     # injecte les helpers de trace
exec(traced_file.code)                                     # exécute l'instrumenté
result = dict(call_id=eye._last_call_id, store=eye.store)  # → JSON au client
```

### Mapping sur notre stack

| Couche             | Travail                                                                                                                                                                                                | Taille  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| **Worker Python**  | Vendoriser les 5 fichiers `birdseye@futurecoder` (+ deps pures : `asttokens`, `executing`, `cheap_repr`…) ou micropip. Ajouter un chemin d'exécution « mode birdseye » = la recette ci-dessus.         | S–M     |
| **Sérialisation**  | `store` est déjà des dicts → renvoyer au client.                                                                                                                                                       | S       |
| **UI Svelte**      | **Le vrai chantier** : vue « Expressions » — code avec la valeur de chaque sous-expression en surimpression, navigation par itération de boucle, survol. Porter la vue React de futurecoder en Svelte. | **M–L** |
| **Intégration/UX** | Bouton/mode dans le playground (probablement **mode à part**, pas un onglet du scrubber : birdseye trace des **fonctions entières**, non synchronisé au pas).                                          | S–M     |

**Point clé** : on **n'écrit aucune réécriture AST** (birdseye le fait) → le risque de correction le
plus effrayant est éliminé (code éprouvé).

### Risques / inconnues restants

1. **Deps sous Pyodide 0.26** (`asttokens`/`executing`/`cheap_repr`, pures-Python) → risque faible,
   mais **à valider par un vrai test** (micropip ou vendoring). Poids ~centaines de Ko.
2. **Fork non-PyPI** (branche git maintenue par Alex Hall) → **épingler un commit / vendoriser** (MIT).
3. **L'UI Svelte est du travail neuf** : la vue birdseye (arbre d'expressions, stepping de boucles)
   est non triviale — c'est là que va l'effort. Référence React dispo à porter.

### Recommandation

- **Path A = réutiliser `birdseye@futurecoder`** (surtout **pas** réimplémenter le tracer).
- Décisions à trancher le moment venu : **vendoriser vs micropip** ; **mode séparé vs 5ᵉ onglet**.
- **Prochaine étape de dé-risquage (petite)** : un **POC worker** — charger le fork birdseye dans
  notre Pyodide, tracer `moyenne = (2 + 3*4)`, vérifier que `eye.store` sort les valeurs de
  sous-expressions. ~30 min, sans toucher à l'UI. Lève l'inconnue n°1.

### Sources

- [futurecoder (dépôt)](https://github.com/alexmojaki/futurecoder) ·
  [`core/runner/birdseye.py`](https://github.com/alexmojaki/futurecoder/blob/master/core/runner/birdseye.py)
- [birdseye (MIT)](https://github.com/alexmojaki/birdseye) — branche `futurecoder` (store mémoire)
- [PyDev of the Week: Alex Hall](https://blog.pythonlibrary.org/2021/12/13/pydev-of-the-week-alex-hall/) ·
  [Pyodide](https://pyodide.org)

---

## 4. Suites techniques (backlog) — priorisation honnête

Aucune n'est un bug ; aucune n'est importante maintenant.

| Suite                                    | Verdict                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Message `debug-record` unique (perf)** | Le seul réel, mais **borné** : ~N aller-retours `postMessage` pour bâtir la trace (N ≤ 1000). Négligeable en petit ; ne mord que sur grosses boucles ré-enregistrées en live. **À faire seulement si latence ressentie** (mesurable). |
| **Indicateur de boucle** (`loops`)       | Pas de la dette technique : **décision pédagogique**. `loops` vide depuis settrace. À réimplémenter seulement si « montrer l'itération courante » a une vraie valeur.                                                                 |
| **Flèches animées pendant le slide**     | Polish visuel de #2 (les flèches se redessinent au lieu de suivre). Cosmétique. Faible.                                                                                                                                               |
| **ELK en Web Worker**                    | Prématuré pour de petits programmes (layout = quelques ms in-thread). Utile seulement si les layouts grossissent/saccadent.                                                                                                           |

---

## Maintenance

Ce doc est le **compagnon recherche** de la roadmap. Le mettre à jour quand une décision de
périmètre change ou qu'une inconnue est levée (ex. POC #7). Reporter dans `docs/ref/python/` au merge.
