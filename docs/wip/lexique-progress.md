# Lexique mathématique et mots cliquables — progression

Dictionnaire : `src/lib/data/math-dictionary-fr.ts` (fichier TS statique, pas en base). Usages
actuels : `/glossaire` et Mathémo. ≠ le lexique du lore (`src/lib/config/lore.ts`).

## Décisions validées par David (2026-10-08)

1. **Repérage mixte** : automatique, mais première occurrence seulement, soulignement pointillé
   discret, liste fermée de mots jamais repérés (nombre, calcul, résultat, valeur…) ; marquage
   d'auteur `[…]{.def}` pour forcer / exclure / trancher un homonyme ; homonyme non tranché → la
   popup montre les deux sens ; formes conjuguées listées à la main (`forms`), pas de moteur.
2. **Stockage** : en base avec page d'administration (David édite), **après** la relecture faite
   dans le fichier ; tout le code passe par une seule fonction de chargement. Niveau d'une
   définition = registre de langue, pas appartenance au programme → pas de conflit avec l'ADR 0020.
   Lien aux points du programme : seulement si une page en a l'usage (règle de l'ADR 0019).
3. **Niveau de lecture** : élève → son niveau ; prof → niveau du contenu ; anonyme → niveau du
   contenu, sinon la définition la plus simple ; `/glossaire` garde son sélecteur.
4. **Contextes** : définitions disponibles en entraînement, flash-cards, révision, documents,
   corrections ; masquées en évaluation notée et course aux nombres ; pas de repérage automatique
   sur une question de cours ou une carte de cours (marquage d'auteur possible).
5. **Traces** : rien côté serveur ; « Mon lexique » éventuel en `localStorage`.
6. **Ordre** : lot 0 données → lot 1 (lien direct `/glossaire?terme=`, définition en fin de partie
   de Mathémo) → lot 2 mots cliquables (d'abord visibles par le prof seul) → lot 3 base + admin →
   ensuite paquet de révision « vocabulaire », synonymes / autocomplétion des cases texte, lexique
   en fin de fiche PDF, mot du jour Mathémo, tuteur branché sur le dictionnaire.

## Sources officielles (BO)

- **Annexes du BO** dans `~/Downloads` (fournies pour l'arbre des notions) : cycle 2 (Annexe 4,
  par année CP/CE1/CE2), cycle 3, cycle 4 (Annexe 2, BO n° 10 du 5 mars 2026, par année), 2de,
  1re spé, Tle spé, Tle comp., 1re ens. sci., 1re techno, Tle techno ; livrets d'accompagnement
  CP → 6e. **Manque l'annexe Maths expertes** (texte collé par David lors de l'arbre, plus sur
  disque) — non bloquant : les 153 points T_EXP sont en base.
- **Les 1 900 points du programme** (grain BO, libellé exact, par niveau) sont dans les migrations
  `supabase/migrations/*_seed_curriculum_points_*.sql` — lisibles sans toucher à la prod.
- Extraction texte : `pdftotext -layout` (dans le scratchpad, non versionné).

## Mesures (2026-10-08 / 09)

**Dictionnaire** (script sur le fichier) : 417 entrées = 367 principales + 50 dérivées ; 13
niveaux CP → T_EXP ; 23 thèmes. Définitions par niveau : **0 terme** en a plus d'une. Exemples :
4 termes ; histoire : 7 ; images : 0.

- **89 termes principaux sur 367** n'ont leur seule définition qu'à un niveau **postérieur** à
  leur niveau d'apparition → fiche vide pour un lecteur de ce niveau (lecture du code :
  `resolveGradedField` + `{#if definitions.length > 0}` dans `glossaire/+page.svelte`). 116 autres
  ont une définition **antérieure** au terme.
- **25 entrées sans accents** : unite, partie entiere, partie decimale, dixieme, centieme,
  millieme, fractions egales, distance a zero, expression litterale, distributivite, monome, degre,
  système d'equations, resoudre, capacite, racine carree, representer, homothetie, trapeze, aligne,
  pave, quadrilatere, regle, thales, synthese.
