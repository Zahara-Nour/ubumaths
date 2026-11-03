---
status: en-cours
---

# Chantier `demi-droite` — demi-droite et intervalle à crochets sur ` ```line `

> Outil n° 7 de [outils-manquants.md](outils-manquants.md). Points servis : 3-014 et 3-057 (solutions
> d'une inéquation ax ⩾ b « représentées sur la droite graduée avec un crochet »), 2-251 (représenter un
> intervalle, borné ou non). Ouvert le 2026-11-03.

## Reprendre ici

_Mis à jour le 2026-11-03, PR 2 (geste `representer:`) ouverte._

- **État** : PR 1 (affichage) mergée, #2294. PR 2 (geste de l'élève, `representer:`) codée, tests verts,
  PR ouverte (n° dans « PR 2 » plus bas) ; relecture `code-reviewer` (Opus, correction des réponses) à faire.
- **Prochaine action** : relecture, CI verte, merge ; puis noter la vérification à l'œil (geste au doigt sur
  téléphone) dans `verifications-manuelles.md` et proposer à David un 1er modèle (3-014, 2-251).
- **En attente de David** : rien.
- **Pièges en cours** : Entrée avec une réponse incomplète (`2 comprise, côté ?`) valide la question (la
  case n'est pas vide) ; un segment monté d'un étage peut frôler un point nommé, non traité.
- **Worktree / branche** : `../ubumaths-wt-demi-droite`, `feat/demi-droite-geste`.

---

## Existant (relevé du 2026-11-03)

- ` ```line ` sait tracer `segments: [-1, 3] vert, ]3, 5[ orange` : deux bornes **finies**, toutes deux
  dans la fenêtre (`number-line-parser.ts`, `parseSegments` ; erreur « extends outside bounds »).
  Les extrémités sont des **disques** (plein = fermé, vide = ouvert), pas des crochets : `NumberLine.svelte`
  (`nl-endpoint`), PDF `number-line-typst.ts` (`generateSegments`).
- Pas de borne infinie, donc pas de demi-droite.
- Geste existant à imiter : droite à placer (`placer:`, `NumberLinePlacer.svelte`, `utils/number-line-placer.ts`,
  `case: N` posée par le générateur).
- Case de réponse `answerKind: 'intervalles'` (S = ?, `[a ; b[`, ∅, ℝ, réunion) : déjà en prod, sert de juge
  possible.
- Ce que disent les textes : « Il représente l'ensemble des solutions sur la droite graduée avec un crochet. La
  notation des intervalles (avec les crochets) peut être introduite mais n'est pas un enjeu d'apprentissage. »
  (Exemples cycle 4, 2026, p. 21) ; 2-251 : « Intervalle de la droite numérique, borné ou non » (BO 2de p. 7).
- Contournements actuels : 2-251 en case choix entre droites à `segments:` ; 2de lot 6 B, corrigé de |x| < k
  dessiné sur une ` ```courbe ` faute d'intervalle sur ` ```line `.

## Phase 0 — comportements (à valider)

### Affichage (énoncé, corrigé, PDF)

**Nominal**

1. L'auteur écrit une borne infinie avec `-inf` / `+inf` dans `segments:` : `segments: [2, +inf[ vert`.
   La droite montre un crochet en 2, ouvert vers la droite (« [ » tourné vers les solutions), et un trait
   épais coloré de 2 jusqu'au bout de la flèche.
2. `]-inf, 3]` : trait du début de la droite jusqu'à 3, crochet « ] » fermé en 3.
3. Intervalle borné `[-1, 3[` : crochet à chaque bout, selon Q2.
4. Même dessin à l'écran (téléphone 390 px compris) et dans le PDF.

**Limites**

5. Borne en fraction ou racine (`[2/3, +inf[`, `]-inf, sqrt(2)]`) : placée comme les points actuels,
   crochet à la bonne abscisse, étiquette selon les graduations.
6. Borne finie hors de la fenêtre : erreur de l'auteur, comme aujourd'hui.
7. `]-inf, +inf[` : toute la droite colorée, sans crochet.

**Erreurs (auteur)**

8. `[-inf, 2]` ou `[3, +inf]` (crochet fermé sur l'infini) : erreur claire « l'infini est toujours exclu ».
9. `[+inf, 2[` (ordre inversé) : erreur « la borne de gauche doit être plus petite ».

### Geste de l'élève (case de réponse)

**Nominal**

10. L'auteur écrit `representer: [2, +inf[` (nom à trancher) dans un ` ```line ` ; la droite s'affiche vide,
    l'élève :
    a. touche une graduation pour poser la borne (accrochée à la graduation la plus proche, comme `placer:`) ;
    b. choisit le sens avec deux boutons « vers la gauche ← » / « vers la droite → » ;
    c. choisit la borne « comprise » / « exclue » (bouton qui bascule le crochet).
    La droite redessine à chaque étape ce qu'il a fait.
11. 2-251 (borné) : `representer: [-1, 3[` → deux bornes posées, chacune comprise / exclue, pas de sens.
12. Juste si borne(s), sens et crochets sont tous justes ; un seul juge, que la réponse soit tapée au doigt ou
    à la souris.

**Limites**

13. L'élève a posé la borne mais pas choisi le sens : « Choisis de quel côté sont les solutions. »
14. Borne entre deux graduations (2/3 sur une droite graduée en tiers) : la graduation existe, le geste l'atteint ;
    l'auteur est averti si la borne n'est sur aucune graduation (comme `placer:`).

**Erreurs (élève) — phrases après la réponse**

15. Bon côté, borne juste, crochet faux : « Le nombre 2 est-il solution ? Le crochet dit le contraire. »
16. Mauvais côté : « Les solutions sont de l'autre côté de 2. »
17. Mauvaise borne : « La limite des solutions n'est pas là. »

### Questions à David

- **Q1 — Disques ou crochets pour les segments qui existent déjà ?** Aujourd'hui `[-1, 3]` se dessine avec
  des disques pleins ou vides. Le texte de 3e demande « un crochet ». Reco : **crochets partout** (les
  segments existants passent aux crochets, c'est la notation française du lycée) ; les modèles déjà publiés
  qui ont des `segments:` changent d'aspect (relevé à faire avant, en base). Autre choix : crochets pour les
  seules demi-droites, disques gardés ailleurs.
- **Q2 — Deux PR ?** Reco : PR 1 = affichage (`-inf`/`+inf`, crochets, écran + PDF) ; PR 2 = geste de l'élève.
  La PR 1 sert déjà aux corrigés (3-014, |x| < k de la 2de).
- **Q3 — Le geste en trois temps (borne, sens, compris/exclu) te va-t-il ?** Autre choix : l'élève tape
  deux fois sur la droite (borne puis un point du côté des solutions) et un seul bouton bascule le crochet.
  Reco : les trois temps, chaque choix visible et rattrapable, plus simple au doigt.
- **Q4 — Le nom de la clé du geste** : `representer:` (le verbe des textes), `colorier:`, autre ? Reco :
  `representer:`.

## Décisions (David, 2026-11-03, « je suis tes recos »)

- Q1 : **crochets partout**, segments finis compris. Relevé en prod avant : **aucun** modèle, exercice, carte,
  fiche, journal de classe ni énigme n'utilise `segments:` (requêtes `::text ~ 'segments:'` sur
  `question_templates`, `exercises`, `srs_cards`, `class_journal_entries`, `riddles`, `worksheet_templates`,
  `journal_entry_homework`, `rag_documents` : 0) → rien de publié ne change d'aspect.
- Q2 : deux PR, affichage puis geste.
- Q3 : geste en trois temps (borne, côté, comprise / exclue).
- Q4 : clé `representer:`.

## PR 1 — affichage (2026-11-03)

- Écart à la phase 0, vu sur capture : crochets petits et trait sous l'axe qui gênait les nombres → trait **sur
  l'axe**, crochets ±9 px (PDF ±0,2 cm) ; un segment qui en chevauche un autre (bout commun compris) monte
  d'un étage (`segmentLevels`) ; une réunion disjointe reste sur l'axe. Écran : flèches et graduations
  par-dessus le trait. PDF : trait d'une borne infinie arrêté à la base de la flèche (creuse, sinon cachée).
- Tests : `number-line-demi-droite.test.ts` (lecture, erreurs, sens des becs, étages),
  `NumberLine-crochets.svelte.test.ts`, `number-line-typst.test.ts` ; vus rouges avant le code (17 serveur).
  Tests des anciens disques réécrits : `block-colors-typst.test.ts`, `couleurs-lot3.svelte.test.ts`.
- Vu à l'œil : capture 390 px (vitest navigateur) et PDF compilé avec le compilateur de la prod.
- Catalogue des blocs : exemple « Demi-droite (solutions d'une inéquation) ».
- #2294 : relecture `code-reviewer` sans bloquant ; deux mineurs corrigés (une seule erreur pour un infini mal
  écrit, `+inf` écrit dans l'avertissement « outside bounds »). CI verte, mergée le 2026-11-03.

## PR 2 — geste `representer:` (2026-11-03)

- Format de la réponse (piège ouvert de la PR 1) : texte lisible, une écriture pour l'attendu et pour
  l'élève (`representerAnswer`) : `[2 ; +∞[`, `]-1 ; 3]`, bornes comme les graduations (`placerText`) ;
  incomplète `2 comprise, côté ?` / `-1 comprise, autre borne ?` (jamais juste, relue au remontage).
  Case `type: 'text'` ; juge à part `isRepresentedIntervalCorrect` (nombres comparés, sans la droite),
  choisi quand l'attendue est un intervalle. `answerKind: 'intervalles'` pas utilisé : la réponse est
  toujours écrite par le geste, une seule écriture.
- Masque de l'énoncé envoyé : `representer: ?` (demi-droite) / `? ; ?` (borné) — le geste (une borne +
  côté, ou deux bornes) reste connu de l'élève, comme le dit la phase 0 (points 10 et 11).
- Refusés en plus de la phase 0 : plusieurs intervalles, couleur, `]-inf, +inf[`, avec `placer:` ou
  `segments:`, échelle log.
- Borne posée sans côté : la phrase 13 s'affiche en direct sous la droite (et après correction).
  Intervalle borné à une seule borne, après correction : « Pose les deux bornes. » (ajout).
- Tests : `number-line-representer.test.ts`, `generation-representer.test.ts`,
  `NumberLineRepresenter.svelte.test.ts` (dont la question générée dans `FillBlanksInput`) ; vus rouges
  avant le code (module absent ; composant : 9/13 rouges sans le branchement de `NumberLine.svelte`).
- Catalogue des blocs : réglage `representer` et exemple « Représenter les solutions d'une inéquation ».
