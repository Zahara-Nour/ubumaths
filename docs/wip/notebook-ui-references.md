# Notebook UI — Références et backlog UX

> Notes posées en juin 2026 après le benchmark des UIs Jupyter-like.
> Source de vérité pour les choix UX à venir sur le module Notebook.

## Les 4 références qui valent le coup d'être étudiées

Pour un public lycée, ces 4 produits couvrent le spectre du Jupyter-like
moderne. Ordre = pertinence décroissante pour UbuMaths.

### 🥇 Google Colab

**À voler** : la sobriété par défaut. Trois icônes par cellule
(`run`, `+ code`, `+ text`), tout le reste vit dans le menu `…`. Sidebar
repliable avec sommaire auto-généré des cellules markdown. Boutons
"Connect" et "Run all" toujours visibles en haut. UX la mieux calibrée
pour des élèves qui découvrent.

**À ne pas copier** : la complexité des options de Runtime, les Forms
(formulaires inline) — ça brouille pour des élèves.

### 🥈 Deepnote

**À voler** : le concept de **blocks typés** — il y a un "Input block"
(champ texte ou slider qui injecte une variable), un "Chart block"
no-code, et les "Code block" peuvent être marqués réactifs. UX bien
plus claire que "tout est une cellule code" pour cacher la complexité
aux débutants. Très Notion-like, lisible.

**Application UbuMaths** : nos checkpoints sont exactement ça — un
block typé. On pourrait aller plus loin avec un "Input block" (le prof
prépare un slider, l'élève joue avec, observe le graphe). Bon
investissement post-V1.

### 🥉 Marimo

**À voler** : le **graphe de dépendances entre cellules** affiché
visuellement, et le **vrai reactive** (modifier cellule 2 ré-exécute
automatiquement cellules 3, 5 qui en dépendent). Plus aucun bug "j'ai
oublié de relancer la cellule du dessus".

**Pour UbuMaths** : trop disruptif pour V1 (Jupyter classique reste la
norme didactique au lycée), mais à regarder pour V2 — éliminerait
justement le problème du checkpoint stale après inactivité (les
cellules upstream se ré-exécutent toutes seules).

### VS Code Notebooks

**À voler** : la qualité de l'éditeur de code par cellule (Monaco) —
autocomplete contextuel, hover types, diagnostics inline, raccourcis
cohérents avec le reste de l'IDE. On utilise CodeMirror 6, même niveau
de qualité atteignable.

**À regarder** : leur affichage des outputs (collapse automatique des
longs `print`, tabs pour stdout/stderr séparés).

## Avis arrêté pour UbuMaths

**Cible UX = Colab.** C'est ce qui marche en classe partout dans le
monde, c'est ce que les élèves vont voir en NSI, en stage, en sup.
Inutile d'innover sur le pattern de base.

**Différentiation possible** : les checkpoints sont déjà une feature
unique vs Colab/Jupyter — c'est l'angle pédagogique. Doublé d'un
"Input block" Deepnote-style, on aurait quelque chose de plus utile
au lycée que Colab.

## Backlog UX — ce qui manque par rapport à Colab

| Manque                                                          | Effort       | Impact | Statut                       |
| --------------------------------------------------------------- | ------------ | ------ | ---------------------------- |
| Sommaire auto-généré (clic = scroll vers titre markdown)        | ⭐           | ⭐⭐⭐ | ✅ Livré (`2fba96c71`)       |
| Bouton "Run all" propre dans la toolbar                         | déjà présent | —      | ✅                           |
| Indicateurs de "cellule modifiée" (point bleu)                  | ⭐           | ⭐⭐   | ✅ Livré (`d37703a06`)       |
| Collapse des outputs longs (>20 lignes) avec "Show more"        | ⭐⭐         | ⭐⭐   | ✅ Livré (`2fba96c71`)       |
| Affichage progression avec timer pour cellule longue            | ⭐⭐         | ⭐     | ✅ Livré (`d37703a06`)       |
| Drag-and-drop pour réordonner les cellules                      | ⭐⭐⭐       | ⭐⭐   | ✅ Livré (`b5c544d63`)       |
| Run button dans le gutter sous `[In N]` (Colab/Jupyter pattern) | ⭐           | ⭐⭐   | ✅ Livré (`0536f9c5e`)       |
| Commentaires en marge sur une cellule (prof → élève)            | ⭐⭐⭐⭐     | ⭐⭐⭐ | ⏸️ Suspendu (cf. ci-dessous) |

## Pourquoi les commentaires sont suspendus

Analyse en juin 2026 après discussion :

- **Effort** : ~3-4 jours focalisés (migration DB + RLS + API + Zod + UI
  panneau + notifications + tests).
- **ROI lycée** : faible. La majorité du feedback se fait en classe à
  l'oral. Risque de fatigue notifications (5 commentaires × 30 élèves
  = 150 notifications dans la soirée). Le dashboard "Résultats" donne
  déjà l'info actionnable (qui galère sur quoi → discussion en cours).
- **Scénario qui change la donne** : enseignement distanciel ou
  classes très grandes où le prof ne voit pas chaque élève.

**Décision** : attendre un signal réel (demande prof concrète,
basculement vers distanciel) avant d'investir.

## Candidats pour les ~3 jours qui auraient été dépensés sur les commentaires

Triés par impact estimé.

| Feature                                                                                  | Effort | Impact lycée |
| ---------------------------------------------------------------------------------------- | ------ | ------------ |
| **Champ "indice" sur les checkpoints** (le teacher écrit un hint affiché après N échecs) | ~4h    | ⭐⭐⭐       |
| **Mode présentation** (notebook plein écran cellule par cellule pour vidéoproj)          | ~4h    | ⭐⭐⭐       |
| **Notebook templates** (cloner un notebook préparé pour chaque classe)                   | ~5h    | ⭐⭐⭐       |
| **Export PDF du notebook** (rendu propre pour DM imprimés)                               | ~6h    | ⭐⭐⭐       |
| **Affichage des tentatives élève** sur Résultats (pas juste pass/fail)                   | ~6h    | ⭐⭐         |
| **Input block Deepnote-style** (slider/input qui injecte une variable)                   | ~10h   | ⭐⭐⭐       |

## Idées V2 (gros chantiers, à ne pas sous-estimer)

- **Réactivité Marimo-style** : DAG de dépendances entre cellules,
  ré-exécution automatique des descendants. Résout le problème "j'ai
  oublié de relancer". Demande de réécrire la sémantique d'exécution.
- **Collaboration temps réel** (Google Docs sur les notebooks). Énorme.
  Probablement Liveblocks ou Yjs.
- **Commentaires** (cf. ci-dessus) si feedback distanciel devient un
  besoin concret.
