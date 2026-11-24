# Registre des écarts

> **Un écart s'écrit ici, et ici seulement.** Les docs système décrivent ce que fait le code et
> renvoient à ce fichier. Mode d'emploi, forme d'une ligne, preuves :
> [registre-des-ecarts.md](../pratiques/registre-des-ecarts.md). Ce fichier est lu par
> `pnpm ecarts` : une ligne de liste mal formée arrête la commande.

Une ligne : identifiant · type · domaine · ce que voit l'élève ou le prof · preuve · état.
Un nouvel écart entre par `pnpm ecarts ajouter`, qui donne son numéro. Une ligne close est barrée,
jamais effacée.

Derniers numéros : V71 · L36 · M22 · C20 · D21 · T18 · E62

## Écarts

- V17 · bug visible · mathAST · la primitive de eˣ sin x s'écrit avec deux fois ½ au lieu de ½(sin x − cos x)eˣ · preuve : test tests/ecarts/mathast.test.ts › V17 · à faire
- V31 · bug visible · tuteur IA · la page des statistiques du tuteur reste vide pour le prof (la classe n'est jamais envoyée avec la conversation) · preuve : commande `test -f src/lib/components/tutor/TutorChat.svelte && grep -q "classId" src/lib/components/tutor/TutorChat.svelte` · suspendu avec le tuteur (D21, 2026-11-03)
- V34 · bug visible · mathAST · la forme algébrique x + iy s'affiche à l'envers (iy + x) · preuve : test tests/ecarts/mathast.test.ts › V34 · à faire
- V35 · bug visible · mathAST · le i passe devant √3, dans la fraction, au lieu de suivre la fraction · preuve : test tests/ecarts/mathast.test.ts › V35 · à faire (décision du 2026-11-03)
- V39 · bug visible · mathAST · « ln 5² » tapé sans parenthèses est lu (ln 5)² au lieu de ln(5²) comme dans les manuels · preuve : test tests/ecarts/mathast.test.ts › V39 · à faire (décision du 2026-11-03, mesurer d'abord les modèles touchés)
- V40 · bug visible · mathAST · rien de visible dans l'Atelier, qui refuse honnêtement, mais le moteur répond « aucune solution » à des équations à valeur absolue qui en ont (|x| = x + 1, |x² − 1| = 3) · preuve : test tests/ecarts/mathast.test.ts › V40 · à faire (reste latent, la rédaction de |u| = c est faite)
- V48 · bug visible · mathAST · pour 2x³/x < 2, la réponse exclut 0 sans qu'aucune étape ne l'annonce (pas de « Comment ? ») · preuve : test tests/ecarts/mathast.test.ts › V48 · en attente (sélecteur résumé / détaillé de l'Atelier)
- V64 · bug visible · mathAST · trois intégrales à paramètre encore refusées, en français et sans réponse fausse (1/(x²+2x+a²), 1/(x²+a²+1), (x+1)^a de 0 à 1) · preuve : test tests/ecarts/mathast.test.ts › V64 · à faire
- L9 · bug latent · fiches PDF · un glyphe mathématique peut différer entre le PDF témoin local et la prod (police STIX Two Math lue sur un chemin macOS, absente du dépôt) · preuve : commande `test -f scripts/fiches/compile-prod.mjs && ! grep -q "/System/Library/Fonts" scripts/fiches/compile-prod.mjs` · à faire (décision du 2026-11-03)
- L15 · bug latent · mathAST · aucun effet visible, la boucle de simplification pédagogique s'arrête en silence à sa limite d'itérations (plus de boucle connue sur x(1+1)) · preuve : à la main · à faire
- L25 · bug latent · mathAST · factoriser une somme de 30 termes k·xᵏ·eˣ·sin x ne sort pas x (il sort jusqu'à 10 termes), cas peu probable chez un élève · preuve : test tests/ecarts/mathast.test.ts › L25 · à faire
- L28 bis · bug latent · mathAST · aucun effet visible, deux endroits du calcul de limites écrivent un nombre à la main sans passer par l'opposé pour un négatif · preuve : commande `test -f src/lib/mathAST/limits/evaluate.ts && test -f src/lib/mathAST/limits/composition.ts && ! grep -q "value: cleanNumberString(numericValue)" src/lib/mathAST/limits/evaluate.ts && ! grep -q "value: String(cleaned)" src/lib/mathAST/limits/composition.ts` · à faire
- L32 · bug latent · tuteur IA · la recherche hybride du tuteur échoue à chaque appel et retombe sur le plein texte (colonne content_tsv inexistante, pas de filtre enabled_for_rag) · preuve : à la main · suspendu avec le tuteur (D21, 2026-11-03)
- L33 · bug latent · tuteur IA · après 30 messages dans la journée, un élève n'a plus qu'un message par heure jusqu'à la purge de 02:00 UTC · preuve : à la main · suspendu avec le tuteur (D21, 2026-11-03)
- L36 · bug latent · anti-fraude · en cas de panne, le prof reçoit le message brut de la base, qui peut nommer des colonnes ou des contraintes (deux routes des signalements) · preuve : commande `f="src/routes/api/teacher/classes/[classId]/anti-fraud/flags"; test -f "$f/+server.ts" && test -f "$f/[flagId]/+server.ts" && ! grep -q "Err\.message" "$f/+server.ts" "$f/[flagId]/+server.ts"` · à faire
- M4 · code mort · base de données · aucun effet visible, la table worksheet_instances est vide et n'a plus ni lecteur ni écrivain · preuve : commande `test -d supabase/migrations && grep -rqiE "drop table[^;]*worksheet_instances" supabase/migrations` · à faire dans une PR à part, destructif (explication à David avant la migration, db:migrate lancé par lui)
- M19 · code mort · géométrie · aucun effet visible, trois interfaces de configuration Newton divergentes à unifier · preuve : commande `test -d src/lib/geometry-core/graph && test "$(grep -rlE "interface (NewtonConfig|IntersectionConfig|IntersectionConfig1D) " src/lib/geometry-core | wc -l)" -le 1` · à faire
- C13 · commentaire périmé · documentation · aucun effet visible, le journal du chiffrement est encore sous docs/wip alors que les lots sont livrés · preuve : commande `test -d docs/wip && ! test -f docs/wip/chiffrement-progress.md` · en attente de David (relecture des récits, puis archivage)
- D6 · décision produit · grapheur · sur un nuage de points, les places n'ont pas chacune leur forme de point · preuve : à la main · reporté (décision du 2026-11-03)
- T13 · RGPD · conformité · registre des sous-traitants à finir, Groq (clauses contractuelles, zéro rétention) reste à vérifier · preuve : à la main · à faire
- T14 · RGPD · conformité · les mentions légales et la page de confidentialité affichent encore « [À COMPLÉTER] » (identité, statut, directeur de publication) · preuve : commande `f="src/routes/(public)/legal"; test -f "$f/mentions-legales/+page.svelte" && test -f "$f/confidentialite/+page.svelte" && ! grep -q "COMPLÉTER" "$f/mentions-legales/+page.svelte" "$f/confidentialite/+page.svelte"` · en attente de David (il donne les informations)
- T15 · RGPD · conformité · AIPD encore en brouillon, contrats de sous-traitance (DPA) à archiver, procédure de violation de données à valider · preuve : à la main · en attente de David (DPA rangés dans son Drive, relecture de violation-de-donnees.md)
- E13 · vérification à l'écran · Atelier · sous Safari et iPhone, l'exposant de e^(x/2) est décollé (rendu de MathLive lui-même, le cas f⁻¹ est corrigé par #3067) · preuve : à la main · choix à faire par David
- E21 · vérification à l'écran · énigmes · en prod, aucune énigme du jour pour les élèves (une seule énigme en base, en brouillon) · preuve : à la main · contenu, David publie des énigmes (code inchangé)
- E29 · vérification à l'écran · Pansées · le message « Sa panse est pleine pour aujourd'hui » ne s'affiche jamais au plafond du jour · preuve : commande `test -f e2e/verifs/gamification.spec.ts && ! grep -q "écart #1471" e2e/verifs/gamification.spec.ts` · à corriger (PR I d'ecarts-verifs, tranché le 2026-11-24)
- E32 · vérification à l'écran · accessibilité · un lecteur d'écran lit les formules en anglais, balises comprises · preuve : à la main · à corriger (PR J d'ecarts-verifs, tranché le 2026-11-24)
- E33 · vérification à l'écran · questions · sous WebKit de test, la face « Réponse » d'une carte de question apparaît en miroir par-dessus l'énoncé · preuve : à la main · David regarde sur son iPhone et son Mac, corrigé si le miroir s'y voit
- E34 · vérification à l'écran · modèles de questions · en prod, la correction de « Factoriser un trinôme à l'aide de ses racines » n'écrit pas les facteurs dans l'ordre de x₁, x₂ quand a < 0 (code corrigé par #3075, contenu publié pas encore réécrit) · preuve : à la main · en attente de David (écriture en prod du lot factoriser-impossible-1spe)
- ~~E36 · vérification à l'écran · diaporama · sur /demo/diaporama, la flèche droite passe à la diapositive suivante sans montrer les lignes une à une · preuve : commande `test -f e2e/verifs/pages-demo.spec.ts && ! grep -q "écart #1737" e2e/verifs/pages-demo.spec.ts` · à corriger (PR H d'ecarts-verifs, tranché le 2026-11-24)~~ · clos le 2026-11-24 (preuve verte)
- ~~E37 · vérification à l'écran · carnet Python · dans le carnet présenté, la ligne suivante ne s'affiche à l'appui que 2 fois sur 6 · preuve : commande `test -f e2e/verifs/pages-prof-admin.spec.ts && ! grep -q "écart #1737" e2e/verifs/pages-prof-admin.spec.ts` · à corriger (PR H d'ecarts-verifs, tranché le 2026-11-24)~~ · clos le 2026-11-24 (preuve verte)
- E39 · vérification à l'écran · automaths · sous Safari et iPhone, /automaths produit environ 110 erreurs de console sur /api/teacher/classes · preuve : à la main · à creuser, puis présenter à David
- E41 · vérification à l'écran · Atelier · au téléphone, la grille de Données descend d'environ 300 px quand on écrit dans la barre de formule · preuve : commande `test -f e2e/verifs/atelier-paquet4.spec.ts && ! grep -q "écart E41" e2e/verifs/atelier-paquet4.spec.ts` · à corriger (PR K d'ecarts-verifs, choix A du 2026-11-24)
- E42 · vérification à l'écran · modèles de questions · sur « Résoudre une équation x² = a », {−√12 ; √12} est jugé faux au lieu de valoir un demi-point · preuve : à la main · contenu, David pose le réglage intervalles sur le modèle publié
- E46 · vérification à l'écran · blocs · barres et boîtes à moustaches rétrécies, texte de 7 à 8 px au téléphone · preuve : commande `test -f e2e/verifs/blocs-divers.spec.ts && ! grep -q "écart E46" e2e/verifs/blocs-divers.spec.ts` · à corriger (PR L d'ecarts-verifs, choix B du 2026-11-24)
- E53 · vérification à l'écran · réponses · dans une case sans unité, « 58, » est refusé sans message de forme · preuve : à la main · à présenter à David
