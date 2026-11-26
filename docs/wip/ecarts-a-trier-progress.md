---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; lot RGPD fait sauf T14 (lots B ensuite)
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-26, après #3163 (tests de preuve de géométrie)._

- **État** : **tests de preuve de géométrie et du grapheur écrits (#3163)** : L57, L58, L59, L60, L61, V77 ont leur test dans `tests/ecarts/geometrie.test.ts`, tous rouges (journal : [ecarts-preuves-geometrie-progress.md](../archive/wip/ecarts-preuves-geometrie-progress.md)). **ménage du 2026-11-26** : chantier `ecarts-moderation` clos (T20 à T22, T25, T27 à T33 barrés ; T34, L125 ajoutés) ; sections « Écarts » de 33 docs système remplacées par un renvoi au registre (un point n'est retiré que s'il est au registre, corrigé ou faux ; les faits voulus restent sous « À savoir (voulu) », le reste sous « Points non vérifiés ») ; L126 (anti-triche) et T35 (purge des données pédagogiques) ajoutés ; `ecarts-a-trier.md` et `ecarts-a-trier-recollecte.md` archivés dans `docs/archive/wip/`. **modération, PR 1 (#3115)** : T20, T25, T27 clos ; T28, T29, L122, L123 ajoutés (restes des revues ; journal : [ecarts-moderation-progress.md](../archive/wip/ecarts-moderation-progress.md), chantier clos le 2026-11-26) ; reste T21 et T22 (PR 2), T24 suspendu avec le tuteur. **Valeurs fausses mathAST corrigées (#3108)** : V85, V92, V103 clos ; L117 à L121, V124, V125 ajoutés (deux familles de valeurs interdites refusées, par décision de David ; restes de la revue ; journal de la PR : [ecarts-valeurs-fausses-progress.md](ecarts-valeurs-fausses-progress.md)). **Messagerie privée réparée (#3100)** : boîte de réception, archives et envoyés s'ouvrent (V105 clos ; V104 reste ouvert pour le seul lien dans le menu ; T27 ajouté : la réponse refusée par sa validation part entière dans les journaux du serveur ; journal de la PR : [messagerie-boites-progress.md](messagerie-boites-progress.md)). **Tests de preuve mathAST écrits (#3098)** : 37 écarts (V78 à V103 ; L62 à L65, L67 à L69, L71, L72, L75, L77) ont leur test dans `tests/ecarts/mathast.test.ts`, tous rouges ; L73 clos (faux écart : `tidy(f, { domain: [f] })` rend déjà 2, le tri avait mal posé l'option ; `docs/systeme/mathast/README.md` l. 1873 est donc périmée) ; L66 reste à la main (aucune saisie ne le déclenche). **Étape 3 faite, page à cocher comprise** (30 réponses lues le 2026-11-24 : 25 choix, 5 remarques vérifiées ; D22 à D32 mis à jour, D26 et D29 clos, D33 à D44 ajoutés, états de V103, V104, V105, L87 précisés ; détail : § « Décisions du 2026-11-24 ») : les 225 points de la recollecte ont été vérifiés dans le code par 9 agents ([ecarts-tri/](ecarts-tri/README.md) : un fichier par lot, index source → écart). **210 écarts entrés au registre** (V72 à V123, L37 à L116, M23 à M58, C21 à C43, D22 à D32, T19 à T26) ; [registre.md](../ecarts/registre.md) porte 266 écarts ouverts (D24, D26, D29 clos par décision, D44 clos faux écart, L51 clos par #3092 ; d'autres sessions y ajoutent des lignes, recompter par `pnpm ecarts`) ; avant les décisions, au rejeu : 133 preuves rouges, 0 verte, 0 cassée, 118 « à la main ». Non entrés : 31 « pas un écart », 12 corrigés, 4 faux, 13 non vérifiés (prod ou navigateur), 2 doublons (liste dans l'index). E54 à E63 étaient déjà au registre.
- **Prochaine action** : **ordre suivi, choix de Claude et non décision de David** (« je te suis », 2026-11-24) : les écarts graves de modération sont faits (chantier `ecarts-moderation` clos le 2026-11-26), donc ensuite les tests de preuve. (Valeurs fausses mathAST : faites par #3108.) **Tests de preuve à écrire** pour les écarts hors mathAST encore « à la main » faute de test (`grep -c "test de preuve à écrire" docs/ecarts/registre.md` : 37, dont 2 lignes closes ; géométrie faite par #3163 ; restent, par lot : coquille 7, messagerie 6, pédagogie 5, tuteur-documents 3, comptes-evaluations 2, utilitaires 2, mathAST de #3108 7, modération de #3115 2 ; décrits dans leur lot : coquille, messagerie, pédagogie, comptes-evaluations, tuteur-documents, utilitaires ; une PR par domaine, fichier `tests/ecarts/<domaine>.test.ts`) ; les 13 « non vérifiés » (requêtes de lecture en prod écrites dans les lots, rendu iPhone) ; (4) tâche de nuit commune avec `verifs-auto` ; (5) retrait des sections d'écarts des docs : **fait le 2026-11-26** pour les 33 docs à section « Écarts » ; reste les sections « Points ouverts », « Limites », « Doutes » qui mêlent écarts et mises en garde (`mathast/README.md`, `atelier.md`, `ubumark.md`, `carnet-de-liaison.md`…), et les « Points non vérifiés » laissés dans les docs. **À faire aussi** : M4 (`DROP worksheet_instances`, PR à part : grep des usages + nombre de lignes + ce qui sera perdu expliqués à David avant la migration) ; page à cocher pour la relecture de `violation-de-donnees.md`. Écarts à corriger en premier (les plus graves du tri) : messagerie privée en panne (V104, V105), valeurs fausses mathAST (V85 domaine de 1/(sin x cos x), V92 `x² − ab = 0`, limites à paramètre sans condition), modération (T20 à T22), capture d'écran d'un signalement supprimé (T25), élève archivé qui lit encore les documents du prof (T24) ; puis V35, V39, L9, L36. (V104 / V105 : faits par #3100, sauf le lien.)
- **En attente de David** : **le lien « Messages » dans le menu** (V104 ; décidé le 2026-11-24, question posée deux fois sans réponse : pour tous les élèves tout de suite, ou après son essai de la messagerie réparée ? emplacement à proposer avec une capture) ; D42 (il relit trois passages des programmes) ; T14 (il donne identité de l'éditeur, statut, directeur de publication → PR des mentions légales) ; DPA (il range les 6 PDF dans son Drive privé et le dit → date à noter dans la doc de conformité) ; relire `conformite/violation-de-donnees.md`.
- **Pièges en cours** : **rejouer chaque affirmation d'un test de preuve sur un cas témoin qui marche déjà** (sinon un test peut rester rouge l'écart corrigé : positions de `Figure.getPosition` comparées sans `geoToNumber`, #3163) ; **le test proposé par un lot du tri n'est pas à recopier tel quel** : le sonder d'abord (L73 était faux, le test de L72 demandait des fractions de polynômes et non des fractions de nombres) et le faire relire pour les verts à tort (`not.toContain` sur une réponse vide) ; une ligne du registre = commit de doc direct sur `main`, mais un **test de preuve est du code** (branche + PR) ; un test de preuve écrit l'extension de ses imports `#lib` (`…/calcul.ts`, garde `imports-lib-avec-extension`, rouge en CI sinon) et n'avale aucune erreur (un `catch` large le rendrait vert à tort) ; preuve des E à `test.fail` = commande qui grepe le marqueur (« écart #1471 ») dans la spec : le retirer à la correction ; `ecarts-verifs` barre elle-même E36 / E37 après sa PR H ; **`pnpm pr:merger` lancé juste après un push relit la CI de l'ancien commit** : attendre que la nouvelle CI ait démarré ; `pnpm ecarts ajouter` depuis le dépôt principal après `git pull --rebase` ; une preuve par commande négative (`! grep`) affirme d'abord que le fichier existe ; les 225 points sont à vérifier dans le code ; sondes mathAST par le chemin de l'Atelier, jamais `pnpm math` ; `db:migrate` lancé par David.
- **Worktree / branche** : aucun (celui du versement retiré au merge de #3081).

---

## Décisions du 2026-11-24 (page à cocher, 30 réponses)

Page : https://claude.ai/artifact/AtRM1gcaCSEc8M61HTZo2s (collection `reponses`, `q01` à `q30`, 30 documents lus).

- **Cochées, à faire** : q01 → D22 · q02 → D23 · q06 → V104, V105 (réparer la messagerie, lien dans le menu) · q09 → D27 · q10 → D28 · q13 → D31 · q14 → D32 · q16 → D34 · q18 → D36 · q19 → V103 · q20 → D37 · q21 → D38 (un seul courriel) · q22 → D39 · q23 → L87 · q24 → D40 · q28 → D41 (écran de rangement ; « ces exercices peuvent rester hors programme ») · q30 → D43.
- **Cochées, rien à faire ou reporté** : q05 → D25 (Documents cachée) · q07 → D33 (chantier SEO) · q08 → D26 clos · q11 → D29 clos · q15 (fraction unique gardée, pas de ligne) · q17 → D35 (« on garde pour l'instant mais il faudra voir si on fait la bascule ») · q25 (boîte à moustaches telle quelle, pas de ligne) · q29 → D42 (listes validées, David relit).
- **Remarques, vérifiées** :
  - q03 « je ne comprends pas » → question reposée avec un exemple : « oui ça me va » (2026-11-24). D24 clos, exception notée dans l'ADR 0005 ; l'écart n° 1 de `docs/systeme/cours-et-chapitres.md` § Écarts connus est à retirer à l'étape 5.
  - q04 « le bouton Roue de la fortune existe dans le dashboard teacher » → vrai (`TeacherDashboard.svelte`, bouton qui ouvre une fenêtre) ; le tri avait vu la page `/dashboard/teacher/wheel`, qui est un doublon sans lien. Constat de D25 corrigé.
  - q12 « chantier sur la fusion de l'atelier avec le CLI » → vrai, chantier `registre-reference` (sa règle R2 : la console est un terminal sur le registre commun). D30 porté par ce chantier.
  - q26 « il me semble que j'ai complété tous les niveaux » → vrai pour le primaire et le collège. Points du programme sans question ni exercice, en prod : CP 6/84, CE1 4/107, CE2 4/97, CM1 3/171, CM2 6/158, 6e 4/111, 5e 9/143, 4e 1/82, 3e 1/66, 2de 18/293, 1re gén. 0/64, 1re spé 7/237, 1re techno 28/143, Tle spé 28/326, Tle techno 19/92, Tle comp. 101/179, Tle exp. 116/176. La question du tri (« le CE1 a beaucoup de points sans question ») était fausse ; pas de ligne.
  - q27 « c'est peut-être déjà fait » → non : 5 lignes sur 47 du CSV sont rattachées (1re gén. 1/18, 1re techno 3/25, 2de 0/2, Tle spé 0/1, Tle techno 1/1). Mais David avait raison sur le fond (« on était censé partager certains modèles entre les niveaux de première ») : les 34 points du programme visés par la liste ont tous au moins un modèle en prod, et 108 des 147 modèles de 1re techno sont partagés avec la 1re spé ou générale ; la liste (2026-10-24) ne nomme que des modèles à retoucher, remplacés depuis par d'autres. D44 clos, faux écart.
  - Page de la roue (D25) : David dit « retire-la » (2026-11-24) → #3092 mergée, L51 clos avec la page.
- Exercices non rangés : 100 en prod, pas 51.

## Décisions de David (2026-11-24, harmonisation des suivis : « je suis tes recos »)

1. **Un registre unique** pour les écarts de la doc (V, L, M, C, D, T) et les E de `ecarts-verifs-progress.md` : une ligne par écart, avec son type, sa source et sa **preuve rejouable** (le test ou la commande qui dit s'il est encore vrai). `verifications-manuelles.md` reste à part : ce sont des choses à regarder, pas des défauts ; une vérification qui échoue produit un écart, qui entre au registre avec un renvoi vers sa ligne.
2. **Un écart s'écrit au registre seul.** La doc système décrit ce que fait le code et renvoie au registre ; ses sections « Écarts connus » disparaissent.
3. **Une seule tâche de nuit** (commune avec `verifs-auto`) : elle rejoue les preuves, `test:verifs` et les gardes de doc, écrit un bilan ou ouvre une PR, ne merge jamais.
4. **Les 225 points jamais triés** : vérifiés dans le code par des agents, par domaine, avant d'entrer au registre ; seules les décisions de produit vont à David, sur une page à cocher.

Sessions `ecarts-verifs` et `verifs-auto` prévenues le 2026-11-24 (elles continuent ; `verifs-auto` ne crée pas la tâche de nuit de son côté).

## Registre unique : phase 0 validée par David (2026-11-24, « je valide tes recos »)

- **Où** : un seul fichier, `docs/ecarts/registre.md` (commit de doc direct sur `main`, sans CI). Les scripts le lisent ; aucun test ne lit `docs/` (fixtures sous `tests/fixtures/`).
- **Une ligne** : identifiant (les numéros actuels sont gardés : V35 reste V35, E41 reste E41) · type · domaine · ce que voit l'élève ou le prof · preuve · état. Exemple : `V35 · bug visible · mathAST · le i passe devant √3 · preuve : test « rouge attendu » de tidy-sum-lead.test.ts · à faire (décision du 2026-11-03)`.
- **Nominal** : chaque nuit, la tâche rejoue la preuve de chaque écart ouvert. Preuve toujours rouge : rien ne bouge. Preuve verte : **la tâche barre elle-même la ligne** (commit de doc sur `main`, validé par David) et l'écrit dans le bilan du matin.
- **Limites** : un écart sans preuve possible (décision de produit, papier RGPD) porte « preuve : à la main », n'est jamais rejoué et sort dans une liste à part. Un nouvel écart entre par une commande qui donne son numéro (pas deux E53).
- **Erreur** : une preuve qui ne peut plus tourner (fichier disparu, test renommé) est marquée « preuve cassée » dans le bilan ; une ligne n'est jamais fermée sur une preuve cassée.
- **Ce que reçoit David** : un bilan par nuit (clos, nouveaux, preuves cassées) ; une page à cocher seulement quand des décisions de produit attendent.
- **Ordre** : (1) registre + commande (lire, rejouer, numéroter), avec tests ; (2) versement des écarts ouverts d'`ecarts-a-trier.md` et des E d'`ecarts-verifs-progress.md` (prévenir la session `ecarts-verifs` du format) ; (3) tri des 225 points par domaine, vérifiés dans le code par des agents ; (4) tâche de nuit commune avec `verifs-auto` (s'accorder avec cette session sur ce qu'elle lance) ; (5) retrait des sections « Écarts connus » des docs système, remplacées par un renvoi.

## Fait le 2026-11-24

- **Registre unique, étape 2 : versement** (commits de doc `48cc35d29` et suivant, **#3081**) : 35 lignes. Non versés : C14, L12, L20 (clos le jour même), les E corrigés ou laissés. Preuves : 8 écarts mathAST par test (`tests/ecarts/mathast.test.ts`), 13 par commande, 14 à la main (décisions, RGPD, contenu en prod, tuteur suspendu, L15 : pas de test sans règle factice dans `runPatternLoop`, non exportée). La revue a trouvé deux tests qui pouvaient passer au vert à tort (erreur avalée pour V40, « pas un refus » trop lâche pour V64), corrigés avant la PR. L25 corrigé : le défaut est sur `k·x^k`, pas `k·x^{k-1}`. L28 bis : 14 sondes de limites, aucun nombre négatif mal formé produit ; preuve par commande sur le code. Sessions `ecarts-verifs` et `verifs-auto` prévenues du format.

- **Registre unique, étape 1** (**#3078**) : registre, commande `pnpm ecarts`, tests (62), doc. Fixé en codant, hors phase 0 : un test de preuve vit sous `tests/ecarts/` et arrive par une PR ; `rejouer` sort en 0 même avec des preuves rouges ou cassées (le bilan le dit) ; le registre est relu juste avant d'être barré (remarque de la revue).
- **C14** : #2451 fermée (27 conflits avec `main`), refaite en **#3077**, mergée (une fixture de corpus, modifiée à tort par le remplacement de chemins, restaurée avant le vert).
- **Docs système** (commit direct `fcbec7c17`) : la liste B de la recollecte annonçait 17 lignes périmées ; vérifiées dans le code, **7 l'étaient** et sont corrigées (Renommer et unités dans `atelier.md`, L22 dans `mathast/README.md`, C1 dans `architecture-generale.md`, M20 dans `questions.md`, D18 dans `carte-des-fonctionnalites.md`, `worksheet_instances` dans `base-de-donnees.md`). Les autres disent encore vrai (M7, M10, M16, L11, T5 : écarts fermés par décision, le fait décrit demeure) ou demandent une sonde (ligne « valeur fausse » de `mathast/README.md` § limites, rapprochée à tort de V71 ; `conformite/README.md` rétention). La liste B n'est donc pas fiable ligne à ligne.
- **L20** : limite des 15 chiffres écrite dans `ubumark.md` → clos. **L12** : clos (« Renommer » actif, provenance disparue, `recomputeAll` mesuré le 2026-10-19 d'après `atelier.md`).

## Historique

- **2026-11-24** — revérification des 22 écarts ouverts et des 11 T par 3 agents (mathAST par sondes, reste du code par lecture, recollecte des docs). 5 corrigés ou réduits, 8 T clos, 225 points jamais triés relevés.
- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.

## Décisions de David (2026-11-01, sur mes recos)

- V65 reste `|x^2-1|=3` : **refus gardé** (périmètre affine voulu de `absolute-value.ts`) ; à rouvrir seulement si un modèle de 1re en a besoin.
- #2061, #1850 : à merger (CI fraîche) ; #1802 à fermer.
- Tests RLS `it.skip` « deux profs » : **supprimés**. Agent `mathast-expert` : **corrigé** (`e` = constante d'Euler, `i` = nœud `complex`).
- Liste A : **L8 d'abord** ; **M19 jamais seul** (seulement en passant, dans un chantier de géométrie) ; **L12 sur demande** seulement.
- Écriture : racines approchées → **décimal arrondi avec ≈** (ou forme exacte), jamais une fraction décimale géante ; `\sin(x)^2` → **`\sin^2(x)`** ; `\dfrac{-6}{\pi-9}` → **`\dfrac{6}{9-\pi}`** (dénominateur positif ; touche `tidy` → chantier `fusion-moteurs`).
- `a(x) = x^2` puis `a = 2` : **fonction constante gardée** (cohérent avec #905), l'Atelier doit afficher `a(x) = 2`.

## Décisions de David (2026-11-03, page à cocher RGPD, toutes mes recos validées)

- **T1** présence des amis : relecture toutes les 60 s, `user_presence` reste non publiée. Phase 0 validée : ami en ligne si signal de vie < 270 s (calcul navigateur, pas de cron), échec → dernier statut gardé, abonnement et bandeau « système de présence » retirés.
- **T2** canaux match / présence / notifications / succès : ~~passer en privé~~ → mesure en prod (2026-11-03) : ils ne portent que des `postgres_changes` filtrés par la RLS, le privé n'apporte rien. **David a choisi une garde de test** (`canaux-publics-garde.test.ts`), sans passage en privé.
- **T3** canal privé gardé après retrait d'un droit : limite acceptée et documentée (`realtime.md`) — fait.
- **T6** CSP `unsafe-eval` : tester si `wasm-unsafe-eval` suffit à Typst ; sinon le restreindre aux pages PDF.
  - **Mesuré le 2026-11-03** : `wasm-unsafe-eval` ne suffit pas (le WASM Typst appelle `new Function`), et une CSP par route casse à la navigation côté client. **David : garder `unsafe-eval`, documenter** (`auth.md`, point 12) — fait. Futur chantier possible : nonces à la place de `unsafe-inline`.
- **T7** deux `requireAuth` : renommer celle qui redirige (`requireUserOrRedirect`) et passer les ~32 routes à la garde commune, avec revue sécurité.
  - **Fait, #2311 (2026-11-03)** : 62 endpoints migrés (rôles identiques, jamais `requireAdmin`) ; laissés `admin/elevate*`, `auth/logout`, `errors/log`. Revue sécurité : aucun accès gagné. Constats hors périmètre jugés sans suite : `python-exercises/mastery` prend `student_id` du client mais la RLS (`pem_select_own` / `pem_select_teacher`) borne ; correction d'un devoir ouverte à tout prof (mono-prof). Journal : [archive](../archive/wip/garde-auth-commune-progress.md).
- **T8** limiteur en mémoire : unifier sur le limiteur en base, supprimer celui en mémoire.
  - **Fait, #2325 (2026-11-03)** : `rateLimit()` (12 appels, désormais `await`) et la `Map` de `api/admin/cron/trigger` comptent dans `rate_limits` via `checkEndpointRateLimit`, échec ouvert ; double `fake-rate-limiter.ts` pour les tests de routes. Revues : code rien de bloquant ; sécurité aucun accès gagné, rien de bloquant. Constats ouverts : **`account/delete` 1 / 24 h devient une vraie limite**, comptée avant la suppression (un échec en cours empêche de réessayer 24 h → question à David) ; `error-log` par IP partagé derrière le NAT d'un collège (20/min pour toute la classe, faible) ; IP dans `rate_limits` ajoutée au § conservation de `rgpd.md`.
- **T9** double CSRF : garder les deux, documenté (`auth.md`) — fait.
- **T12** grâce du consentement : 30 jours glissants, doc corrigée (conformité) — fait.
- **T13** registre des sous-traitants : HuggingFace (non activé) + Vercel Analytics ajoutés — fait.
- **T14** mentions légales : David donne les infos (en attente).
- **T15** dans l'ordre : archiver les DPA (Supabase, Vercel, Sentry, Groq), bouton « signaler » dans le chat, finaliser l'AIPD.
  - **2026-11-03** : le signalement existait déjà et sert en prod (4 signalements, tous traités) ; seul défaut, le menu « ⋮ » n'apparaissait qu'au survol → **#2330** (visible au toucher et au clavier, réactions comprises). DPA : David a choisi un **Drive privé** ; les 6 DPA en vigueur (Supabase, Vercel, Sentry, Groq, Google Cloud en français, Brevo) imprimés en PDF ; lien Groq du registre corrigé (404). AIPD : David a choisi « doc + #6 » → statuts à jour, procédure de violation rédigée (`conformite/violation-de-donnees.md`, à valider) ; #1 rétention pédagogique = futur chantier, #8 attend T14.

## Décisions de David (2026-11-03, page à cocher lot B)

Page : https://claude.ai/artifact/J4Z8UfhGXAwSafQX59x1nm (20 fiches, revérifiées le jour même).

- **Destructif** : **M4** `worksheet_instances` (0 ligne, aucune FK ni fonction) → PR de code (décompte « Publié pour N élève(s) » sur les élèves de l'affectation au lieu de la table, toujours 0 aujourd'hui ; `canStudentAccessInstanceCorrection` sans appelant retirée), puis `DROP` après le `deploy:prod` suivant. **M11** `class_google_classroom_links` (0 ligne, aucune référence dans `src/`) → `DROP` + `db:types` + ligne de `scripts/generate-db-doc.ts`. **M20** retiré de la liste : `question_templates.type` est lu (stats prof, anti-fraude, filtres admin).
- **Fermés** : V4 (tableur retiré, 55bc75c0d), V8 (ADR 0007 faite), M2 (`'graphical'` porte les cases figure), V41, D10 + L11, D20.
- **V35** : partie imaginaire écrite **i derrière** : `-\dfrac{1}{2} + \dfrac{\sqrt{3}}{2}i` (aujourd'hui `\dfrac{i\sqrt{3}}{2}`, mesuré).
- **V39** : `\ln 5^2` lu **ln(5²)** comme les manuels, après mesure des modèles touchés (aujourd'hui (ln 5)², mesuré).
- **V40** : rédiger |u| = c ⇔ u = c ou u = −c (c > 0), u = 0 (c = 0), ∅ (c < 0).
- **V48** (a) : en attente du sélecteur résumé / détaillé. **V49** : limite connue, fermé. **L20** : limite connue, à écrire dans la doc.
- **L9** : STIX Two Math (OFL) dans le dépôt, polices listées. **D6** : reporté.
- **M8** : retirer l'export `.tex` d'ubumark. **M22** : **garder** les règles trigo / hyperboliques (futur « Comment ? » trigo).
- **D11 + C10** : renommer « capacité » dans le code (point du programme). **C14** : `src/lib/lexicon/` → `src/lib/dictionary/`.
- **D21** : tuteur en pause, V31 / L32 / L33 suspendus avec lui. **C13** : David relit les récits du chiffrement (→ vérifications manuelles).
- **Sans choix** : **L13** (commentaire : « l'atelier est censé lire tout seul les unités ») et **V63** (« je ne comprends rien ») → reposés dans la conversation.

## Lot B, avancement (2026-11-03)

- **M4** (#2340) : « Publié pour N élève(s) » compte les élèves de l'affectation ; `canStudentAccessInstanceCorrection` retirée ; plus aucun code ne lit `worksheet_instances`. `DROP` après le prochain `deploy:prod`.
- **M11** (#2342 + #2345) : `class_google_classroom_links` supprimée (0 ligne, aucune dépendance), migration `20261103170936` appliquée en prod par David ; types régénérés.
- **M8** (#2343) : export `.tex` d'ubumark retiré (`latex-generator.ts`, `variation-table-latex.ts`, `probability-tree-latex.ts` + tests).
- **L13 fermé** (2026-11-03) : déjà tranché (lecture naturelle des unités, 2026-10-11, `grandeurs.md`) ; question reposée à tort.
- **V63 fermé** (2026-11-03) : corrigé depuis le 2026-10-19 (`atelier.md`, « Noms indicés ») ; la liste ne l'avait pas noté.
- **D11 + C10** (2026-11-04, `chore/ecarts-renommer-capacite`) : « capacité » → `CurriculumPoint` dans le code (composants, fonctions, fichiers, textes vus par l'élève et le prof, paramètre `?point=` de l'API anti-triche), « famille A » retiré des commentaires. David : code seul d'abord, la colonne `capacity_point_id` à part ; nom `CurriculumPoint`. Trouvé en route et corrigé : `GET …/anti-fraud/flags` lisait `row.skills` alors que la requête embarque `curriculum_points` → chaque drapeau sans point (« Toutes capacités ») ; test rouge sans le correctif.
