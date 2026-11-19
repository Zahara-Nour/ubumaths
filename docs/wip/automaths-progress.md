# Chantier `automaths` — ergonomie du catalogue Automaths

## Reprendre ici

_Mis à jour le 2026-11-19, PR 4 « Ma série » commencée._

- **État** : PR 1 (#2842), 2 (#2847), 3a (#2854), 3b (#2866) mergées. PR 4 « Ma série » : phase 0 validée le 2026-11-19, réalisation en cours sur `feat/automaths-ma-serie`.
- **Prochaine action** : tests rouges (colonne / panneau / barre, retrait, durée totale, libellés « Ma série »), puis code.
- **En attente de David** : vérification manuelle #2866 notée dans `verifications-manuelles.md`.
- **Pièges en cours** : séparateur de `rubrique` = « > » en base ; liste servie sans `points` (cache Vercel d'avant le déploiement) → vue Notions seule ; cartes de test : fixture `data/relecture/entiers/139.json` ; `getByRole('navigation', { name: 'Notions' })` → `exact: true` ; `deploy-prod.test.ts` dépasse parfois 5 s en CI (relancer le job).
- **Worktree / branche** : PR 4 dans `../ubumaths-wt-automaths-serie` · `feat/automaths-ma-serie`. `../ubumaths-wt-automaths` FIGÉ (serveur de test 5176 de David, Serve 443 et 8443) ; à la fin de ses tests : arrêter le serveur, `tailscale serve --https=443 off` et `--https=8443 off`, `git worktree remove` + `git branch -d feat/automaths-programme`.

### 2026-11-18 — recherche

- Mesures prod (lecture seule) : 2 454 modèles publiés, 17 branches non vides sur 19, jusqu'à 21 notions (Géométrie) et 88 sous-notions (Nombres et calculs) par branche ; 4 modèles par sous-notion en médiane, 56 au plus.
- Constaté en prod sur téléphone : 16 onglets de notions sur 9 lignes ; le bouton flottant du panier masque « Ajouter au panier » et clignote en permanence.
- Autres constats : aucune recherche ; sous-notions fermées, sans compteur ; retrait du panier impossible depuis la grille ; l'adresse ne garde que le niveau.
- Proposition : barre fixe (recherche + niveau), thèmes en liste à compteurs (colonne / panneau du bas), sous-notions en pastilles qui défilent, sections dépliées avec aperçus calculés à l'approche, série en cours visible selon l'écran.
- Roue (cercle de parts), étudiée à la demande de David : à parts proportionnelles, Thalès a 16 px et Pythagore 9 px sur une roue de téléphone ; deux étages au plus. Avis : vue d'ensemble facultative au mieux.
- Arbre du programme : les 2 762 points (tous niveaux) ont un `node_id` ; presque tous ont des questions (exception T_EXP : 13 sur 176). Avis : deuxième façon de parcourir, dès qu'un niveau est choisi.
- Découpage proposé : PR 1 correctifs immédiats · PR 2 recherche · PR 3 navigation · PR 4 série en cours.

### 2026-11-18 — recommandations, validées par David le jour même

1. Recherche et arbre visibles ensemble, sans focus automatique (clavier du téléphone).
2. Niveau non obligatoire ; « Tous » à la 1re visite, puis le dernier niveau retenu.
3. Série : colonne ≥ 1 280 px, panneau en dessous, barre en bas sur téléphone ; libellé « Ma série » (CONTEXT.md).
4. Sous-notions toutes dépliées + pastilles.
5. Cartes plus basses sur téléphone seulement.
6. Programme : bascule en plus de l’arbre des notions, par défaut dès qu’un niveau est choisi.
7. Questions montrées sous chaque point (✓ partout) ; point posé sur une notion → questions des sous-notions incluses.
8. Roue abandonnée pour l’instant.

Le panier détaillé `/automaths/panier` reste inchangé (durées, répétitions, PDF, enregistrement, lien, lancement) ; le catalogue n’en montre qu’un aperçu.

### 2026-11-18 — PR 1, phase 0 validée par David (« je suis tes recos »)

1. Bouton rond du panier : plus de pulsation ; espace libre en bas de page, pour que le dernier « Ajouter » remonte au-dessus du bouton.
2. « ✓ Dans le panier » devient cliquable : retire la question entière (répétitions et durée comprises) ; infobulle « Retirer du panier » ; pas de message.
3. Notion dans l'adresse (`?notion=…`), sans entrée d'historique ; changer de branche → sa première notion ; notion absente au niveau choisi → première notion, l'adresse suit ; notion inconnue → ignorée.
4. Retour du panier : le catalogue retient sa dernière adresse le temps de la visite (onglet) et la reprend quand on y revient sans paramètre ; le panier ne change pas.

### 2026-11-18 — PR 1 mergée (#2842)

- Livré : retrait depuis la tuile (nom accessible « Dans le panier : retirer »), `?notion=<id>` dans l'adresse, dernière adresse retenue pour la visite (`sessionStorage`), adresse d'un lien direct retenue aussi, bouton rond sans pulsation, `pb-28`, menu « Branche » nommé.
- Revue `code-reviewer` (Sonnet) : aucun finding bloquant ; corrigés : adresse d'arrivée retenue, nom accessible. Écarté : `replaceState` au montage, vérifié à la main en dev (rechargement complet, aucune erreur).
- Vérification manuelle notée dans `verifications-manuelles.md`.

### 2026-11-18 — PR 2 recherche, phase 0 validée par David

Mesures prod (lecture seule) : 2 471 modèles publiés ; 2 350 ont une description, 19 une consigne. Recherche « début de mot » contre « n'importe où » : « aire » 49 contre 319 (« linéaire », « unitaire »…) ; « calcul » 466, « fraction » 225, « pythagore » 9.

Comportements proposés :

1. Champ « Chercher une question » en haut, au-dessus de Branche et Niveau ; pas de curseur automatique ; « / » y met le curseur (sauf si on tape déjà ailleurs).
2. Cherche dans le titre, la description et les noms branche / notion / sous-notion du modèle ; sans accents ni majuscules ; `$` du LaTeX ignorés ; plusieurs mots → tous présents, dans n'importe quel ordre ; chaque mot au début d'un mot (« aire » ne trouve pas « linéaire »).
3. Dès 2 lettres, sans bouton. Les résultats remplacent menu Branche + onglets ; groupés par sous-notion, titre « Géométrie › Cercle › disque · 3 », dans l'ordre de l'arbre ; compteur « 49 questions ».
4. Le niveau choisi filtre aussi les résultats.
5. Plus de 60 questions : les premiers groupes jusqu'à 60 cartes sont dépliés, les suivants repliés (avec leur compteur), ouverts d'un clic.
6. Aucun résultat : « Aucune question pour « … » » ; si un niveau est choisi, bouton « Chercher dans tous les niveaux ».
7. Effacer (croix ou Échap) → retour à la notion où l'on était.
8. Recherche dans l'adresse (`?q=…`), retenue comme niveau et notion (retour du panier).
9. Ajouter / retirer du panier : comme dans la grille.

Hors PR : recherches récentes, synonymes, liste des thèmes à compteurs (PR 3). 10. Intitulés des points du programme aussi (ajouté à la demande de David, qui demandait si les tags serviraient : aucune question n'a de tag ; 2 372 / 2 471 ont un point ; « double distributivité » 0 → 3).

Question d'accès tranchée (2026-11-18) : `anon` lit le lien question → point des seules questions publiées (migration `20261118204254`, additive).

Au test en local : « calcul » ramenait 1 050 questions, toute la branche « Nombres et calculs ». David : retirer les noms de branche de la recherche (point 2 modifié).

### 2026-11-18 — PR 2, réalisation

- Migration + test d'intégration (rouge sans, vert avec ; appliquée en local à la main : la base locale a du retard sur des migrations de données d'autres chantiers).
- API : `pointNames` dans `/api/questions/templates/all` ; lecture en échec → liste servie sans.
- `catalogue-search.ts` (`searchCatalogue`, `initiallyOpenGroups`), cache, page ; tests rouges vérifiés sur l'ancienne page.
- Après le merge : `db:migrate` (additive) AVANT tout `deploy:prod`, sinon la recherche tourne sans les points (pas de panne : lecture en échec tolérée).
- Revues : `security-auditor` (Opus) sans finding bloquant ; appliqué : lecture `anon` limitée aux colonnes `template_id, point_id`, commentaire (pas de statut « archive »), 4 cas d'intégration de plus (embed, `created_at`, update, publié → brouillon), liens filtrés aussi par les ids publiés côté API. `code-reviewer` (Sonnet) : groupe replié impossible à ouvrir avec ses cartes (`$state` proxifiait le résultat → `$state.raw`, test rouge puis vert), tri stable des liens (`point_id`), minuteur nettoyé au départ de la page, frappe en attente appliquée au changement de niveau, `x²` trouvé par « x2 » (NFKD). Écarté : « / » avec une fenêtre ouverte (improbable).

### 2026-11-18 — PR 2 mergée (#2847)

- CI verte, mergée ; `db:migrate` (seule migration en attente) ; vérifié en prod : `anon` lit `template_id`, pas `created_at`, une policy `anon`.

### 2026-11-18 — PR 3 navigation, phase 0 validée par David (« je te suis »)

Mesures prod (lecture seule) : notion = 14 questions en médiane, 111 au plus (2 notions > 100). Programme 5e : 143 points, 18 chapitres (`rubrique` = « Partie › Chapitre [› Automatismes] »), 5 parties ; tous niveaux de 6 à 19 chapitres. `curriculum_points` lisible par `anon` (policy `true`) : pas de migration. 5e, questions sous un point : liens directs médiane 1 (9 points sur 143 sans lien) ; par nœud médiane 10, max 68, mais 143 points → 61 nœuds (listes répétées).

Vue « Notions » (PR 3a) :

1. Grand écran : colonne à gauche, branches et notions à compteurs (« Fractions · 42 ») ; seule la branche de la notion affichée est dépliée.
2. Téléphone : bouton « Notion : Fractions · 42 ▾ » → même liste dans un panneau du bas.
3. Compteurs selon le niveau ; notion vide au niveau → absente.
4. Pastilles des sous-notions (avec compteur) en haut de la notion, défilent sur le côté ; clic → descend à la section.
5. Sous-notions toutes dépliées ; aperçus calculés à l'approche de l'écran.
6. Cartes plus basses sur téléphone seulement.
7. Adresse : `?notion=` inchangé ; la pastille n'est pas dans l'adresse.

Vue « Programme » (PR 3b) :

8. Bascule « Notions | Programme » dès qu'un niveau est choisi, « Programme » par défaut ; « Tous les niveaux » → Notions seule.
9. Colonne / panneau : parties et chapitres du programme, à compteurs.
10. Chapitre : une section par point (intitulé), ses questions dessous ; point sans question → ligne grise « Pas encore de question ».
11. « Et niveaux inférieurs » : programme du niveau choisi seulement, questions selon le filtre.
12. Adresse `?vue=programme&chapitre=…`, retenue comme le reste.
13. La recherche remplace les deux vues.

Lecture des questions sous un point : **A** — les questions rattachées au point ; aucune → celles du nœud du point, sous-notions comprises.

### 2026-11-18 — PR 3a, réalisation

- `CatalogueNotionNav` (liste à compteurs, colonne `lg` / Sheet du bas), `CatalogueNotionSections` (pastilles collantes, sections dépliées), `LazyCatalogueGallery` (IntersectionObserver, 800 px d'avance ; pastille → sections du dessus calculées avant le défilement), `notionTemplateCount`, cartes 9rem sur téléphone (`--tile-card-height` déclarée dans `QuestionPreviewCard` : la garde `block-css-vars` refuse une variable lue dans un fichier qui ne la déclare pas).
- Tests : `catalogue-navigation` (10) + anciens tests adaptés (helpers `catalogue-helpers.ts`) ; rouges sur l'ancienne page (13/15), 47 verts.
- Piège de test : `getByRole('navigation', { name: 'Notions' })` attrape aussi « Sous-notions » → `exact: true`. `getByText('2 questions')` attrapait le titre de section → `exact: true`.
- Vu en dev (grand écran, base locale) : pastille → section juste sous les pastilles ; changer de notion après avoir descendu → remonte en haut. Largeur téléphone non vérifiable dans Chrome (largeur minimale de fenêtre) : couverte par les tests à 390 px.
- Revue `code-reviewer` (Sonnet) : aucun bloquant. Corrigés : second calage après le défilement d'une pastille (cartes qui grandissent), réserve de hauteur selon 1/2/3 colonnes, focus sur le titre de la notion choisie, défilement après fermeture du panneau (`tick`), compteur lu sur le bouton de branche, branches ouvertes à la main remises à zéro au changement de notion, `prefers-reduced-motion`. Écartés : adresse qui garde la notion de repli (comportement validé en PR 1) ; ~111 aperçus calculés d'un coup sur la dernière pastille d'une grosse notion (non mesuré, à voir en vrai).

### 2026-11-18 — PR 3a mergée (#2854)

- CI rouge au 1er passage : garde `block-css-vars` (variable `--catalogue-card-height` lue par la tuile, déclarée par la grille) → hauteur déclarée dans `QuestionPreviewCard` (`.tile`, `@media`). CI verte, mergée. Vérification manuelle notée.

### 2026-11-19 — PR 3b vue « Programme », réalisation

- Mesures prod (lecture seule) : séparateur de `rubrique` = « > » (pas « › ») ; formes « Partie > Chapitre », « Partie > Chapitre > Automatismes » (5e : 2 points), ou une seule partie (« La pensée informatique ») ; `display_order` = ordre du BO par niveau ; 2 529 points non archivés, tous avec un niveau. Liste des modèles : 1,8 Mo compressés (9,6 Mo bruts) ; les points ajoutent ~6 %.
- API : `points` (id, name, grade, rubrique, display_order, node_id) + `templatePoints` (ids) remplacent `pointNames`, que le cache dérive ; une liste d'avant le déploiement (cache Vercel) garde ses `pointNames` et n'affiche pas la vue Programme.
- `buildProgramme` (`catalogue-programme.ts`) ; `CatalogueNotionNav` → `CatalogueTreeNav` (deux étages génériques, partie sans chapitre = une entrée) ; `CatalogueProgrammeSections` ; page : bascule `aria-pressed`, snippet commun colonne / panneau, `?vue=` + `?chapitre=<slug>`.
- Choix non écrits en phase 0 (à signaler à David) : questions venues du nœud signalées « Questions de « Fractions » » ; « Programme » listé en premier dans la bascule ; un ancien lien `?notion=` sans `vue` garde la vue Notions ; rattachées hors du filtre de niveau → repli sur le nœud.
- Tests : `catalogue-programme.test.ts` (9), `catalogue-programme.svelte.test.ts` (12, rouges 11/12 sur l'ancienne page), API et cache adaptés ; 62 verts sur le dossier du catalogue.
- Chrome (extension) refusait la page en dev : rendu non vu à l'œil.

### 2026-11-19 — PR 3b, revue `code-reviewer` (Sonnet) : aucun bloquant

À traiter à la reprise :

- Écarté d'avance : « vue Notions affichée avant l'arrivée de la liste » — faux, la page montre « Chargement des questions… » tant que la liste n'est pas lue. Poids de l'API : déjà mesuré (+~6 % compressé).
- Slug de chapitre vide (nom fait de symboles) ou doublon de casse/accents → garantir un id non vide et unique (repli sur l'indice) + test.
- `CatalogueTreeNav` : une branche dont la seule notion porte son nom devient une entrée simple aussi dans la vue Notions — acceptable, le dire dans la PR.
- Points sans niveau exclus de la recherche (aucun aujourd'hui) — le dire dans la PR.
- Onglet ouvert avec l'ancien code + nouvelle API : recherche sans intitulés de points jusqu'au rechargement (fenêtre de déploiement seulement).

### 2026-11-19 — PR 3b, suite

- David valide les quatre choix de la réalisation (« Questions de « … » », « Programme » en premier, ancien lien `?notion=` → Notions, repli si les rattachées sont hors niveau).
- Revue traitée : identifiant de chapitre jamais vide ni en double (partie devant, puis numéro ; test rouge puis vert). Les autres points sont dits dans la PR.
- Lien de test tailnet : `https://serveur.tail99357e.ts.net/automaths?niveau=5` (Serve 443 → 5176, 8443 → 54321 ; le 10000 → 5175 est à une autre session, pas de `serve reset`).

### 2026-11-19 — PR 3b mergée (#2866)

- CI : conflit avec `main` (`json` → `Response.json` dans l'API) résolu par merge ; `deploy-prod.test.ts` en dépassement de délai (sans rapport), job relancé, vert. Mergée. Vérification manuelle notée.

### 2026-11-19 — PR 4 « Ma série », phase 0 validée par David

1. Aperçu « Ma série · 3 questions · environ 2 min 30 » : chaque question (titre, « ×4 » répétitions) avec une croix qui la retire ; durée totale = somme des répétitions × durée.
2. Aucun réglage dans l'aperçu : durées, répétitions, PDF, lancement restent sur la page détaillée (« Ouvrir ma série »).
3. Ordre d'ajout.
4. Série vide : « Ta série est vide : ajoute des questions avec « Ajouter ». »
5. Grand écran (≥ 1 280 px) : colonne à droite, collante, défile seule si longue ; plus de bouton rond.
6. Tablette / petit ordinateur : bouton rond conservé → ouvre « Ma série » dans un panneau à droite (plus de changement de page).
7. Téléphone : barre fine en bas « Ma série · 3 questions · 2 min 30 ▴ » → panneau du bas ; série vide → pas de barre.
8. « Ma série » partout où l'on voyait « panier » (titre « Mon Panier », « Dans le panier : retirer », « Vider le panier ») ; l'adresse `/automaths/panier` ne change pas.

### 2026-11-19 — PR 4, réalisation

- `series-summary.ts` (`seriesTotalSeconds` avec `effectiveDelay`, `formatSeriesDuration`, `seriesQuestionCount`) ; « 3 questions » = nombre de modèles (comme l'exemple validé), répétitions sur chaque ligne.
- `MySeriesPreview` (aperçu, croix, « Ouvrir ma série ») ; `MySeriesDock` (bouton rond `sm`–`xl`, barre `< sm`, deux panneaux) remplace `CartFloatingButton` (supprimé) ; colonne `xl` collante dans la page (conteneur élargi à 96rem en `xl`).
- Point 8 : libellés « panier » visibles → « Ma série » (tuile « Ajouter » / « Dans ma série », page détaillée, « Retour à ma série » des formes, messages du panier, lien sans forme, prof). CONTEXT.md : « panier (à l'écran) » → **Ma série**.
- Tests : `catalogue-ma-serie.svelte.test.ts` (12, rouges 12/12 avant le code), `series-summary.test.ts` (8) ; anciens tests adaptés (libellés ; bloc « bouton rond » déplacé).
- Piège de test : un élément en `display: none` n'est pas dans l'arbre d'accessibilité → `getByRole(...).elements()` vide, pas `not.toBeVisible()` (qui attend l'élément et expire).
