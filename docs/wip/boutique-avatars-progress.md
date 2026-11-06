# Boutique d'avatars — journal

## Reprendre ici

_Mis à jour le 2026-11-06, après #2449._

- **État** : PR 1 mergée (#2449) et **migration appliquée en prod** (`20261106164739`, via `db push --include-all` depuis `main` ; vérifié : 74/74 photos Google recopiées, 3 triggers, `buy_avatar` fermé à `authenticated`) ; catalogue vide · **Prochaine action** : PR 2 dans un nouveau worktree — d'abord `pnpm db:types` (types depuis la prod), puis routes achat / port, onglet « Avatars » du Marché, export RGPD · **En attente de David** : images du premier lot (`boutique-avatars-prompts.md`) · **Pièges en cours** : l'élève vient de la SESSION (`locals`), jamais du corps (les fonctions font confiance à `p_student_id`) ; consentement vérifié par la route ; export RGPD : ajouter `student_avatars` ; callback : rafraîchir `google_avatar_url` après `db:types` ; jusqu'au prochain `deploy:prod`, l'ancien callback de prod écrit l'avatar avec le client utilisateur → 42501 journalisé (connexion Google coupée de toute façon) ; job CI navigateur instable (2 relances sur #2449) · **Worktree / branche** : à créer pour la PR 2

## Décisions de David (2026-11-06)

- Avatars **achetés en gidouilles seulement**, à prix fixe, achetés une fois pour toutes. Aucun tirage, aucun gain par déblocage.
- L'avatar choisi **remplace la photo Google** partout ; la photo revient si l'élève retire son avatar.
- Visible **partout** où l'avatar s'affiche aujourd'hui (en-tête, chat, amis, classes, classements, vues du prof).
- Familles retenues : emblèmes du lore, Galopins et Galopines variés, polyèdres d'Achras, créatures des Mathres, marionnettes du Théâtre, animaux de la Cour, automates de Turingrad ; **cadres d'avatar** ; **séries de l'Almanach** (en vente pendant une fête) ; **animation au survol** pour les plus chers.
- Écarté pour l'instant : le blason personnel à composer (peut-être plus tard).
- Avatars par défaut (emblèmes Galopin / Capitaine / admin) : livrés par #2436, hors de ce chantier.

## Tranché par David (2026-11-06, « je valide »)

- **Phase 0** (comportements 1 à 17 ci-dessous) validée.
- **Q1** : l'avatar porté est écrit dans `profiles.avatar_url` (adresse de l'image du catalogue) ; la photo Google est gardée dans une nouvelle colonne et revient au retrait. Les cadres viendront dans leur propre PR (colonne propagée partout).
- **Q2** : premier lot = 3 avatars par famille (21) + 3 cadres ; animés et série de l'Almanach au second lot.
- **Q3** : prix 15 / 30 / 60 / 100, en base (modifiables sans déploiement).
- **Q4** : boutique réservée aux élèves ; le prof ne peut ni offrir ni retirer un avatar.
- **Question d'accès** : catalogue lisible par tout utilisateur connecté ; collection lisible par l'élève seul (ni prof ni admin ; elle figure dans l'export RGPD) ; avatar porté vu par ceux qui voient déjà `avatar_url`, ni plus ni moins. En miroir : plus personne ne peut réécrire sa propre `avatar_url` à la main — aucun code ne le fait, et la prod ne contient aucune adresse hors Google (mesuré le 2026-11-06 : 73 élèves + 1 prof Google, 9 vides, 0 autre).

## Phase 0 — comportements (validés)

### Nominal

1. Au Marché (onglet « Avatars »), l'élève voit le catalogue rangé par famille : image, nom, prix en gidouilles, et l'état « acheté » / « porté ».
2. L'élève achète un avatar : son solde baisse du prix, l'avatar entre dans sa collection, une ligne apparaît dans son journal des gidouilles (« Avatar : <nom> acheté », −prix).
3. L'élève porte un avatar de sa collection : il s'affiche aussitôt dans son en-tête, et partout ailleurs au chargement suivant (chat, amis, classes, classements, vues du prof).
4. L'élève achète puis pose un cadre : l'anneau entoure son avatar, quel qu'il soit (avatar acheté, photo Google, avatar par défaut).
5. L'élève retire son avatar : sa photo Google revient, ou le bonnet du Galopin s'il n'en a pas.
6. Pendant une fête de l'Almanach, la série de la fête apparaît au catalogue avec la mention « jusqu'au <date> » ; un avatar acheté reste à l'élève après la fête.
7. Les avatars les plus chers s'animent au survol (et une fois à l'affichage sur écran tactile), sauf si l'appareil demande moins d'animations.