- Doublons : solution / solution (équation) ; terme / terme (suite) ; diviseur × 3.

**Comparaison au BO** (termes principaux ; recherche du mot entier, pluriel s/x, dans les 1 900
points ; à défaut, texte intégral des annexes et livrets) : accord **102** · dictionnaire plus tard
que le BO **77** · plus tôt **108** · absents des points **80** (dont 25 trouvés dans le texte
intégral ; les 55 restants = surtout accents manquants et chiffrement, hors programme).
⚠️ Candidat, pas verdict : homonymes du BO (« en fonction de », « suite orale », « par rapport
à », « symboles de base »). Écarts réels repérés : fraction / numérateur / dénominateur dès le
**CE1** (dict. CM1) ; solides (cube, cône, cylindre, pavé, face) dès le **CP** ; probabilités
(issue, expérience aléatoire, équiprobabilité) dès le **CM1** ; factoriser dès la **5e**
(k(a + b)) ; ensembles (intersection, réunion, ensemble vide) et contraposée en **4e** ; PGCD
absent du collège (première mention : T_EXP).

- **15 points « vocabulaire »** du BO citent 42 mots entre guillemets ; **24 absents** du
  dictionnaire : égal à, supérieur à, inférieur à, compris entre … et … (CE1), impossible,
  possible, certain, probable, peu probable, une chance sur deux (CM1), en fonction de (5e),
  condition nécessaire / suffisante (1re), équivalence logique (1re techno).
- **66 points « Définir / connaître la définition »** : ils fixent le niveau où une définition
  devient exigible (cercle et disque comme ensembles de points en 6e, médiatrice 6e, nombre
  rationnel 4e, racine carrée 4e, image / antécédent 3e, fonctions linéaires / affines 3e…).

**Usage en prod** (MCP lecture seule ; 640 modèles publiés, dont 564 avec une correction ;
texte des `statement` + `exercise_instruction`, et chaînes de `correction` ; mot entier, pluriel
s/x ; nombre de modèles) : **183 termes ou formes rencontrés, 139 dans les énoncés**. Consignes :
calcule 229, résous 28, réduis 21, convertis 17, décompose 15, détermine 14, développe 11,
simplifie 10, factorise 9. **87 termes** à ≥ 5 énoncés ou ≥ 10 corrections = lot de relecture
prioritaire. Bruit : nombre 68 / 151, forme 49, plus 24 / 50, chiffre 12 / 70.

## Relecture contre les programmes officiels (2026-10-09)

Demandée par David (« relis les programmes officiels pour vérifier le dictionnaire »). Six agents,
textes du BO lus en entier, citations vérifiées par script. **Synthèse :
[lexique/relecture-bo.md](lexique/relecture-bo.md)** · détail terme par terme :
[lexique/relecture-bo-detail.md](lexique/relecture-bo-detail.md) · données :
[lexique/relecture-bo.json](lexique/relecture-bo.json) (`niveauBO`, citations, jugements par
portée, manquants).

- **Cause racine trouvée** : le niveau des définitions est décalé d'une entrée (367 / 374),
  depuis le refactor `b5ad54933` du 2026-04-19. Les 89 + 116 anomalies de niveau mesurées plus
  haut en découlent : correction mécanique, pas 205 corrections de contenu.
- Niveaux : 145 en accord, 108 trop tard, 89 trop tôt, 25 absents des programmes de la voie
  générale. Définitions : 131 termes avec au moins un défaut (14 fausses, 10 circulaires, 73
  inadaptées au niveau, 48 trop étroites ou trop larges, surtout des homonymes). 471 expressions
  du BO absentes du dictionnaire.
- **Élèves en prod** : 6e 37 · `1_GEN` 19 · T_SPE 17 · 2de 4 · 1_SPE 1 ; aucun du CP au CM2.
  `1_GEN` a pour prérequis `2` et aucun terme : ces 19 élèves ne voient que le vocabulaire
  jusqu'à la 2de.

