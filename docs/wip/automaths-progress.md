# Chantier `automaths` — ergonomie du catalogue Automaths

## Reprendre ici

_Mis à jour le 2026-11-18, après #2847._

- **État** : PR 1 (#2842) et PR 2 recherche (#2847) mergées ; migration `20261118204254` (lecture `anon` des liens question publiée → point) appliquée en prod et vérifiée. Rien en prod tant que David n'a pas fait `deploy:prod`. Page : [automaths-recherche-ui.html](automaths-recherche-ui.html), https://claude.ai/artifact/SCczsfi9ayGXjioFtsQq2R.
- **Prochaine action** : PR 3 navigation (liste des notions à compteurs + pastilles des sous-notions, bascule « Programme » dès qu'un niveau est choisi), nouveau worktree `../ubumaths-wt-automaths`, branche `feat/automaths-navigation`, phase 0 à présenter avant de coder. Puis PR 4 « Ma série ».
- **En attente de David** : rien (vérification manuelle #2847 notée dans `verifications-manuelles.md`).
- **Pièges en cours** : la tuile reste la flash-card (décision du 2026-09-29) ; plusieurs points désignent le même nœud (4-021, 4-075, 4-023 → Calcul littéral) ; un point posé sur une notion peut n'avoir aucune question en propre (4-003) → inclure ses sous-notions ; le panier détaillé `/automaths/panier` ne change pas ; un test qui rend la page doit vider `sessionStorage` (`chiphre_automaths_adresse`) ; les modèles de test simplifiés n'ont PAS d'aperçu (carte absente) : prendre la fixture `data/relecture/entiers/139.json` pour asserter une carte ; la recherche ignore le nom de branche (décision de David).
- **Worktree / branche** : aucun (celui de la PR 2 est supprimé).

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
