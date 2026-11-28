# Présentation pour les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-18 : chantier CLOS._

- **État** : `/parents` en prod (v0.95.0, 2026-11-18), vérifiée par David. Durable dans `docs/systeme/carte-des-fonctionnalites.md` § La roue des publics.
- **Reliquats, hors de ce chantier** : FAQ « À qui parler ? » à préciser quand « borné au groupe » d'Akadada sera codé ; limite des jeux et Mistral → futurs chantiers. Vues élèves et professeurs : chantiers à ouvrir à part.

## Cadre

- Contenu de la page : `src/lib/kingdom-tour/views.ts` (`PARENT_VIEW`), faits de `PARENT_FACTS` dans `src/lib/kingdom-tour/tour.ts`.
- Décisions antérieures : `docs/wip/roue-des-publics-progress.md` (2026-10-11), invariants dans `docs/systeme/carte-des-fonctionnalites.md` § La roue des publics.
- On réfléchit d'abord au parent ; élèves et professeurs plus tard.

## Décisions de David

### 2026-11-15

- **Deux publics de parents, visés tous les deux** : (A) le parent d'un élève de ses classes ; (B) le parent qui découvre (cours particuliers, future offre payante).
- **Méthode** : les 9 questions du parent, une par une ; pour chacune, ce qu'il faut enlever, préciser, modifier, ajouter.
- **Point 1, titre** : « Des maths sérieuses, dans un monde fantaisiste » (« absurde » est trop fort).
- **Point 1, chapô** : « Votre enfant s'entraîne, se trompe, comprend pourquoi, et recommence. Du CM1 à la Terminale, selon les programmes de l'Éducation nationale. » Ton d'une phrase sur l'enfant, pas une liste (« les deux autres sont des listes illisibles »). Plus de mot « cours » : la question tombe.
- **Point 2, texte** : « Chiphre est conçu par un professeur de mathématiques qui s'en sert chaque jour avec ses élèves. Agrégé de mathématiques, il est aussi ingénieur en informatique. » (sans les passions littérature / illusionnisme).
- **Point 2, anonymat** : gardé sur la page ; il sera levé plus tard pour ceux qui prennent contact.
- **Point 2, lien** : « Chiphre, c'est quoi ? » vers `/a-propos`, gardé.
- **Point 3** : retiré de la page, ira dans la FAQ (texte de travail ci-dessous, § FAQ).
- **FAQ** : en bas de `/parents`, questions repliées (option 1 ; données structurées `FAQPage` possibles). Il n'en existait aucune.
- **Chaque point restant se tranche « page ou FAQ »** avant son texte.
- **Point 4** : pas de bloc sur la page ; le tuteur est cité en une phrase au point 6 ; l'inquiétude va dans la FAQ (texte validé ci-dessous) ; on **nomme le prestataire (Groq)**.
- **Mistral** : David veut étudier le chat de Mistral AI (gratuit si possible) à la place de Groq. Premier relevé (2026-11-16) dans § Étude Mistral. **Remplacement de Groq : reporté** (« on y réfléchira plus tard »), hors de ce chantier.
- **Point 5** : le bloc « Ses données » quitte la page pour la FAQ ; « Sans publicité » reste sur la page (avec le prix, point 9). Texte FAQ validé.
- **Point 6** : reste sur la page ; les trois cartes deviennent un paragraphe (validé) :
  > **Ce que votre enfant y fait**
  > Quand il se trompe, la correction lui montre d'abord l'essentiel, puis le détail s'il le demande. Un mot de l'énoncé lui échappe ? Un clic, et sa définition s'affiche, à son niveau. S'il bloque, Père Ubu, le tuteur, l'aide à trouver sans lui donner la réponse. Et une question réussie revient juste avant qu'il l'oublie, jamais tout à fait la même.
  > → Voir Chiphre en action (`/demo`)
