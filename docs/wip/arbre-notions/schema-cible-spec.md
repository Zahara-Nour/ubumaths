# Schéma cible ADR 0020 — spécification (phase 0)

> Créée le 2026-10-07. **Phase 0 TDD** : les comportements ci-dessous sont à valider par
> David — en français, cas nominal / limite / erreur — AVANT tout test et tout SQL. Les
> questions ouvertes (reprises de `schema-cible-questions.md`) sont insérées là où elles
> conditionnent un comportement, avec recos. Après validation : tests d'intégration qui
> échouent → migration **additive** → `security-auditor` → `db:migrate` (les 4 conditions).
> Le volet destructif (retrait `themes/objectives`, `rang`, vieux seed 6e) viendra bien
> plus tard, avec arrêt obligatoire.

## Périmètre

La **PR 1 de la branche** (migration `20261007120000_arbre_des_notions.sql`, 52 tests
verts) a déjà livré et spécifié — on ne le re-discute pas :

- `classification_nodes` : branche > notion > sous-notion, 3 genres immuables, parent
  obligatoire du bon genre, nom unique dans la fratrie (casse ignorée), archivage en
  cascade (un nœud actif sous un parent archivé est refusé), **lecture anon, écriture
  admin** ;
- `exercise_classifications` (exercice → nœuds) : un exercice, plus composite qu'une
  question, se range dans **un ou plusieurs nœuds** (table de liaison ; seul le doublon
  exact est refusé), avec **au plus un rangement principal** (`is_primary`) — précision de
  David du 2026-10-07, que le schéma de la PR 1 satisfaisait déjà ;
- `question_templates.classification_node_id` (modèle → nœud) : **un seul nœud par
  modèle** — une question est atomique ;
- dans les deux cas : obligatoirement une notion ou une sous-notion (jamais une branche),
  jamais un nœud archivé pour un NOUVEAU rangement — un rangement existant survit à
  l'archivage de son nœud.

La phase 0 couvre le reste : **les points de programme rattachés aux nœuds**, **les
références d'automatismes contraintes au parcours**, **les parcours**, la **transition**
(seeds) et les **accès**.

---

## A. Les points de programme (`curriculum_points` étendu)

**C1 — nominal.** Un point porte un `node_id` vers une **notion ou une sous-notion**.
Exemple : `1SPE-114` « déterminer les cosinus et sinus d'angles associés » →
`Fonctions > Fonctions trigonométriques > angles associés`.

**C2 — erreur.** Rattacher un point à une **branche** est refusé (même garde que les
modèles et exercices de la PR 1 — le trigger existant est réutilisé).

**C3 — limite.** Rattacher un point à un **nœud archivé** est refusé pour un nouveau
rattachement ; un rattachement existant survit à l'archivage du nœud (cohérent PR 1).

**C4 — reconstruction à neuf (décision David, 2026-10-07).** La cible ne « complète » PAS
les points existants : elle se **reconstruit depuis les documents v2**, seule source de
vérité. Pour chaque grade, un seed NEUF crée des points neufs portant TOUS, dès
l'insertion, leur nœud, leur grade et leur rubrique (vérifié par le test du seed). Les
colonnes nouvelles restent facultatives en base pour une seule raison : anciens et
nouveaux points cohabitent dans la même table jusqu'à l'extinction des anciens — pas parce
qu'un point de la cible pourrait en manquer.

**C5 — anciens seeds : intouchés, puis transférés, puis éteints.** Les 1 007 points
existants ne sont **jamais modifiés** (ni nœud, ni grade recopié, ni rubrique) : ils
continuent de servir le site tels quels jusqu'à la bascule de leur grade. À la bascule
d'un grade : les **tags modèles → points** (seul actif accroché aux anciens points —
mesuré le 2026-10-07 : 1 026 liens, 342 en 1_SPE, 308 T_SPE, 173 T_EXP, 140 T_COMP, 63 en
2de ; **0 acquisition d'élève**, et les tentatives tiennent aux modèles, pas aux points)
sont **transférés** vers les points neufs par appariement de libellés — un lot présenté et
validé comme les autres ; puis l'affichage bascule, et les anciens points du grade
s'**archivent**. Leur destruction (avec `themes`, `objectives` et le vieux seed 6e)
attend le volet destructif de fin de chantier.

**C6 — nominal.** Plusieurs points d'un même grade sur un même nœud : permis (les sept
points de la Trigonométrie de 1re spé se répartissent sur deux sous-notions).

