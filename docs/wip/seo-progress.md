# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-11-23, après #3033._

- **État** : titres et descriptions (#2971, #2974) en prod depuis la 0.100.0. Exemples du glossaire EN LIGNE sur les 57 pages en 1re ou 2e page de Google (export du 2026-11-16) : lot 1, 14 pages (#2978) ; lot 2, 42 pages (#3033, migrée le 2026-11-23, 42/42 en base, rubrique « Exemple » vue sur 6 pages de chiph.re) ; le chiffre de César en avait déjà un. Copies figées : `tests/fixtures/lexique/exemples-seo-2026-11-21.ts` et `-2026-11-23.ts`.
- **Prochaine action** : nouvel export Search Console vers le 2026-12-20, pour mesurer l'effet des titres et des 56 exemples (place et clics, à comparer au relevé du 2026-11-21 dans l'historique ; lot 2 posé deux jours plus tard).
- **En attente de David** : (1) le résultat de « Valider la correction » des 17 « noindex » (lancée le 2026-11-21) ; (2) le coup d'œil sur le grand titre de l'accueil au téléphone (`verifications-manuelles.md`).
- **Pas retenu pour l'instant** : « Voir aussi » vers d'autres termes et figures sur la page d'un terme (demanderaient du code ; « Voir aussi » ne vise que le Cabinet Noir).
- **Pièges en cours** : une PR qui touche des pages publiques ou une migration réveille la garde de doc (`Doc-inchangée:` dans un commit). Une copie figée neuve sous `tests/fixtures/lexique/` va dans le filtre `paths` de `nightly-integration.yml`. Les retours arrière des deux migrations d'exemples retirent les exemples même modifiés depuis dans l'admin (historique du dictionnaire). Le cache du dictionnaire (90 s) est par instance : une page peut rester sans exemple un moment après une migration. Formules hors du site : MathLive du projet, jamais MathJax. Le dépôt principal est relié à la prod, pas les worktrees (`migration list --linked` depuis le dépôt principal).
- **Worktree / branche** : aucun (retiré après #3033).

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
- 2026-11-21 : #2978 mergée (première CI rouge : copie figée absente du filtre `paths` de l'intégration, ligne ajoutée). `security-auditor` : 0 bloquant, 1 mineur laissé (retour arrière large). Question d'accès tranchée par David (« oui »). `db:migrate` : une seule migration en attente, la nôtre ; 14 lignes sur 14 portent leur exemple en prod, rubrique « Exemple » présente sur 4 pages relevées sur chiph.re.
- 2026-11-23 : lot 2 choisi par David (« Exemples pour les 43 »). 42 pages (le chiffre de César avait déjà son exemple) ; liste tirée de l'export du 2026-11-16 (place moyenne ≤ 20, glossaire, hors lot 1). 42 exemples écrits, relus par David dans une page à cocher (« je valide tout »), formules rendues par le MathLive du projet (première version avec MathJax : refusée, retirée). Question d'accès : « je valide tout ». Copie figée `tests/fixtures/lexique/exemples-seo-2026-11-23.ts`, migration `20261123093203_glossaire_exemples_seo_lot2_contenu.sql` (garde « 42 entrées sans exemple »). Rouge sans la migration (`dictionnaire-lecture`, `dictionnaire-en-base` : exemples manquants), 31/31 vert avec. Parseur du site : 276 formules reconnues sur 276.
- 2026-11-23 : #3033 mergée (un shard d'intégration rouge sur un test du carnet sans lien, vert à la relance). `security-auditor` : 0 bloquant, 1 mineur voulu (retour arrière large, documenté). `db:migrate` : une seule migration en attente, la nôtre ; 42/42 en base ; rubrique « Exemple » vue sur discriminant, quadruple, droite de Mayer, factorielle, grand cercle, cardinal.
