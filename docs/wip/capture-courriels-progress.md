# Capture des courriels en local — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-17, après #2760._

- **État** : PR 1 mergée (#2760) : sur la base locale, les courriels sont capturés dans `.captures/courriels/`, rien ne part chez Brevo (`EMAIL_ENVOI_REEL=1` pour envoyer).
- **Prochaine action** : PR 2, nouveau worktree `../ubumaths-wt-capture-courriels`, branche `test/capture-courriels-carnet` : tests `e2e/verifs/carnet-*.spec.ts` (étapes 1 à 3 des vérifications manuelles du carnet, lignes #2724, #2731, #2736/#2737), liens lus par `readCapturedEmails`, inactivité de 15 jours posée en SQL local, captures téléphone clair/sombre, page à cocher.
- **En attente de David** : rien.
- **Pièges en cours** : la capture exige base locale (`localhost`, `127.0.0.1`, `*.ts.net`) ET hors Vercel ; au moindre doute → envoi réel. Worktree sans `.env.local` = base de prod = envoi réel. Les tests serveur qui n'ont pas de mock de `brevo` captureraient dans `.captures/` du worktree.
- **Worktree / branche** : aucun (PR 1 nettoyée).

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
