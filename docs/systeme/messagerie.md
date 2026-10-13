---
couvre:
  - 'src/routes/(protected)/messages/**'
  - 'src/routes/api/messages/**'
  - src/lib/stores/privateMessages.svelte.ts
  - src/lib/server/validation/messages.ts
  - src/lib/server/message-attachments.ts
  - src/lib/utils/message-attachment-rules.ts
---

# Messagerie (messages privés élève ↔ prof)

La **messagerie** est le système de type courriel : un message a un sujet, un contenu riche
(TipTap), des destinataires, des pièces jointes, des fils de réponse. Elle est distincte du
**chat** (conversations, temps réel, [realtime.md](realtime.md)), qui sert aujourd'hui aux élèves
entre eux. La modération, les notifications, les avertissements et les amitiés n'ont pas encore
leur doc (zone listée dans `trous`, `scripts/doc-a-jour.config.ts`).

## Qui écrit à qui

- Un **élève** n'écrit qu'à son professeur ; le **professeur** écrit à ses élèves, un par un ou à
  une classe entière (message de groupe). Liste proposée : RPC `get_allowed_recipients` (et
  `get_teacher_classes_for_messaging` pour le prof), via `GET /api/messages/recipients`.
- La règle est **tenue par la base**, pas seulement par l'écran : `send_private_message`
  (SECURITY DEFINER, appelée par `POST /api/messages/send`) refuse un expéditeur autre que
  l'appelant et vérifie les destinataires (`validate_message_recipients`,
  `validate_class_message_recipients`). `message_inbox` n'a **aucune** policy d'insertion : un
  message ne parvient à un destinataire que par cette fonction.
- L'envoi exige le consentement `send_message` (`requireConsent`).

## Tables et accès

- `private_messages` : le message (expéditeur, sujet, contenu, fil `thread_root_id`). Lu par
  l'expéditeur et par ses destinataires tant qu'ils ne l'ont pas supprimé ; le prof le lit pour la
  modération (`can_moderate_message`) ; l'admin lit tout.
- `message_inbox` : une ligne par destinataire (lu, étoile, dossier `user_folders`, statut
  `inbox` / `archived` / `trash`, `deleted`). Chacun ne voit et ne modifie que les siennes.
- `message_drafts`, `message_templates` (modèles du prof, routes `api/messages/templates/**`).
- `message_attachments_v2` : les pièces jointes (ci-dessous).

Conservation : 3 ans ([conformite/rgpd.md](conformite/rgpd.md)).

## Pièces jointes

Décision de David (2026-10-13) : un élève envoie par exemple le scan de son cahier au prof.
Jusque-là, le bucket n'existait pas en prod et toute pièce jointe échouait en silence.

- **Règles** (`src/lib/utils/message-attachment-rules.ts`, communes au navigateur et au
  serveur) : images JPEG, PNG, WebP, HEIC et PDF ; 10 Mo ; 3 par message. Le bucket
  `message-attachments` applique les mêmes limites (migration `20261016101300`).
- **Bucket privé, sans policy de storage** : seul le client service y dépose et en signe les
  liens. L'accès est décidé par `src/lib/server/message-attachments.ts` avec le client de
  l'utilisateur, donc sa RLS :
  - **envoi** — `POST /api/messages/[id]/attachments` : l'utilisateur est l'expéditeur du message,
    moins de 3 pièces jointes ; le serveur choisit le chemin (`messages/<message>/<uuid>-<nom>`) et
    rend un lien d'envoi à usage unique. Le navigateur dépose le fichier directement dans le
    storage (Vercel refuse les corps de plus de 4,5 Mo), puis enregistre la ligne
    `message_attachments_v2`, dont la policy d'insertion exige ce rangement ;
  - **lecture** — `GET /api/messages/attachments/[attachmentId]` : la RLS de
    `message_attachments_v2` rend la ligne (expéditeur, destinataire qui n'a pas supprimé le
    message, admin), puis redirection vers un lien signé d'une heure ; sinon 404.
- **Aucun lien public** : `public_url` n'est plus écrit ni lu.
- **Fin de vie** : la suppression du compte de l'élève retire ses fichiers
  ([conformite/rgpd.md](conformite/rgpd.md)) ; la purge des messages et le retrait d'une pièce
  jointe effacent la ligne, et le cron du dimanche retire les fichiers restés sans ligne
  (`list_orphan_message_attachment_files`).
- **Limite connue** : le type d'un fichier est celui que déclare le navigateur (le bucket le
  vérifie, pas le contenu). Le fichier est servi avec ce type et en téléchargement : un faux PDF
  ne s'exécute pas.

Tests : `tests/integration/messagerie-pieces-jointes.test.ts` (bucket, policies),
`tests/integration/messagerie-pieces-jointes-liens.test.ts` (envoi et lecture de bout en bout),
`src/routes/api/messages/__tests__/attachments.test.ts` (routes).

## Code

- Pages : `src/routes/(protected)/messages/` (boîte de réception, envoyés, archivés, brouillons,
  écriture `compose`, message `[id]`, fil `thread/[id]`).
- Store : `src/lib/stores/privateMessages.svelte.ts` (appelle les routes `api/messages/**`).
- Validation : `src/lib/server/validation/messages.ts`.
