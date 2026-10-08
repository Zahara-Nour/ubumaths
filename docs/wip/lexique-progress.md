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

## Lot 0 — spécification proposée (⏳ en attente de validation de David)

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

Questions ouvertes :

- Q1 **Niveau d'apparition** = première mention au BO (cercle : reconnaître au CE1), la
  définition exigible venant plus tard (6e) comme deuxième définition ? Et la popup montre-t-elle
  seulement la définition du niveau du lecteur (mode `discriminant`) ?
- Q2 **Voies techno / Tle comp.** : le dictionnaire ne connaît que la voie générale ; un élève
  `1_TECHNO` ne voit rien de `1_SPE`.

## Reprise

Scripts d'analyse dans le scratchpad (non versionnés) : copie du dictionnaire avec imports
neutralisés, `node --experimental-strip-types`, extraction des points par regex sur les seeds.
À refaire dans le worktree du lot 0 si besoin.