**C7 — nominal.** Des grades **parallèles** pointent le même nœud, chacun avec SES points
(la parabole porte des points de 1re spé, du module ens. sci. ET de 1re techno) — jamais
de point partagé entre programmes.

**C8 — attributs reconduits.** `name`, `code`, `exigence` (attendu / approfondissement),
`regime_acquisition` (**fluence / diversite uniquement** — pas de valeur « automatisme »,
supprimée le 2026-08-30), `display_order`, `archived_at`. Archiver un point n'efface rien :
ses tags de modèles et les acquisitions d'élèves restent lisibles ; il ne compte plus dans
les couvertures.

**C9 — Q3 (kind `algorithme`).** `kind` ∈ {connaissance, savoir_faire, demonstration,
**algorithme**} — la 4e valeur pour les « Exemples d'algorithme » et « Situations
algorithmiques » des BO, aujourd'hui noyés dans savoir_faire. Additive (aucun point
existant ne change). **Reco : oui.**

**C10 — Q1 (`rang`).** La cible **ignore** `rang` (0/1 007 rempli depuis août, code à
échelle qui calcule à vide, accroché à l'objectif que l'ADR dissout, doublon du `level`
intra-point). Aucun nouveau point n'en recevra ; le retrait de la colonne et du code
relève du volet destructif. **Reco : abandon.**

**C11 — Q2 (rubrique BO).** Pour afficher un programme dans l'ordre du texte (« Analyse >
Trigonométrie »), le point porte une **`rubrique` texte** (« Analyse > Trigonométrie » —
sur les points NEUFS seulement, C4 : les anciens ne sont pas modifiés), et `themes/objectives` deviennent de
simples données d'affichage appelées à disparaître au volet destructif. Alternative :
garder les deux tables comme sommaire vivant (statu quo structurel). **Reco : champ
`rubrique`** — un BO est un texte plat à deux niveaux de titres, deux tables sont de trop ;
et un point sans rubrique reste valide (transversaux).

## B. Les références d'automatismes (`curriculum_point_automatismes`)

**C12 — nominal.** Une ligne (point, grade) = « ce point figure dans la liste
d'automatismes de ce programme ». Exemple : le point de 2de « équation produit nul »
référencé par `1_SPE`, `1_GEN` et `1_TECHNO` (trois lignes).

**C13 — nominal (auto-référence).** Un point référencé par **son propre grade** : permis —
c'est l'indice de base 100 (point de Tle techno, travaillé en automatisme en Tle techno).

**C14 — erreur (contrainte de parcours).** Une référence dont le grade du point visé
n'appartient **ni au parcours antérieur du grade référenceur, ni au grade lui-même** est
refusée. Exemple canonique : `1_GEN` → point de `1_SPE` : **refusé** (voie parallèle).

**C15 — erreur (sens du temps).** Référencer un point d'un grade **postérieur** est
refusé : la 2de ne peut pas référencer un point de Tle (cas particulier de C14 : un grade
postérieur n'est jamais dans le parcours antérieur).

**C16 — Q4 (héritage).** « La liste de 2de doit être entretenue en 1re » : les références
sont **dupliquées par grade au seed** (la liste de 1re spé contient ses lignes propres ET
les reprises de 2de, matérialisées). Alternative : une règle « les listes des années
antérieures restent actives » calculée à la lecture. **Reco : duplication au seed** — les
listes publiées par chaque BO sont explicites, le texte de 1re dit lui-même « s'ajoute la
liste de 2de » ; matérialiser rend chaque liste consultable telle que publiée, sans
récursion à la lecture.

**C17 — limite.** La suppression d'un point emporte ses références (cascade, déjà en
place) ; son archivage les laisse en place (une liste d'un BO réformé se re-seede avec son
programme).

## C. Les parcours (`grade_predecessors` — nouvelle table)

**C18 — nominal.** Chaque grade liste ses **prédécesseurs directs** :
CP→CE1→CE2→CM1→CM2→6→5→4→3→2, puis 2→{1_SPE, 1_GEN, 1_TECHNO},
1_SPE→{T_SPE, T_COMP, T_EXP}, 1_TECHNO→T_TECHNO. Le **parcours antérieur** d'un grade =
la clôture transitive (fonction SQL utilisée par la garde C14).

**C19 — erreur.** Un cycle dans les prédécesseurs est refusé.