## Lot 0 — spécification

Comportements testés (doivent échouer avant correction des données) :

1. **Définition visible à l'apparition** : pour tout terme principal et tout niveau ayant accès à
   son niveau, au moins une définition s'affiche. Aujourd'hui : 89 échecs.
2. **Première définition au niveau du terme** (ni avant, ni après) ; les suivantes rangées par
   niveau croissant.
3. **Unicité à l'accent et à la casse près** : nom + sens.
4. **Formes** : chaque forme désigne une seule entrée, ou plusieurs seulement si ce sont des
   homonymes déclarés (même nom, sens distincts).
5. **Consignes reconnues** : calcule, résous, réduis, développe, factorise, simplifie, détermine,
   décompose, convertis, encadre, exprime sont la forme d'un terme.
6. **Mots jamais repérés** : liste fermée, chaque mot de la liste est bien un terme (pas de
   faute de frappe muette).

Travail sur les données :

- D1 niveaux d'apparition alignés sur le BO (script propose, revue terme par terme, liste des cas
  disputés à David) ; D2 accents, doublons, définitions circulaires (racine), renvois trop étroits
  (simplifier, décomposer) ; D3 vocabulaire cité par le BO et verbes manquants (déterminer,
  exprimer, encadrer) ; D4 définitions par niveau ancrées sur les 66 points « Définir » ;
  D5 relecture par David des 87 termes prioritaires.

Questions tranchées le 2026-10-09 — David a suivi les recommandations de Claude (« je te
suis ») :

- Q1 **Niveau d'apparition** = première mention au BO (cercle : reconnaître au CE1) ; la
  définition exigible (6e) s'ajoute comme deuxième définition. La popup ne montre que la
  définition du niveau du lecteur ; `/glossaire` montre la progression.
- Q2 **`1_GEN`** (19 élèves) traité dès le lot 0 ; voie techno et Tle comp. plus tard (aucun
  élève).
- Q3 **Termes absents des programmes** gardés (rotation, homothétie, PPCM, hypoténuse…) ;
  « shisma » retiré.
- Q4 **Manquants du lot 0** : vocabulaire et définitions exigés par le BO aux niveaux des élèves
  actuels (CP → 6e, 2de, `1_GEN`, T_SPE) et sens manquants des homonymes ; le reste par lots.

## Découpage du lot 0

- **0a — mécanique, sans choix pédagogique** (branche `fix/lexique-niveaux-definitions`,
  worktree `../ubumaths-wt-lexique`) : niveau de chaque définition remis à celui de son terme
  (204), 25 accents + 3 majuscules de noms propres, « shisma » retiré ; tests 1 à 3 ci-dessus +
  « exemple jamais avant son terme ». ✅ Livré #979 (2026-10-09), avec 10 synonymes accentués et « tangeant » retiré.
- **0b — niveaux** : appliquer `niveauBO` de `relecture-bo.json` ; quand le BO emploie tôt un
  sens plus simple, ajouter une définition de niveau inférieur au lieu de déplacer le terme ;
  liste des cas disputés à David. ⏳ Proposition prête (2026-10-09) :
  [lexique/lot0b-niveaux.md](lexique/lot0b-niveaux.md) — 221 termes, 56 nouvelles définitions
  simples, 8 cas tranchés par David (« Ok pour 1 », 2026-10-09 : ses recommandations suivies) ; décisions machine-lisibles dans `lexique/lot0b-decisions.json`
  (clés = rang de l'entrée dans le dictionnaire du 2026-10-09, avant le retrait de « shisma » et
  « tangeant »). Les 56 nouvelles définitions validées sans correction par David le 2026-10-09 (page à cocher
  https://claude.ai/artifact/YH7RFgXAWkohW6xBPhKSKx, base `avis` : 56 « ok »). ✅ Livré #982 (2026-10-09, branche
  `feat/lexique-niveaux-bo`) : 185 termes et 15 dérivés changent de niveau ; test « niveaux validés
  du lot 0b » sur la copie figée `tests/fixtures/lexique/niveaux-lot0b.json` (200 écarts sur l'ancien
  dictionnaire). À l'application, « construire » suit « construction » (CM1) et cinq renvois faux de
  dérivés sont corrigés (ordonner, croissant, décroissant → ordre ; décomposer → décomposition ;
  simplifier → simplification) : un dérivé ne précède jamais son terme (test).
