# Présentation pour les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-15, phase 0 (aucune PR)._

- **État** : phase 0, revue de `/parents` point par point (9 points, ci-dessous). Points 1 à 4 tranchés ; FAQ décidée.
- **Prochaine action** : point 5 (Ses données) : page ou FAQ, puis le texte.
- **En attente de David** : point 5 ; suite de l'étude Mistral (prix, hébergement) s'il la veut.
- **Pièges en cours** : ne promettre que ce que prouve `docs/systeme/carte-des-fonctionnalites.md` ; argent : jamais « gratuit » seul ni « pour toujours ».
- **Worktree / branche** : aucun encore (doc sur `main`) ; le code ira dans `views.ts` (`PARENT_VIEW`).

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
- **Mistral** : David veut étudier le chat de Mistral AI (gratuit si possible) à la place de Groq. Premier relevé (2026-11-16) dans § Étude Mistral.

## Les 9 questions du parent

1. Qu'est-ce que c'est, en une phrase ? — ✅ tranché.
2. Qui est derrière ? — ✅ tranché.
3. À qui mon enfant peut-il parler ? — ✅ FAQ.
4. Et l'IA ? — ✅ FAQ (+ une phrase au point 6).
5. Ses données ?
6. Est-ce que ça l'aide vraiment ?
7. Les jeux et les gidouilles ne vont-ils pas le distraire ? (bloc absent)
8. Comment le suivre ? (lien du cours public absent)
9. Comment l'inscrire, combien ça coûte ? (`/auth/register/parent` absent de la page)

## FAQ (textes de travail, non validés)

### À qui mon enfant peut-il parler ?

> Votre enfant n'échange qu'avec des élèves de son école, et seulement par le chat : celui de sa classe, ou à deux avec un camarade qui a accepté son amitié. Seul son professeur peut lui écrire en privé. Un message déplacé se signale d'un clic ; le professeur peut le supprimer et retirer à un élève le droit d'écrire. Jusqu'à la 2de, tant que vous n'avez pas donné votre accord, il ne peut écrire à personne.

- Preuves : `docs/systeme/messagerie-et-moderation.md` (frontière d'école, modération), `docs/systeme/realtime.md` (chat à deux = amis), `docs/systeme/conformite/consentement-parental.md` (lecture seule sans consentement, tout niveau sauf 1re/Tle).
- ⚠️ Ne pas promettre de filtre (4 mots, marque sans bloquer).
- ⚠️ Akadada « borné au groupe » (décision du 2026-10-21) **non codé** : pour un élève de cours particuliers, « son école » = Akadada entière. Question ouverte : coder avant de publier, ou la phrase suffit ?

### Le tuteur est une intelligence artificielle : que reçoit-elle ? (✅ validé)

> Père Ubu, le tuteur, guide votre enfant vers la réponse sans la lui donner, et le nombre de messages est limité. Ses messages partent chez un prestataire aux États-Unis (Groq), avec l'énoncé de l'exercice ; Chiphre n'y joint ni son nom, ni son courriel, ni l'identifiant de son compte. Un rappel, sous la zone de saisie, lui demande de ne donner aucune information personnelle.

- Preuves : `docs/systeme/tuteur-ia.md` § Données personnelles ; plafonds `src/lib/config/tutor-limits.ts`.
- Ne pas promettre : « rien de personnel ne part » (le texte saisi part tel quel) ; que Groq n'entraîne pas ses modèles (non documenté).
- Si le tuteur passe chez Mistral, ce texte change (pays, nom).

## Étude Mistral (premier relevé, 2026-11-16)

- **Pas d'API gratuite** d'après la doc officielle actuelle : le mode gratuit couvre Vibe et Studio, « Creating API keys and using the API require billing activation and pay-as-you-go » (docs.mistral.ai/admin/billing-usage/usage-limits). Le plan « Experiment » gratuit (2024) que citent des sites tiers semble périmé.
- **Mode gratuit = données utilisables pour l'entraînement** (opt-out possible) : à exclure de toute façon pour des mineurs.
- Payant : ZDR (zéro conservation) seulement en pay-as-you-go ; opt-out d'entraînement dans l'Admin.
- **À vérifier** : prix des petits modèles, région d'hébergement de l'API (UE ?), avant toute décision. Changer de prestataire = registre des sous-traitants + page de confidentialité + FAQ.

## Propositions en attente

(aucune)
