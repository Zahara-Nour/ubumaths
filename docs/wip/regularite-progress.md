# Chantier `regularite` — régularité de travail (P5) : grille du prof et Palotin

Ouvert le 2026-11-12, juste après `formes-de-serie` (Q-C). Besoin validé par David le 2026-11-11 :
[`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de suivi
validés », P5. Phase 0 : **rien de codé**.

## Reprendre ici

_Mis à jour le 2026-11-12, après #2595._

- **État** : A (#2587), B1 (#2589), B2a (#2593, migration appliquée en prod) et B2b (#2595, moments de la semaine) mergées ; reste **B3** (question longtemps ratée enfin réussie, sur la carte de fin de série ; R5 : modèle raté ≥ 3 fois sur ≥ 7 jours, puis réussi) · **Prochaine action** : phase 0 technique de B3 (où lire l'historique d'un modèle, carte de gain) · **En attente de David** : rien · **Pièges en cours** : la présence se relit après un gain ; « semaine fêtée » = `student_last_visits.week_celebrated_on`, serveur seul · **Worktree / branche** : `../ubumaths-wt-regularite` (branche `feat/regularite-moments` mergée, à nettoyer) ; nouvelle branche depuis `origin/main` pour B3

## Besoin validé (rappel, David, 2026-11-11)

- **Prof** : grille élève × semaine depuis la rentrée de septembre, vacances comprises. Par semaine,
  nombre de **jours actifs** (jour actif = au moins 5 réponses en formes autonomes, heure de Paris),
  sans dire lesquels. Heatmap **à une seule couleur** (couleur d'accent ; 0 vide, 1 très clair,
  2-3 moyen, 4+ soutenu ; légende ; survol = palier, jamais le nombre exact ; repère des vacances ;
  mode sombre). Activité = travail de soi-même, pas les contrôles assignés.
- **Élève : le Palotin**. Il ne parle qu'après une activité, jamais d'une absence ; aucune série
  perdue ; aucune comparaison ; aucune notification hors du site ; retour après une pause accueilli
  sans dire sa durée. Moments : 1re activité de la semaine, retour après une pause, 3/5/10 semaines
  actives d'affilée, notion acquise, question longtemps ratée enfin réussie, série terminée quel que
  soit le score.

## Constats vérifiés (2026-11-12)

- **Widget C** de l'analyse de classe (`ClassActivityHeatmap.svelte`, `getClassActivityHeatmap`) :
  élève × **jour** (30 j), **nombre** de traces, alerte après 5 jours sans activité. C'est la carte
  que P5 juge trop précise.
- **Constance Royale** (`buddy-constance.ts`, `docs/systeme/buddy-palotins.md` § Système de streak,
  validée le 2026-10-18) : semaines tenues d'affilée (3 jours où l'élève a gagné des pansées, jour
  UTC) ; une semaine ratée la **remet à 0** avec une réplique `streak_lost` ; bonus d'XP aux paliers
  4/8/16 ; affichée à l'élève (« Constance Royale : N semaines ») et au prof (« sem. »).
- **Retour après une longue absence** (même doc, 2026-10-21) : 21 jours sans visite → le Palotin est
  **triste** et dit « tu m'as manqué » (contexte `long_absence`).
- Déjà en place : réactions en séance (5 bonnes d'affilée, 3 erreurs, #2550) ; gain du Palotin en
  fin de série.
- **Vacances** : par école et par année scolaire (`school_years.start_date`, `school_holidays`), déjà
  saisies dans « Organisation d'une école ».
- **Traces en prod depuis le 1er septembre** : 101, toutes sans lieu (avant `formes-de-serie`),
  2 élèves. On ne sait plus dire lesquelles viennent d'un contrôle.

## Comportements de phase 0 — à valider

### Prof : grille de régularité

- **N1** : dans l'analyse d'une classe, une grille « Régularité » : une ligne par élève actif de la
  classe, une colonne par semaine (lundi → dimanche, heure de Paris), de la semaine de la rentrée
  (`start_date` de l'année scolaire active de l'école) à la semaine en cours.
- **N2** : cellule = palier de jours actifs (0 vide, 1, 2-3, 4+), une couleur d'accent en quatre
  intensités ; légende ; survol ou appui = « 2 à 3 jours actifs », jamais le nombre ni les jours.
  **Le serveur n'envoie que le palier**, jamais le compte ni les dates.
- **N3** : jour actif = au moins 5 traces le même jour (heure de Paris), aux lieux Flash-cards,
  Saisie, Contrôle blanc, Course aux nombres, révision ; ni contrôle (`evaluation`) ni trace du prof.
- **N4** : semaines de vacances (une semaine dont au moins un jour est dans `school_holidays`)
  marquées d'un repère dans l'en-tête ; elles se colorent comme les autres si l'élève a travaillé.
- **N5** : mode sombre ; téléphone : défilement horizontal de la grille seule, noms d'élèves fixés.
- **L1** : classe sans année scolaire active → grille depuis le 1er septembre, sans repère de vacances.
- **L2** : élève arrivé en cours d'année → semaines d'avant vides (comme 0).
- **L3** : traces sans lieu (avant `formes-de-serie`) : voir R6.
- **E1** : chargement en échec → message dans le cadre de la grille, le reste de la page s'affiche.

### Élève : le Palotin

- **N6** : chaque moment est une réplique joyeuse ou fière, dite **après** une activité (jamais à
  l'arrivée sur une page sans activité), dans la maison ou en passage important, une seule fois.
- **N7** : moments : 1re activité de la semaine ; retour après une pause (sans durée) ; 3, 5 et 10
  semaines actives d'affilée ; notion acquise ; question longtemps ratée enfin réussie ; série
  terminée, quel que soit le score.
- **N8** : jamais : comparaison avec d'autres élèves, série perdue, absence, notification hors du site.
- **L4** : élève sans Palotin → rien. Élève hors classe → mêmes moments (heure de Paris, pas de vacances).

## Questions à trancher (avant de coder)

- **R1 — Constance Royale** (contredit « aucune série perdue ») : (a) **retirer la réplique
  `streak_lost`** et ne plus montrer la remise à 0, en gardant le bonus d'XP (recommandé) ;
  (b) la garder telle quelle ; (c) la remplacer par les « semaines actives » de ce chantier.
- **R2 — « Tu m'as manqué »** (triste, parle de l'absence) : (a) **le remplacer par le moment
  « retour après une pause »** : réplique joyeuse, dite après la 1re activité et non à l'arrivée
  (recommandé) ; (b) garder les deux.
- **R3 — Widget C** (jour × élève, nombres) : (a) **remplacé par la grille de régularité**
  (recommandé, P5) ; (b) gardé à côté.
- **R4 — « Semaine active »** pour 3/5/10 d'affilée : (a) **au moins un jour actif** dans la semaine,
  les semaines de vacances ne coupent pas le compte (recommandé) ; (b) au moins 2 jours actifs.
  Compte coupé = remis à zéro en silence.
- **R5 — Définitions** : notion acquise = la notion passe au badge ✅ (badge de mémoire des notions) ;
  question longtemps ratée = modèle raté au moins 3 fois, sur au moins 7 jours, puis réussi (trace
  « corrigé »). D'accord ?
- **R6 — Traces sans lieu** (101 en prod, 2 élèves, avant le 2026-11-12) : (a) **comptées comme
  travail autonome** (recommandé : un contrôle est indiscernable, l'effet est négligeable) ;
  (b) ignorées (semaines vides avant le déploiement).
- **R7 — Découpage** : PR A grille du prof (lecture seule, sans migration a priori : le prof lit déjà
  les traces de ses élèves, on lui en montre moins) ; PR B Palotin (moments, R1, R2). D'accord ?

## Décisions (David, 2026-11-12)

David : « Je valide tes recos ».

- **R1 = a** : la réplique `streak_lost` est retirée et la remise à 0 de la Constance Royale n'est plus montrée ; le bonus d'XP reste.
- **R2 = a** : « tu m'as manqué » (`long_absence`, triste, à l'arrivée) est remplacé par le moment « retour après une pause » : réplique joyeuse, après la 1re activité, sans durée.
- **R3 = a** : le widget C (`ClassActivityHeatmap`) est remplacé par la grille de régularité.
- **R4 = a** : semaine active = au moins un jour actif ; les semaines de vacances ne coupent pas le compte ; compte coupé = remis à zéro en silence.
- **R5 = oui** : notion acquise = passage au badge ✅ ; question longtemps ratée = modèle raté ≥ 3 fois sur ≥ 7 jours, puis réussi.
- **R6 = a** : traces sans lieu comptées comme travail autonome.
- **R7 = oui** : PR A grille du prof (lecture seule, sans migration a priori) ; PR B Palotin (moments, R1, R2).

Comportements N1-N8 / L1-L4 / E1 : **validés par David le 2026-11-12** (« Je valide »).

## PR A — grille du prof (2026-11-12)

- `src/lib/server/stats/class-regularity.ts` : fonctions pures (`weekStartOf`, `activeDaysTier`,
  `isAutonomousTrace`, `regularityFirstDay`, `buildRegularityGrid`) + `getClassRegularityGrid`
  (classe → école → année active → vacances ; élèves actifs ; traces paginées par `readAllRows`,
  sources de l'élève seulement, filtrées en mémoire hors `evaluation`).
- Endpoint `GET …/analytics/regularity` (sans paramètre) ; composant `ClassRegularityGrid.svelte`
  pleine largeur dans l'onglet Connaissances.
- Retirés : `ClassActivityHeatmap.svelte`, `getClassActivityHeatmap`, endpoint `knowledge-heatmap`,
  `heatmapQuerySchema` (R3).
- Sans migration : le prof lisait déjà `school_years`, `school_holidays` et les traces de ses élèves.
- Tests : 24 (calcul + lecture), 3 (endpoint), 8 (composant).
- Revues : `code-reviewer` (clavier, réponse périmée, case choisie par ligne/colonne : corrigés ; volume des traces : question à David), `security-auditor` (rien à corriger). Mergée le 2026-11-12 (#2587).

## PR B — découpage et décisions (David, 2026-11-12)

David : « je valide ».

- **B1** (sans migration) : R1 + R2. **B2** (migration) : 1re activité de la semaine, 3/5/10 semaines
  actives d'affilée. **B3** : question longtemps ratée enfin réussie, sur la carte de fin de série.
- **R1, affichage** : Constance à 0 → ni « Constance Royale : 0 semaine » ni badge chez l'élève ;
  « Cette semaine : x jours sur 3 » et le record restent ; le prof garde « 0 sem. ».
- **Notion acquise** : couverte par l'annonce du Mathou (croissance, étoile) ; pas de réplique neuve.
- **Série terminée, quel que soit le score** : couverte par la carte de gain (une réponse fausse
  rapporte aussi des pansées ; plafond → « panse pleine ») ; flash-cards sans carte, laissées telles.
- **1re activité de la semaine** (B2) : au 1er **jour actif** (5 traces), même règle que la grille.
- Retour après une pause : seuil de 21 jours et fenêtre de 7 jours gardés.

## PR B1 — R1 + R2 (2026-11-12)

- R1 : réplique `streak_lost` retirée ; la présence remet la Constance à 0 sans rien transmettre
  (`streakLost` retiré de `GET /api/student/buddy/presence`) ; `BuddyStatusPanel` masque la ligne
  de Constance à 0.
- R2 : `long_absence` (triste) → `return_after_pause` (joyeux, 3 répliques par Palotin, sans durée,
  neutres en genre). À fêter seulement si l'élève a travaillé depuis le retour
  (`isReturnToCelebrate` : `last_activity_date` ≥ `welcome_back_on`, dans les 7 jours) ; champ
  `returnAfterPause` de la présence.
- Relecture après une activité : `receiveBuddyGain` (gain > 0) → `notifyBuddyActivity` ;
  `PalotinPresence` relit la présence en arrivant dans la maison ou sur un passage ; `BuddyWidget`
  fête un retour arrivé après son montage (une fois par widget).
- Limite connue : travailler = gagner des pansées ; des flash-cards seules ne fêtent pas le retour.
- Tests : `buddy-absence` (4), `buddy-presence`, `buddy-queries-passage`, `BuddyWidget-retour` (6),
  `PalotinPresence` (relecture après activité, maison, sans activité), `BuddyGainCard` (répliques,
  signal d'activité, Constance à 0), intégration `palotin-boucle` (13).
- Revues : `security-auditor` (rien de bloquant ; en-têtes des routes `presence` et
  `welcome-back` remis d'accord). `code-reviewer` : retour fêté tard recouvert par la salutation ou
  l'annonce alors que déjà acquitté → corrigé (elles attendent la fin de sa bulle) ; double fête
  possible (file, relecture) → corrigé (`markReturnCelebrated`) ; relecture inutile en séance →
  corrigé ; énigmes : `receiveBuddyGain` branché sur la page d'énigme ; `coquille-et-caches.md`
  mis à jour. Gardé : un `planPassages` en cours retarde la fête à la page suivante (pas perdue).

## PR B2 — phase 0 technique (2026-11-12)

David : « je valide » (T1-T7 ; question d'accès : **personne de plus**). Livraison en deux PR :
B2a migration + intégration, puis `db:migrate` + `db:types` ; B2b le code.

Constats : les traces de l'élève se lisent par l'index `(student_id, created_at)` ; les moments
« 1re activité de la semaine » et « N semaines d'affilée » tombent **au même instant** (le compte
monte quand la semaine devient active) ; le retour (R2) est retenu dans `student_last_visits`,
lisible par le serveur seul.

- **T1 — Où compter** : à la volée dans la présence (`loadBuddyPresence`), sans compteur stocké.
  D'abord un test léger : aujourd'hui (Paris) a-t-il ≥ 5 traces autonomes, et la semaine n'est-elle
  pas déjà fêtée ? Seulement alors, lecture des traces depuis la rentrée et calcul du compte
  (fonctions de `class-regularity.ts` réutilisées). Donc le gros calcul tourne une fois par semaine
  et par élève.
- **T2 — « Déjà dit »** : une colonne `student_last_visits.week_celebrated_on date` (lundi de la
  semaine fêtée), serveur seul comme `welcome_back_on`. Un seul champ pour les deux moments.
- **T3 — Après une activité** : fête seulement si **aujourd'hui** est un jour actif (jamais à
  l'arrivée un autre jour).
- **T4 — Un seul moment à la fois** : retour après une pause > palier 3/5/10 > 1re activité de la
  semaine. Le retour fêté marque aussi la semaine (pas deux bulles le même jour).
- **T5 — Vacances** : celles des écoles des classes de l'élève ; hors classe, aucune. Semaine de
  vacances sans activité : sautée ; avec activité : comptée.
- **T6 — Borne** : le compte part de la rentrée (même premier jour que la grille) : l'été le remet
  à zéro.
- **T7 — Répliques** : 3 par Palotin et par moment (`week_first_activity`, `active_weeks_3`, `_5`,
  `_10`), sans citer la Constance Royale ni un nombre de jours ; à relire par David dans la PR.
- **Question d'accès** : qui pourra lire quoi qu'il ne pouvait pas lire avant ? Recommandé :
  **personne** (colonne serveur seule ; n'en sort que « moment à fêter : lequel »).
- Tests : intégration (colonne illisible par `authenticated`, rouge sans la migration), calcul pur
  du compte (vacances, été, semaine sautée), présence, bulles.

## PR B2a — migration (2026-11-12)

- `student_last_visits.week_celebrated_on` (migration `20261112131750`), intégration
  `palotin-semaine-fetee` (8, rouges sans la migration). `security-auditor` : rien de bloquant ;
  à faire en B2b : la colonne dans l'export RGPD. Mergée (#2593), `db:migrate` fait, `db:types`
  en B2b.

## PR B2b — moments de la semaine (2026-11-12)

- `src/lib/server/buddy-weeks.ts` : `activeDaysOf`, `activeWeekStreak`, `weekMomentFor`,
  `isWeekToCelebrate` (purs, 14 tests) ; `loadWeekMoment` (test léger du jour, puis traces depuis la
  rentrée, vacances des écoles des classes actives) ; `markWeekCelebrated`.
- Présence : champ `weekMoment` (nul si retour à fêter : T4). `POST …/week-celebrated` ;
  `POST …/welcome-back` marque aussi la semaine. Client : `BuddyWidget` (`scheduleCelebration`,
  une fête par widget) et `PalotinPresence` (passage `isWeek`, retour fêté → semaine fêtée).
- Répliques : `week_first_activity`, `active_weeks_3/5/10`, 3 par Palotin — **à relire par David**.
- Export RGPD `gaming.semaine_fetee` ; politique de confidentialité : ligne ajoutée (§ données et
  durées), version 1.2 du 12 novembre 2026.
- Tests : `buddy-weeks` (14), `buddy-presence` (+3), routes (+3, +2), `palotin-presence` (+1),
  `PalotinPresence` (+4, dont 3 rouges sans le code), export (+1), intégration
  `palotin-semaines-actives` (5).

## Décisions après B2 (David, 2026-11-12)

David : « je valide » (mes recos).

- Répliques `week_first_activity`, `active_weeks_3/5/10` : **validées telles quelles**.
- Vacances commençant un samedi : la semaine d'école d'avant reste « vacances » (sautée sans
  activité) — **règle gardée**, commune avec la grille du prof.

## PR B3 — phase 0 technique (2026-11-12)

David : « je valide » (U1-U6, contrôles ratés comptés, `startedAt` sans migration).

Constats : les traces d'une série sont écrites question par question (`/api/skill-attempts`) et
`settle()` les attend **avant** `POST /api/tests/save`, qui calcule le gain : le serveur peut tout
relire en base, sans faire confiance au client. Index `(student_id, template_id, created_at)` déjà
là. La carte (`BuddyGainCard`) n'a qu'une réplique ; « Nouveau niveau » est une ligne à part.
Révision (FSRS) = traces **déclarées** (`student_self`) ; flash-cards = pas de gain.

- **U1 — Où** : fin de Saisie, Contrôle blanc, Course aux nombres (`/api/tests/save`). Pas en
  révision ni en flash-cards (réussite déclarée, pas corrigée). Cartes de cours exclues.
- **U2 — Règle** : pour un modèle de la série, la 1re réussite **de cette série** suit au moins
  3 échecs **sans réussite entre eux**, le premier de ces échecs ≥ 7 jours avant (dates de Paris).
  Une réussite plus ancienne remet le compte à zéro.
- **U3 — Traces comptées** : corrigées par l'appli (`source = 'auto'`), contrôles compris pour les
  échecs (un contrôle raté est un vrai raté) ; la réussite, elle, est dans la série.
- **U4 — « Déjà dit » sans migration** : une réussite plus tardive casse la règle d'elle-même. Seul
  risque : deux séries le même jour avec ce modèle → la 2e refêterait. Le client envoie l'heure de
  début de série (`startedAt`, bornée : ≤ maintenant, ≥ maintenant − 24 h) ; seule une réussite
  postérieure compte. Tricher ne rapporte rien (une réplique, aucune pansée).
- **U5 — Affichage** : `buddy_xp.longStruggleWon: true` ; la carte remplace sa réplique par une
  réplique `long_struggle_won` (3 par Palotin, fière, sans citer le nombre d'échecs ni de jours),
  expression `excited`. Plusieurs modèles concernés → une seule réplique. Carte cachée (pas de
  Palotin, rien gagné hors plafond) → rien.
- **U6 — Coût** : une lecture des traces `auto` des modèles réussis de la série (≤ 30 modèles,
  limitée), seulement s'il y a une réussite.
- **Question d'accès** : aucune migration, aucune donnée nouvelle ; le serveur lit les traces de
  l'élève lui-même. Personne ne lit rien de plus.
- Tests : règle pure (3 échecs/6 jours → non ; réussite entre deux → remise à zéro ; 2e série du
  jour → non ; contrôle raté compté), route (`longStruggleWon`), carte (réplique, priorité).

## PR B3 — question longtemps ratée enfin réussie (2026-11-12)

- `src/lib/server/buddy-struggle.ts` : `isLongStruggleWon` (pur, 12 tests) et `loadLongStruggleWon`
  (100 dernières traces `auto` par modèle réussi, 30 modèles au plus, droits du serveur).
- `POST /api/tests/save` : `buddy_xp.longStruggleWon`, seulement si gain non nul ; lecture en échec
  → `false`, le gain reste (7 tests de route).
- **Écart avec U4, même idée** : le client envoie la **durée** de la série (`seriesElapsedMs`,
  0-24 h), pas son heure de début : le serveur calcule le début avec sa propre horloge (une horloge
  d'élève décalée ne fait ni manquer ni refêter). Sans durée (ancien client) : pas de fête.
- Carte : réplique `long_struggle_won` (`excited`), avant celle de montée de tour ; « Nouveau tour
  de panse » et panse pleine restent dits. Répliques (3 par Palotin) — **à relire par David** :
  Giron « Celle-là te résistait, et tu l’as eue ! Cornegidouille ! » · « Tu n’as rien lâché, et
  voilà la victoire ! » · « Par ma chandelle verte, celle-là, tu l’as enfin domptée ! » ; Pile
  « Celle-là te résistait. Aujourd’hui, elle a cédé. » · « Tu as persévéré, et elle a fini par
  céder. » · « Ce qui semblait difficile ne l’est plus. Beau chemin. » ; Cotice « Trop fort !
  Celle-là, on l’a enfin eue ! » · « Ouais ! Tu as tenu bon, et ça a payé ! » · « Celle qui nous
  résistait ? Battue ! Tope là ! ».
- Doc : `buddy-palotins.md` § « Question longtemps ratée enfin réussie ».
- Revues : `security-auditor` (rien de bloquant ; lecture passée du client service au client de
  l'élève, RLS en seconde barrière) ; `code-reviewer` : durée mal formée → 400 et gain perdu →
  corrigé (`.catch(undefined)`, NaN côté client → 0) ; tri sur l'instant, pas la chaîne → corrigé ;
  requête jamais vue contre la base → intégration `palotin-question-longtemps-ratee` (4, rouge sans
  le filtre `source`). Gardé : page ouverte > 24 h, durée bornée à 24 h (rare, sans effet hors fête).