- **0c — définitions** : 14 fausses et 10 circulaires d'abord, puis homonymes (sens manquants,
  entrées séparées : cube, base, racine…) et définitions inadaptées ; relecture de David par
  lots. ✅ Validé par David le 2026-10-09 (115 OK, « inconnue » corrigée par lui) et livré #984 (branche `feat/lexique-definitions`) ; test « définitions validées du lot 0c, au mot près » sur la copie figée `tests/fixtures/lexique/definitions-lot0c.json` (142 écarts sur l'ancien dictionnaire avec la copie du 0b mise à jour). Proposition : [lexique/lot0c-definitions.md](lexique/lot0c-definitions.md) — 116 entrées (16 fausses, 11 circulaires, 54 sens, 35 niveau), décisions dans `lexique/lot0c-decisions.json` ; relecture par David sur https://claude.ai/artifact/9jvhVk9fdx75xy3aWDbVAy (base `avis`, documents `t<rang dans la liste>`).
- **Glossaire, renvois** (décidé par David le 2026-10-09, recommandation de Claude) : « Forme dérivée de X »
  devient « Voir : X », et un renvoi sans définition propre affiche celle de X au niveau choisi.
  ✅ Livré #986.
- **0d — manquants** (Q4), `1_GEN`, formes conjuguées des consignes et liste des mots jamais
  repérés (tests 4 à 6), utiles au lot 2. ✅ Lot 0d-1 validé par David le 2026-10-09 (87 OK, « racine » dans sa version) et livré #991 (branche `feat/lexique-mots`) — section « AJOUTS DU LOT 0d » du dictionnaire, test « mots ajoutés au lot 0d, au mot près » (88 écarts sur l'ancien dictionnaire). Proposition : 88 mots (13 homonymes, 23 demandés par le BO, 47 pour les classes actuelles, 5 synonymes) — [lexique/lot0d-mots.md](lexique/lot0d-mots.md), décisions `lexique/lot0d-decisions.json` ; relecture par David sur https://claude.ai/artifact/V9eqVHsZcWXJJR9Mq8bEJi (base `avis`). Les formes conjuguées et les mots jamais repérés viendront dans un lot à part, avant le lot 2.

## Lot 0e — verbes de consigne et mots jamais soulignés

✅ Validé par David le 2026-10-09 (35 fiches, confirmé dans la conversation) et livré #994 (branche `feat/lexique-consignes`) : champs `forms` et `autoLink` dans `MathTerm`, tests « formes uniques », « consignes de prod reconnues », « liste fermée des mots exclus ». Corrigé à la revue : « chiffre (cryptographie) » exclu aussi (l'exclusion vaut pour le mot), « décomposer » et « ordonner » passent au CP comme leurs cibles et le BO. **Pour le lot 2** : comparer des mots entiers et décider du sort des accents (« tracé » ≠ « trace », « ordonnée » ≠ « ordonne »). Proposé le 2026-10-09 (demande de David : ajouter « déterminer » et « exprimer », chercher les autres consignes dans le BO) : [lexique/lot0e-consignes.md](lexique/lot0e-consignes.md) — 8 verbes définis, 13 entrées qui reçoivent leurs formes conjuguées, 14 mots jamais soulignés ; relecture par David sur https://claude.ai/artifact/65y4jubu5hQ2YQxLxdgqab (base `avis`). Champs prévus dans `MathTerm` : `forms` (formes reconnues) et `autoLink: false` (jamais souligné automatiquement).

## Lot 0f — mots manquants, synonymes, homonymes (demandé par David le 2026-10-09)

