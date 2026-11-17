# Capture des courriels en local — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-17, après #2775._

- **État** : découpage fini et relu. #2760 (capture locale), #2771 (`e2e/verifs/carnet.spec.ts`, 3/3 verts), #2775 (phrase « Gardez ce courriel… » dans le courriel du lien). Relecture de David : 3 fiches OK ; courriel du lien corrigé par #2775 ; page du parent et « Mon carnet » → chantier `carnet-heatmap`.
- **Prochaine action** : clore : versement (la doc durable est déjà dans `docs/pratiques/`), journal archivé.
- **En attente de David** : rien.
- **Pièges en cours** : la suite ÉCRIT dans la base locale → sous verrou : `VERIFS_PORT=<port> bash scripts/with-db-lock.sh pnpm test:verifs carnet`, serveur de dev du même dossier lancé et chauffé avant. Le décor efface les limites de débit `carnet%`, renomme 3 élèves fictifs et désactive l'ancienne année scolaire de l'école (rétabli par `pnpm db:seed-riche`).
- **Worktree / branche** : aucun.

---

## Origine

Chantier ouvert le 2026-11-17 depuis `partage-parents` : David demande si Claude peut faire lui-même les vérifications manuelles du carnet de liaison (Chrome, Playwright, comptes locaux). Obstacle : en local, `sendEmail` passe par le vrai Brevo (`.env` = clé de prod) ; une adresse de parent saisie en local reçoit un vrai courriel.

## Phase 0 (validée le 2026-11-17)

Comportements proposés par Claude, David : « je te suis ».

1. Sur la base locale, aucun courriel ne part : écrit dans `.captures/courriels/` (`.html`, `.txt`, ligne dans `index.jsonl`).
2. L'appli voit un envoi réussi (le service compte comme configuré, même sans clé).
3. Les tests Playwright lisent l'index (`readCapturedEmails`).
4. Domaine fictif des enfants : toujours refusé, rien de capturé.
5. Sur Vercel, ou base distante, ou adresse de base illisible : envoi réel (une capture en prod avalerait les courriels des parents, sans bruit).
6. Écriture impossible : envoi noté en échec, rien ne part.
7. Le dossier ne se vide jamais seul.

**Q1 — bloquer l'envoi réel en local par défaut ?** Recommandation de Claude : oui, `EMAIL_ENVOI_REEL=1` pour envoyer quand même. Réponse de David : « je te suis ».

Écart avec la proposition écrite : la variable `EMAIL_CAPTURE=1` envisagée d'abord a disparu avec Q1 (la capture est le défaut en local) ; le signe du « local » est l'adresse de la base Supabase (`localhost` / `127.0.0.1`) et l'absence de `VERCEL`, pas une variable à poser.

## Découpage

1. PR 1 — capture (`src/lib/server/email/capture.ts`, `sendEmail`, `isBrevoConfigured`), tests serveur, doc (environnement-de-dev, rgpd, consentement-parental).
2. PR 2 — vérifications du carnet en Playwright (`e2e/verifs/`), captures d'écran des courriels et pages à largeur téléphone, page à cocher.

## Journal

### 2026-11-17 — PR 1

- Tests `brevo-capture.test.ts` : 4 rouges sans le code (capture, sans clé, dossier inaccessible, en-têtes), 9/9 verts avec. `brevo-domaine-fictif.test.ts` : mock de l'adresse de base (distante) ajouté, sinon il capturait.
- Revues : `code-reviewer` et `security-auditor`, aucun bloquant ; corrigés : ligne d'index tronquée (lecture qui levait), base jointe par le tailnet (`*.ts.net`, essais sur iPhone) qui envoyait encore pour de vrai.

### 2026-11-17 — PR 2

- `capture-index.ts` : lecture de l'index sans `$env` (Playwright l'importe) ; `capture.ts` la réexporte.
- Décor (`e2e/verifs/helpers/carnet.ts`, base locale seulement) : première classe active avec école et trois élèves fictifs ; remise à zéro du carnet de ses élèves, prénoms/noms inventés, consentement accordé pour A, A arrivé il y a 30 jours sans travail, année scolaire en cours si absente, limites de débit du carnet effacées, prénom + nom du prof local (`full_name` seul en local ; la page du prof signe avec prénom + nom, rempli en prod — vérifié en lecture seule).
- Écarts rencontrés, tous du décor, aucun bug : classe d'`eleve01` inactive ; prof local sans prénom (courriel sans nom du prof) ; limite d'ajout d'adresse de l'élève (6/h) atteinte en rejouant.
- Non couvert par les assertions (à l'œil) : lisibilité clair/sombre, barres vides discrètes ; évaluations « à venir / passées » (le décor n'en a pas) ; message trimestriel (à partir du 28 nov.).
- Revue `code-reviewer` (Sonnet) : aucun bloquant ; corrigés : garde `.env.local` sur la base locale, journal de la tâche lu pour CE passage (valeurs numériques exigées), relance exigée à 200 avec un nouveau passage, ancre `#courriels` testée à largeur téléphone, nom de famille cherché aussi dans le HTML. Laissés : attentes négatives de 3 s (« lien perdu », ajout neutre, relance), assumées.
- Connexion : saisie avant l'hydratation = champs vidés → attendre `networkidle` et vérifier les valeurs avant de cliquer.
- #2771 mergée le 2026-11-17 (CI 16/16 verte).

### 2026-11-17 — relecture de David

- Page à cocher : courriel de confirmation, page « confirmer », courriel d'exception → OK.
- Courriel du lien « À revoir » : remplacer « Lien perdu ? » par « Gardez ce courriel. Si vous ne le retrouvez plus un jour, demandez un nouveau lien (l'ancien cessera de fonctionner) » → #2775, mergée (CI verte).
- Page du parent et « Mon carnet » « À revoir » : la régularité doit être la heatmap de la grille du prof, depuis la rentrée → chantier `carnet-heatmap` (`docs/wip/carnet-heatmap-progress.md`).
