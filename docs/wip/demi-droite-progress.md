---
status: en-cours
---

# Chantier `demi-droite` — demi-droite et intervalle à crochets sur ` ```line `

> Outil n° 7 de [outils-manquants.md](outils-manquants.md). Points servis : 3-014 et 3-057 (solutions
> d'une inéquation ax ⩾ b « représentées sur la droite graduée avec un crochet »), 2-251 (représenter un
> intervalle, borné ou non). Ouvert le 2026-11-03.

## Reprendre ici

_Mis à jour le 2026-11-03, après #2346._

- **État** : 3-014 (06601c87) publié. 2-251 **déjà couvert** par 2069ac7e (chantier `questions-2de`, lot 9 :
  `representer:`, demi-droites et borné, publié) : pas de modèle à faire. #2346 mergée : lot
  `valeur-absolue-droite-2de` de `update-published-questions.ts`, droite graduée ajoutée au corrigé de 80a87e34.
- **Prochaine action** : David lance la simulation puis `--publier` du lot → relire 80a87e34 en prod
  (MCP) → clôture (archiver ce journal, outil n° 7 livré dans `outils-manquants.md`). La doc système est déjà
  versée (`ubumark.md`, `questions.md`).
- **En attente de David** : les deux commandes du lot (classifieur : simulation refusée à Claude).
- **Pièges en cours** : `update-published-questions` lit `.env` (prod) : simulation et écriture → David avec `!`.
  Rendu à l'œil non vu (Chrome n'a pas navigué) : le voir dans l'aperçu admin après `--publier` ; copie
  locale a917fb27 en base locale.
  Branche distante `fix/integration-locals-session` laissée sur GitHub.