**C20 — limite (T_EXP).** Les Expertes se suivent EN MÊME TEMPS que la Tle spé : le
prédécesseur de `T_EXP` est `1_SPE`, et `T_SPE` n'est PAS dans son parcours antérieur
(pas de référence T_EXP → point T_SPE ; sans objet en pratique, les Expertes n'ont pas
d'automatismes).

**C21 — à confirmer.** Le grade `T_GEN` (présent dans les contraintes historiques) n'a
aucun programme de mathématiques : hors parcours, aucune référence possible. (Si un module
« ens. sci. de terminale » apparaît un jour, il entrera comme `1_GEN` l'a fait.)

## D. La transition (seeds)

**C22 — premier seed.** La **6e d'avril 2025** est le premier programme écrit dans
l'architecture cible (points 100 % rattachés, rubriques, références vers les points de
CM1/CM2 qu'elle suppose — donc le seed 6e emporte le seed des points du cours moyen
qu'elle référence, ou ses références attendent le seed cycle 3 complet : à régler au plan
de seed). L'ancien seed 6e (2020, 95 points, 0 usage) reste en place sans servir jusqu'au
volet destructif (décision R5 = B).

**C23 — coexistence.** Les seeds existants (2de, 1re/Tle spé, Tle comp., Expertes)
continuent de servir le site **tels quels, intouchés** ; chaque grade bascule ensuite vers
son seed NEUF construit depuis son document v2 (mécanique C4-C5 : seed neuf → transfert
des tags → bascule → archivage des anciens), grade par grade, chacun validé par ses tests.

**C24 — livraison.** Deux PR : la **migration d'abord** (additive : colonnes nullables +
nouvelles tables + gardes), `db:migrate`, `db:types`, puis le code. Tests d'intégration
écrits AVANT et vérifiés rouges sans la migration.

## E. Les accès (RLS) — LA question d'accès (Q6)

**État mesuré en prod** : tout le référentiel actuel (`curriculum_themes`, `objectives`,
`points`, `point_automatismes`, `question_template_points`) est lisible par les seuls
**comptes connectés** ; les acquisitions (`student_point_state`) par l'élève lui-même et
le prof. L'arbre (PR 1) est lisible par les **anonymes**.

**C25 — proposition.** Points, références et parcours s'alignent sur l'arbre : **lecture
anonyme, écriture admin**. Ce sont les programmes officiels de l'Éducation nationale —
contenu public par nature, aucune donnée d'élève dans ces tables. **Ce qui change : un
visiteur non connecté pourra lire le référentiel (points et listes d'automatismes), ce
qu'il ne peut pas faire aujourd'hui.** Les acquisitions d'élèves ne bougent pas (élève +
prof uniquement).

**C26 — erreur.** Écriture (insert/update/delete) sur nœuds, points, références, parcours
par un non-admin : refusée — et testée en intégration avec un VRAI utilisateur connecté
non-admin (jamais un smoke-test `auth.uid()` NULL).

**C27 — limite.** Un élève anonyme ou connecté ne voit JAMAIS `student_point_state`
d'autrui (inchangé, re-testé).

---

## Récapitulatif des décisions demandées (B1-B7)

1. **B1 (= Q1)** — `rang` : la cible l'ignore, retrait au volet destructif. (reco : oui.)
2. **B2 (= Q2)** — rubrique : champ `rubrique` sur le point, `themes/objectives` en sursis.
   (reco : champ.)
3. **B3 (= Q3)** — `kind` : ajouter `algorithme`. (reco : oui.)
4. **B4 (= Q4)** — héritage des listes : duplication matérialisée au seed. (reco : oui.)
5. **B5 (= Q5)** — parcours : table `grade_predecessors` + clôture transitive, C18-C21
   (dont T_GEN hors parcours). (reco : oui.)
6. **B6 (= Q6)** — accès : lecture anonyme du référentiel (C25). **C'est la question
   d'accès : « les visiteurs non connectés liront les points et les listes d'automatismes,
   qu'ils ne peuvent pas lire aujourd'hui. »** (reco : oui — contenu public des BO.)
7. **B7 (= Q7)** — régime au reseed : défaut `diversite` conservé, `fluence` choisi point
   par point au moment des seeds. (reco : oui.)

Toute autre lettre des comportements C1-C27 est réputée validée avec « je valide tout » ;
dis-moi si l'un d'eux te paraît faux indépendamment des B.