### Limites

8. Solde insuffisant : achat refusé, « Il te manque N gidouilles », rien n'est débité.
9. Avatar déjà acheté : pas de second achat (bouton « Porter » à la place) ; deux clics rapides ne débitent qu'une fois.
10. Série de l'Almanach hors de sa fête : invisible au catalogue, achat refusé côté serveur, mais toujours portable par qui l'a déjà.
11. Sans consentement parental : achat refusé avec le même message que la boutique VIP et les décorations des Mathoux ; porter un avatar déjà acquis reste possible.
12. Un avatar retiré du catalogue reste porté et possédé par ceux qui l'ont acheté.
13. Le prof et l'admin ne voient pas la boutique (leurs avatars par défaut ne changent pas) — à confirmer, Q4.
14. Le prof ne peut ni offrir ni retirer un avatar (aucune gidouille ne bouge sans l'élève) — à confirmer, Q4.

### Erreurs

15. L'élève ne peut ni s'attribuer un avatar sans le payer, ni porter un avatar qu'il ne possède pas, ni écrire une adresse d'image de son choix : tout passe par le serveur, qui vérifie la possession.
16. Réponse inattendue de la base : erreur 500, jamais un faux succès ; aucune gidouille débitée sans avatar livré (une seule transaction).
17. Export RGPD : la collection d'avatars et l'avatar porté figurent dans l'export de l'élève ; ils sont effacés avec le compte.

### Prix proposés (calés sur les décorations des Mathoux : 10 / 20 / 40)

| Palier    | Prix | Exemples                                                   |
| --------- | ---- | ---------------------------------------------------------- |
| Courant   | 15   | emblèmes, créatures des Mathres, cadres simples            |
| Recherché | 30   | Galopins, animaux de la Cour, marionnettes, polyèdres      |
| Rare      | 60   | automates de Turingrad, séries de l'Almanach, cadres dorés |
| Animé     | 100  | variantes animées au survol                                |

### Questions à trancher

- **Q1 — Architecture (où vit l'avatar porté).** (a) Écrire l'avatar porté dans `profiles.avatar_url` (adresse de l'image du catalogue) et garder la photo Google dans une nouvelle colonne : les 15 fonctions SQL et ~96 fichiers qui lisent déjà `avatar_url` affichent l'avatar partout sans changement. (b) Nouvelle colonne « avatar porté » lue à côté de `avatar_url` : plus propre, mais à ajouter dans les 15 fonctions et dans tous les lieux d'affichage. Le cadre, lui, demande dans les deux cas une colonne propagée partout. Recommandation : (a) pour l'avatar, et le cadre dans la même PR de propagation.
- **Q2 — Premier lot.** Combien d'avatars par famille pour la v1 ? Proposition : 4 par famille (≈ 28 avatars) + 4 cadres, les animés et l'Almanach dans un second lot.
- **Q3 — Prix.** Les quatre paliers ci-dessus conviennent-ils ?
- **Q4 — Prof et admin.** Boutique réservée aux élèves (prof et admin gardent leur emblème), et le prof ne peut rien offrir ni retirer : d'accord ?

### Question d'accès (avant toute migration)

Qui pourra lire quoi, qu'il ne pouvait pas lire avant ? Proposition : le **catalogue** (noms, prix, images) lisible par tout élève connecté ; la **collection** d'un élève lisible par lui seul (et le prof ? — à trancher) ; l'**avatar porté** et le **cadre** lisibles par tous ceux qui voient déjà son `avatar_url` aujourd'hui, ni plus ni moins.

### Ordre des PR envisagé

1. Migration : catalogue, collection, fonctions d'achat et de port (`SECURITY DEFINER`, garde d'appelant), tests d'intégration rouges d'abord.
2. Code : onglet « Avatars » du Marché, achat, porter / retirer, export RGPD.
3. Images du premier lot (prompts Nano Banana, style Steinlen, nuancier numérique).
4. Cadres : colonne propagée et anneau dans `UserAvatar`.
5. Second lot : animés, série de l'Almanach.

## Historique

- 2026-11-06 : #2449 mergée (PR 1 : migration, garde, callback, doc) ; `db:migrate` fait.
