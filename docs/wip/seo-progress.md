# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-11-21, après #2974._

- **État** : #2971 et #2974 mergées, PAS encore en prod (attendent un `deploy:prod`). #2971 : grand titre de l'accueil, titre d'onglet du glossaire « terme : définition (maths) | Chiphre ». #2974 : 13 titres et 8 descriptions des outils et des jeux, 7 pages passées à `SeoHead`, séparateur unique ` | Chiphre`, garde `titres-pages.test.ts` (règle dans `docs/systeme/seo.md`). Search Console au 2026-11-16 : 657 pages indexées sur 703 ; sur 28 jours, 4 452 affichages, 5 clics, 99 % sur le glossaire.
- **Les 17 « noindex »** (15 termes, 2 articles du Shtam) : saines aujourd'hui, cause non trouvée. David a lancé « Valider la correction » le 2026-11-21.
- **Décisions du 2026-11-21** (réponses de David) : chiph.re doit passer devant GitHub sur la recherche du nom du site ; dépôt gardé public ; libellés des titres et descriptions de #2974 ; séparateur ` | Chiphre` partout.
- **Prochaine action** : après la mise en prod, vérifier sur chiph.re les titres de #2971 et de #2974 (accueil, un terme du glossaire, Grapheur, Tortue, Mathémo). Nouvel export Search Console vers le 2026-12-20, pour mesurer l'effet sur les outils et les jeux.
- **En attente de David** : (1) le résultat de la validation Search Console ; (2) la mise en prod ; (3) étoffer les pages du glossaire déjà en 1re ou 2e page ? Elles sont 57, pas 68 (relevé du 2026-11-21 dans l'historique). Posée trois fois, sans réponse (contenu pédagogique) : la reposer, ne pas trancher à sa place.
- **Pièges en cours** : une PR qui touche des pages publiques réveille la garde de doc (13 docs couvrent ces pages) : ligne `Doc-inchangée:` dans un commit, et la garde locale ne voit que ce qui est commité. Evoland est hors plan de site (jeu en sommeil), laissée sans `SeoHead`. L'accueil porte déjà ses données structurées (WebSite + Organization) : ne pas les annoncer manquantes.
- **Worktree / branche** : aucun (retirés après #2974) ; recréer `../ubumaths-wt-seo` pour la suite.

## Plan (validé par David le 2026-10-29 : « on commence avec tes recos »)

1. `robots.txt` : bloquer les robots d'entraînement (GPTBot, ClaudeBot, CCBot, Google-Extended…),
   garder ceux de recherche et de réponse. Pas de `llms.txt` (aucun effet sur Google).
2. Glossaire en une page par terme (`/glossaire/<terme>`), pour que chaque définition soit une
   page d'arrivée sur Google. Phase 0 validée le 2026-10-29 :
   - page par terme principal : titre « X : définition », toutes les définitions avec leur niveau,
     exemples, histoire, synonymes, « Voir aussi » ;
   - homonymes : adresse avec le sens (`base-puissance`) ; forme dérivée → redirection vers son
     terme principal ; terme masqué ou inconnu → 404, absent du sitemap ;
   - **A1** : adresse enregistrée en base (colonne `slug`), figée au renommage ;
   - **B1** : plus de fenêtre dans `/glossaire`, un clic ouvre la page (`BackLink` vers le glossaire).
     PR 2 = migration seule (`db:types` lit la prod), PR 3 = le code.

## Historique

- 2026-10-29 : worktree ouvert, PR 1 écrite. Prod : 625 termes principaux visibles, 0 collision d'adresse.
- 2026-10-29 : #1979 mergée (test de la visite corrigé : il lisait tous les groupes de `robots.txt`).
- 2026-10-29 : #1980 mergée, migration appliquée en prod par David (`db push --include-all`, le mode auto le refuse). `security-auditor` : 0 bloquant, 2 mineurs appliqués (collision avec entrée masquée testée, `dictionary_slugify` retirée à anon). Test rouge sans la migration, 7/7 vert avec.
- 2026-10-29 : PR 3. Écarts à la phase 0 : les 6 renvois qui ont leur propre définition (« Thalès ») gardent leur page au lieu d'être redirigés (44 renvois nus redirigés) ; la page d'un terme montre tous les niveaux et ne suit plus le filtre de niveau de la liste.
- 2026-10-29 : #1990 mergée (revue : boucle de 308 hypothétique corrigée ; filtre `paths` de l'intégration complété).
- 2026-11-21 : exports Search Console analysés. Sortent en première page les expressions précises (« strictement positif », « compris entre », « tirage sans remise », « distance à zéro ») ; les mots courants (« calcul », « triangle », « médiatrice ») sont au-delà de la 5e page. 68 pages en 1re ou 2e page. Place moyenne : de 57 début novembre à 36 le 19.
- 2026-11-21 : sur la recherche du nom du site, les pages du dépôt GitHub passent devant. Fiche du dépôt : champ « site web » sur l'ancienne adresse Vercel, qui sert encore une copie du site (canonique vers chiph.re). Titre du README changé.
- 2026-11-21 : #2971 mergée (titre de l'accueil, titres d'onglet du glossaire). Rendu du titre vérifié à 320, 360, 390 et 1280 px : deux lignes au plus, sans défilement.
- 2026-11-21 : ancienne adresse Vercel redirigée vers chiph.re par David (308, vérifié sur l'accueil et sur une page du glossaire).
- 2026-11-21 : titres et descriptions des outils et des jeux (13 titres, 8 descriptions, libellés validés par David : « je te suis »). Sept pages du plan passent à `SeoHead` (Tortue, Programmes de calcul, Corvées Python, 2048, Trio, Démineur, Mathémo) : elles n'avaient ni adresse canonique ni balises de partage. Séparateur unique ` | Chiphre` sur toutes les pages du plan et les démonstrations. Garde : `titres-pages.test.ts`. Evoland laissée telle quelle (hors plan, jeu en sommeil).
- 2026-11-21 : #2974 mergée. Première CI rouge sur la garde de doc (exemption `Doc-inchangée:` ajoutée), seconde verte.
- 2026-11-21 : relevé des pages en 1re ou 2e page (place moyenne ≤ 20, export du 2026-11-16). Elles sont 68 en tout, dont 57 du glossaire et 11 autres (accueil, Shtam, chiffrement, jeux…) : le « 68 pages du glossaire » écrit plus haut était faux. Ces 57 pages : 594 affichages et 2 clics en 28 jours ; 13 seulement ont 10 affichages ou plus, 27 en ont 1 ou 2 (place peu fiable). Contenu en base : une définition seule (médiane 213 caractères, 13 sous 120), aucune image ; exemple à part, histoire et « Voir aussi » sur le seul chiffre de César (histoire aussi sur Kasiski), synonyme sur 3. Sur les 625 termes du glossaire : 4 ont un exemple à part, 18 un « Voir aussi », 7 une histoire.
- 2026-11-21 : David veut étoffer les pages du glossaire les mieux placées, et que j'écrive. 14 exemples écrits (les pages à 10 affichages ou plus), un par page, au niveau du terme ; relus par David (« tout OK »). Rendu vérifié dans `InlineMarkdown` (83 formules reconnues). Mise en ligne par migration de données, voie recommandée et suivie (« je suis tes recos ») : `20261121221131_glossaire_exemples_seo_contenu.sql`, garde « 14 entrées sans exemple », rollback éprouvé. Test rouge sans la migration (`dictionnaire-lecture`), vert avec. Limites notées : « Voir aussi » ne vise que le Cabinet Noir, pas de figure sur la page d'un terme.