- **Point 6, démo « La forme compte »** : **retirée de la page parent** (« ça ne sert à rien » pour un parent) ; elle reste sur `/professeurs`.
- **Point 7** : FAQ (texte validé ci-dessous). **Les gidouilles ne s'achèteront jamais avec de l'argent réel** (décision durable, vaut aussi pour l'offre payante à venir). Préciser que les jeux sont de nature mathématique ou logique.
- **Futur chantier** (hors de celui-ci) : une **limite de temps ou d'utilisation des jeux**, pour que les élèves n'y restent pas trop longtemps ; aucune n'existe aujourd'hui, donc rien à promettre sur la page.
- **Point 8** : **bloc « Suivre son travail » retiré de la page pour l'instant** ; il sera réécrit **après le chantier `partage-parents`** (`docs/wip/partage-parents-progress.md`). Origine : « il y a une vraie réflexion à mener sur ce qu'on partage avec les parents, et comment on le fait ». Texte de travail en attente : « Son professeur peut vous donner deux liens, à ouvrir sans compte : le cahier de textes de la classe, avec les séances et les devoirs, et le cours, avec ses chapitres et ses documents. Il n'y a pas de compte parent. »

### 2026-11-17 (point 8, texte validé)

Le carnet de liaison est construit (ADR 0040). Texte proposé pour le bloc « Suivre son travail »
(en ligne seulement après le `deploy:prod` qui livre le carnet) :

> **Suivre son travail**
> Si son professeur l'active pour la classe, vous recevez par courriel le lien de son **carnet de liaison** : une page à vous, sans compte, qui montre s'il travaille régulièrement, s'il est à jour dans ses révisions et quelles évaluations il a faites, sans les notes. Vous y trouvez aussi le cahier de textes et le cours de la classe. Chiphre ne vous écrit que si quelque chose ne va pas, une fois par semaine au plus, et, s'il y a de quoi, une bonne nouvelle par trimestre. Votre enfant voit la même page que vous.
> → J'ai perdu mon lien (`/carnet/lien-perdu`)

### 2026-11-17 (point 9, texte validé)

Bloc « L'inscrire, et combien ça coûte » validé tel quel (« oui »), lien « J'inscris mon enfant » sur la page :

> **L'inscrire, et combien ça coûte**
> Si son professeur utilise Chiphre, il vous donne un code de classe : avec lui, vous inscrivez votre enfant en deux minutes. Pour les élèves des classes de son créateur, Chiphre est entièrement gratuit. Sans publicité.
> Pour des cours particuliers, écrivez-nous.
> → J'inscris mon enfant (`/auth/register/parent`) · Nous écrire

- Fait vérifié : `/auth/register/parent` exige un code de classe ; le parent B (sans code) passe donc par le contact.

### 2026-11-17 (FAQ « À qui parler ? »)

- Choix 1 (« je te suis ») : la FAQ « À qui mon enfant peut-il parler ? » est publiée **telle quelle** (la phrase « élèves de son école » est exacte aujourd'hui) ; « borné au groupe » d'Akadada sera codé **dans un chantier à part**, plus tard (migration + tests d'intégration + `security-auditor`). Si ce chantier aboutit, la phrase de la FAQ sera précisée.

## Les 9 questions du parent

1. Qu'est-ce que c'est, en une phrase ? — ✅ tranché.
2. Qui est derrière ? — ✅ tranché.
3. À qui mon enfant peut-il parler ? — ✅ FAQ.
4. Et l'IA ? — ✅ FAQ (+ une phrase au point 6).
5. Ses données ? — ✅ FAQ (sauf « Sans publicité »).
6. Est-ce que ça l'aide vraiment ? — ✅ page (paragraphe), démo forme retirée.
7. Les jeux et les gidouilles ne vont-ils pas le distraire ? — ✅ FAQ.
8. Comment le suivre ? — ✅ texte validé le 2026-11-17 (ci-dessus) ; en ligne après le `deploy:prod` du carnet.
9. Comment l'inscrire, combien ça coûte ? — ✅ texte validé le 2026-11-17 (ci-dessus) ; lien `/auth/register/parent` sur la page.

## FAQ (textes de travail, non validés)

### À qui mon enfant peut-il parler ? (✅ validé, 2026-11-17)

> Votre enfant n'échange qu'avec des élèves de son école, et seulement par le chat : celui de sa classe, ou à deux avec un camarade qui a accepté son amitié. Seul son professeur peut lui écrire en privé. Un message déplacé se signale d'un clic ; le professeur peut le supprimer et retirer à un élève le droit d'écrire. Jusqu'à la 2de, tant que vous n'avez pas donné votre accord, il ne peut écrire à personne.

- Preuves : `docs/systeme/messagerie-et-moderation.md` (frontière d'école, modération), `docs/systeme/realtime.md` (chat à deux = amis), `docs/systeme/conformite/consentement-parental.md` (lecture seule sans consentement, tout niveau sauf 1re/Tle).
- ⚠️ Ne pas promettre de filtre (4 mots, marque sans bloquer).
- ⚠️ Akadada « borné au groupe » (décision du 2026-10-21) **non codé** : pour un élève de cours particuliers, « son école » = Akadada entière. Question ouverte : coder avant de publier, ou la phrase suffit ?

### Le tuteur est une intelligence artificielle : que reçoit-elle ? (✅ validé)

> Père Ubu, le tuteur, guide votre enfant vers la réponse sans la lui donner, et le nombre de messages est limité. Ses messages partent chez un prestataire aux États-Unis (Groq), avec l'énoncé de l'exercice ; Chiphre n'y joint ni son nom, ni son courriel, ni l'identifiant de son compte. Un rappel, sous la zone de saisie, lui demande de ne donner aucune information personnelle.

- Preuves : `docs/systeme/tuteur-ia.md` § Données personnelles ; plafonds `src/lib/config/tutor-limits.ts`.
- Ne pas promettre : « rien de personnel ne part » (le texte saisi part tel quel) ; que Groq n'entraîne pas ses modèles (non documenté).
- Si le tuteur passe chez Mistral, ce texte change (pays, nom).

### Que deviennent ses données ? (✅ validé)

> La base de données de Chiphre est hébergée à Paris. Le site n'affiche aucune publicité et ne dépose que les cookies strictement nécessaires. Jusqu'à la 2de, votre accord est demandé : vous le donnez par un lien reçu par courriel. Depuis son compte, on peut télécharger toutes ses données ou supprimer le compte.
> → Vos données personnelles (`/legal/confidentialite`)

- Preuves : `PARENT_FACTS` (`src/lib/kingdom-tour/tour.ts`), carte des fonctionnalités § Points forts ; consentement : `docs/systeme/conformite/consentement-parental.md` (tout niveau sauf 1re/Tle, lien `/consent/[token]`).

### Les jeux ne vont-ils pas le distraire ? (✅ validé)

> Les jeux du Royaume sont de nature mathématique ou logique. Avec ses révisions du jour, ils lui rapportent des gidouilles, la monnaie du Royaume, qu'il dépense en petits privilèges que son professeur lui accorde en classe, ou pour décorer son personnage. Les gidouilles ne s'achètent pas avec de l'argent réel.

- Preuves : `docs/systeme/jeux-et-economie.md` (jeux, énigmes, révision du jour, cartes VIP, gestes du prof).

## Étude Mistral (premier relevé, 2026-11-16)

- **Pas d'API gratuite** d'après la doc officielle actuelle : le mode gratuit couvre Vibe et Studio, « Creating API keys and using the API require billing activation and pay-as-you-go » (docs.mistral.ai/admin/billing-usage/usage-limits). Le plan « Experiment » gratuit (2024) que citent des sites tiers semble périmé.
- **Mode gratuit = données utilisables pour l'entraînement** (opt-out possible) : à exclure de toute façon pour des mineurs.
- Payant : ZDR (zéro conservation) seulement en pay-as-you-go ; opt-out d'entraînement dans l'Admin.
- **À vérifier** : prix des petits modèles, région d'hébergement de l'API (UE ?), avant toute décision. Changer de prestataire = registre des sous-traitants + page de confidentialité + FAQ.

## Propositions en attente

(aucune)

## Historique

- 2026-11-17 : PR du code (`views.ts`, `AudienceView.svelte`, docs `carte-des-fonctionnalites.md` et `seo.md`). Tests : `views.test.ts` 11 rouges puis verts ; `AudienceView.svelte.test.ts` 3 rouges sans le composant, verts avec ; `check:incremental` 0 erreur ; cliquet tenu.
- 2026-11-17 : #2798 mergée (CI verte ; relecture `code-reviewer` sans bloquant, test `FAQPage` renforcé). Vérification manuelle notée.
- 2026-11-18 : v0.95.0 en prod, `/parents` vérifiée par David ; chantier clos, journal archivé.