- **Worktree / branche** : `../ubumaths-wt-demi-droite` (HEAD détachée sur `origin/main`, pour la clôture).

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
- Relecture `code-reviewer` (Opus) : aucun bloquant ; un important corrigé (intervalle borné : la borne
  active suivie par son indice changeait de borne quand la case relue trie les bornes → suivie par sa
  graduation) ; deux mineurs corrigés (côté grisé sans borne ; juge : crochet fermé sur l'infini refusé).
  Tests ajoutés, vus rouges. Variable `state` renommée (`$state` lu comme un store au typecheck).
- #2309 mergée le 2026-11-03 (CI : un job relancé, erreur d'outillage hors tests).

## PR 4 — 1er modèle : représenter les solutions de ax ⩾ b (3-014)

Relevé MCP du 2026-11-03 : 3-014 a un modèle, 24aff7b0 « Résoudre une inéquation ax ⩾ b » (publié,
Calcul littéral › Inéquations › ax ⩾ b, niveau 1, réponse en inégalité « x > 4 »). Le niveau 2 de la
catégorie est libre.

- **Modèle** : « Représenter les solutions d'une inéquation ax ⩾ b » · point **3-014** · catégorie
  Calcul littéral › Inéquations › ax ⩾ b, **niveau 2** · 3e.
- **Énoncé** : « Résous l'inéquation $3x \geqslant 12$, puis représente ses solutions sur la droite
  graduée. » + ` ```line ` à `representer:` (arrows, pas de 1).
- **Fenêtre** : 10 unités, la borne **pas au milieu** (début = k − d, d tiré de 2 à 8) : la fenêtre ne
  donne pas la borne.
- **Variations** (mêmes tirages que 24aff7b0) : v1 a > 0, b = a·k, les quatre sens (3x ⩾ 12 →
  [4 ; +∞[) ; v2 a < 0 (−2x < 6 → ]−3 ; +∞[) ; v3 selon Q6.
- **Réponse** : la droite seule (une case), cf. Q5. Phrases d'erreur du geste déjà écrites (PR 2).
- **Corrigé** : la résolution de 24aff7b0 (diviser par a, sens qui change ou non, large / stricte), puis la
  droite dessinée (`segments:` avec crochet), « le crochet est tourné vers les solutions quand la borne
  est comprise ».
- **testSpecs** : justes + erreurs typiques — sens non changé pour a < 0 (mauvais côté), crochet faux
  (large/stricte), mauvaise borne (soustraction : 9 pour 3x > 12).
- **Fichiers** : `docs/wip/questions/lot-3-representer.py` → `scripts/questions/3-representer/`.
- **Prod** : le geste n'est pas en prod → brouillon (David : `create-questions --publier`), migration
  nœud + tag, **publication seulement après un `deploy:prod`** (David).
- **Question d'accès** de la migration de rangement : personne ne lit rien de nouveau ; un modèle rangé
  sous un nœud existant et tagué 3-014, lu comme les autres modèles.

### Questions à David

- **Q5 — Une case ou deux ?** Droite seule (l'inégalité est déjà le niveau 1), ou case « x ⩾ 4 » puis
  droite. Reco : **droite seule**.
- **Q6 — Borne en fraction (3x ⩾ 2 → x ⩾ 2/3) ?** Reco : **oui, a = ±3 seulement**, droite graduée en
  tiers sur 4 unités, entiers seuls étiquetés (12 graduations, lisible à 390 px). Autre choix : bornes
  entières seules.

### Décisions (David, 2026-11-03, « je suis tes recos »)

- Q5 : droite seule. Q6 : bornes en fraction, a = ±3, droite en tiers sur 4 unités.

### Écrit (2026-11-03)

- `docs/wip/questions/lot-3-representer.py` → `scripts/questions/3-representer/01-representer-solutions-inequation.json`
  (v3 : borne n/3, n = 3q + m, m ∈ {1, 2}, fenêtre q − d … q − d + 4, d ∈ {1, 2} ; côté r = s si a > 0,
  s + 2 modulo 4 sinon).
- `create-questions` en simulation : 14 specs vertes ; balayage 300 tirages × 3 variations (borne dans la
  fenêtre, réponse attendue jugée juste, corrigé sans `{{`) ; `sonde-horloges` : 600 blocs, 0 problème.
- Base locale (43c75d10) : joué dans l'aperçu admin — 7x < 35, mauvais côté → « Les solutions sont de
  l'autre côté de 5. », faux ; −3x < 7, borne −7/3 exclue, côté droit → juste ; corrigé lu (division,
  crochet, droite). Pas vu à 390 px (fenêtre Chrome restée large) : affichage déjà vu à 390 px en PR 1.
- Corrigé : « x > 7/(−3) » écrit tel quel avant la simplification, comme 24aff7b0.

### Rangement (#2336, 2026-11-03)

- Brouillon créé en prod par David : 06601c87. Relevé `etat-prod-2026-11-03-3e-representer/`, migration
  `20261103155640_questions_3_representer_rangement_tags` générée par `lot-rangement-3-representer.py`
  (gabarit lot 2 de la 3e), test `questions-3-representer-rangement-tags.test.ts` : 17 verts ; sans le corps
  de la migration, 5 branches d'échec rouges et le bloc nominal en échec.
- `security-auditor` : aucun bloquant ni important. Mineur corrigé : phrase d'accès (le brouillon est lisible
  par le prof ET l'admin, pas l'admin seul). Mineur noté, hors chantier : `question_template_points` lisible
  de tout compte connecté (`using (true)`), identifiants seuls, déjà vrai pour tous les tags.
- `db:migrate` lancé depuis le worktree posé sur `origin/main` (dépôt principal bloqué par le travail d'une
  autre session ; `supabase/.temp/project-ref` copié pour le lien) ; vérifié en prod.
- Page à cocher : écrite, mais ` ```line ` non dessiné → remplacée par l'aperçu admin.
- Joué par David dans l'aperçu de prod puis publié (`publier-lot --publier`) ; MCP : `published`.

## PR 5 — 2-251 déjà couvert, droite graduée au corrigé de |x| < k (2026-11-03)

- Relevé MCP : 2069ac7e « Représenter un intervalle sur la droite graduée » (2-251, niv. 4, publié) a trois
  variations à `representer:` : `[a, +inf[` ou `]a, +inf[`, `]-inf, a]` ou `]-inf, a[`, borné à crochets au
  choix. Le contournement « case choix entre droites » du relevé initial n'existe plus.
- Dernier contournement : 80a87e34 « Résoudre |x| < k » (2de, publié), corrigé de la variation 1 sur une
  ` ```courbe ` seule. Décision de David (« tes recos ? » puis go) : **ajouter** la droite graduée, garder la
  courbe. Étape insérée après la première : `segments:` ]−k ; k[, [−k ; k], ou les deux demi-droites.
- Voie : `update-published-questions.ts`, nouveau lot `valeur-absolue-droite-2de` (instantané exporté de la
  prod, commité avant la correction : le diff de la PR est la correction). `checkTemplate` vert sur l'instantané
  et sur la correction ; bloc lu sans erreur pour s = 0..3 et k = 1..6.