« On fait ce qui est en attente » : orthographe « évènement », étiquettes des anciens homonymes,
mots manquants. ✅ Validé par David le 2026-10-09 (177 fiches « OK », toutes enregistrées par la page,
vérifiées une à une) et livré #995 (branche `feat/lexique-lot0f`) : section « AJOUTS DU LOT 0f » du
dictionnaire, test « lot 0f au mot près » (182 écarts sur l'ancien dictionnaire), test « chaque entrée
d'un mot à plusieurs sens porte une étiquette » (13 sur l'ancien), copie figée
`tests/fixtures/lexique/mots-lot0f.json` ; les copies des lots 0b à 0e sont mises à jour là où le 0f
renomme ou complète. Relecture sur https://claude.ai/artifact/Ts1SdTAhUphzHjCqP6pqzy (base `avis`,
documents `t<id>`) ; proposition [lexique/lot0f-mots.md](lexique/lot0f-mots.md), décisions
`lexique/lot0f-decisions.json`.

- **Mathémo** (livré avec #995) : le clavier du jeu n'a que a–z ; les mots à trait d'union
  (« demi-droite », déjà sur main, et 5 nouveaux) ne sont plus tirés au sort (`dictionary-words.ts`).
  L'ancien `games/mathemo/words.ts` (liste codée en dur, importée nulle part) a été supprimé par
  #997 : ses 271 mots sont déjà au dictionnaire, sauf les coquilles « shisma » et « tangeant ».

- **138 mots** rédigés par trois agents (primaire 34, collège 43, lycée 61) à partir du tri des 269
  restants, puis relus : niveaux vérifiés dans le BO, notes reprises. Mes ajustements : « caractère
  (statistique) » au CE1 (au CP le mot n'est que dans le texte pour le professeur), « épreuve » en 4e
  (le CM2 dit « étapes » aux élèves), « liste » prend le sens « informatique », « angles alternes
  internes » sans trait d'union comme au BO. Niveaux à confirmer par David : « repère orthonormé » et
  « combinaison linéaire » en 2de (notion nommée autrement au BO de 2de), « perspective cavalière » au CE1.
- **Niveau 3e des « classes »** : seuls les attendus et repères de 2019-2020 (`attendus-3`,
  `reperes-c4`) en parlent ; le programme de cycle 4 de 2026 non. On garde la 2de.
- **3 renvois** (suite minorée, suite bornée → suite majorée ; extrapolation → interpolation),
  **13 entrées existantes reçoivent des synonymes** (nombre rationnel, arbre pondéré, droite graduée…).
  Refusés : « partie » (« une partie » de jeu, « Partie A »), « horaire » (« sens horaire »).
- **Homonymes** : 12 étiquettes (carré, cube, base → puissance ; image → fonction ; tangente →
  courbe…) ; « diviseur » sans étiquette, doublon de « diviseur (arithmétique) », supprimé. Les renvois
  « solution », « racine », « complémentaire » restent sans étiquette (le mot seul vise le sens courant).
- **Définitions ajoutées** : boucle (2de, for/while), cosinus et sinus (1re spé : cercle trigonométrique ;
  Tle spé : parité, période).
- **Jamais soulignés, proposés** (mesuré sur les énoncés publiés le 2026-10-09) : « seconde (durée) »
  (dérivée seconde, classe de Seconde), « classe (statistique) » (4 classes d'élèves sur 4),
  « liste (informatique) » (3 listes de dénombrement sur 3).
- **Mécanique** : « évènement », accents de « opposé » et « hypoténuse » dans les formules,
  2e définition de « minute » au CM2, « repère » perd le synonyme « repère orthonormé ».
- **Page à cocher durcie** après la perte du lot 0e : file d'écriture unique espacée, nouvel essai
  automatique, bandeau rouge tant qu'une réponse attend, « tout est relu » seulement quand le serveur
  a toutes les réponses. Testée avec une base factice qui refuse une écriture sur deux.
- **Question ouverte (architecture, à poser à David)** : un mot commun à la 1re spé et à la 1re
  générale (« seuil », « fonction polynôme du second degré », « évènements indépendants ») n'est
  visible que d'une filière : `1_GEN` et `1_SPE` ne se voient pas l'une l'autre (19 élèves en `1_GEN`).
- **Fournée suivante** (non rédigés) : repère orthogonal, moyenne pondérée, diagramme en barres,
  inégalité de concentration, connecteur logique, ensemble des solutions, position relative, plan
  médiateur, suites adjacentes, succès, bijection, identité, formule de König-Huygens, méthode des
  rectangles, droites remarquables, dénominateur commun. Le reste des 269 est écarté (vocabulaire
  courant : « long », « lourd », « gauche »…).

## Lot 0g — mots partagés entre les filières de 1re

✅ Décidé par David le 2026-10-09 (option « 1 » : une entrée peut appartenir à plusieurs niveaux ;
« oui » aux comportements et à la liste ; « n'oublie pas le niveau 1_TECHNO ») et livré #996 (branche
`feat/lexique-filieres`). `sharedWith` sur une entrée ou une définition ; `canRead` /
`isTermVisibleTo` s'appuient sur la hiérarchie des niveaux (Tle comp. suit la 1re générale, Tle
techno la 1re techno). 25 entrées + 7 définitions partagées ; filtre « 1ère technologique » dans le
glossaire ; 1re générale et 1re techno dans le choix du niveau de Mathémo. Spécification et liste :
[lexique/lot0g-filieres.md](lexique/lot0g-filieres.md) ; copie figée
`tests/fixtures/lexique/filieres-lot0g.json`. Garde-fous : définition lisible dans chaque filière,
renvoi vers une cible visible, partage seulement avec une filière parallèle de la même année.

- **Suite (#997, recommandations validées par David, « go »)** : le badge de niveau du glossaire
  montre le niveau où le lecteur du filtre rencontre le mot (`gradeMetBy`) ; filtre Tle maths
  complémentaires et Tle techno ; ancien `games/mathemo/words.ts` supprimé.
- **Reste** : « fonction exponentielle » demande une définition propre à la 1re générale
  ($x \mapsto a^x$) — homonyme « fonction exponentielle (de base $a$) » prévu dans la prochaine
  fournée de mots, étiquettes à soumettre à David.

## Lot 2 — mots cliquables

✅ Spécification validée par David le 2026-10-09 (« je valide », avec ses deux choix : synonyme
« premier » retiré, « expression » dans la liste fermée) et livré #998 (branche
`feat/lexique-mots-cliquables`) : [lexique/lot2-mots-cliquables-spec.md](lexique/lot2-mots-cliquables-spec.md),
notes et revues dans [lexique/lot2-progress.md](lexique/lot2-progress.md).

- Repérage `src/lib/lexicon/` (positions `TextNode.terms`, sans découper l'arbre), dictionnaire chargé
  à la demande, marquage `[mot]{.def}` / `{.def=…}` / `{.nodef}`, fiche en popover (dialog
  accessible), niveau de l'élève sinon le plus petit de la question, jamais en évaluation notée.
- **QCM** : pas de mot cliquable dans les réponses (un choix est un bouton ; un clic sur le mot
  envoyait la réponse). **Décidé par David le 2026-10-09** (« ok » à la recommandation) : on garde
  ainsi, l'énoncé du QCM a ses mots cliquables, pas les réponses.
- `HintReference.svelte` avait le même défaut de focus que la fiche (fermeture par un clic dans un
  champ → focus renvoyé au bouton) : corrigé #999 (validé par David, « ok »), fonction commune
  `components/markdown/outside-focus.ts`. À vérifier à la main sur tablette iOS : le `focus()`
  programmatique ouvre-t-il le clavier ?

## Reprise

Scripts d'analyse dans le scratchpad (non versionnés) : copie du dictionnaire avec imports
neutralisés, `node --experimental-strip-types`, extraction des points par regex sur les seeds.
À refaire dans le worktree du lot 0 si besoin.
