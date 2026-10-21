# Inscription par le parent — journal

## Reprendre ici

_Mis à jour le 2026-10-21, avant toute PR (chantier pas commencé)._

- **État** : décisions prises (ci-dessous), aucun code. Ordre validé par David : **B** (ce chantier) → **A** cloisonnement d'Akadada → **C** année d'une classe à la création.
- **Prochaine action** : créer le worktree, rédiger la phase 0 (comportements nominal / limite / erreur) et la faire valider.
- **En attente de David** : rien (questions tranchées le 2026-10-21).
- **Pièges en cours** : la prod exige la confirmation du courriel à l'inscription (`auth/register/+page.server.ts`) ; auth de mineurs + consentement → tests d'intégration, `code-reviewer` et `security-auditor` ; question d'accès avant tout SQL.
- **Worktree / branche** : à créer — `../ubumaths-wt-inscription-parent`, `feat/inscription-parent`.

## Contexte

David commence les cours particuliers (surtout des collégiens) dans l'école dédiée **Akadada**
(créée en prod le 2026-10-21, classe NOELIE en 6e). Un élève mineur n'a pas toujours d'adresse ;
aujourd'hui la seule connexion est courriel + mot de passe (Google désactivé).

## Décisions de David (2026-10-21)

1. **Deux écrans** : « Je m'inscris » (élève seul, écran actuel inchangé) et « J'inscris mon
   enfant » (parent : code de classe, son adresse, prénom de l'enfant, mot de passe de l'enfant).
2. **Compte de l'enfant = identifiant** (fausse adresse sur un domaine Chiphre qui ne reçoit rien) ;
   l'adresse du parent est un **contact**, pas un identifiant. Écarté : alias `parent+prenom@…`
   créé automatiquement (`+` pas géré partout ; la confirmation obligatoire n'arriverait jamais).
3. **Un seul lien au parent** = confirmation de son adresse **et** consentement parental (case
   explicite sur la page).
4. **Mot de passe oublié** : le parent (lien par courriel) **et** le prof peuvent réinitialiser ;
   l'enfant peut changer lui-même son mot de passe.
5. Aucun courriel ne part vers une fausse adresse (bienvenue, notifications, réinitialisation).

6. **Identifiant** : prénom sans accent ni majuscule + 2 chiffres, **sans point** (`noelie42`) ;
   saisie insensible aux majuscules et aux accents.
7. **Prénom seul** demandé au parent (minimisation) ; le prof ajoute le nom dans l'admin s'il le
   faut — vérifier en phase 0 que le profil accepte un nom vide.
8. **Question d'accès : le parent ne voit rien du compte de l'enfant** (il n'a pas de compte, il
   reçoit seulement des liens) ; le bilan reste le PDF envoyé par le prof.
9. **Noélie** s'inscrit dès maintenant par l'écran actuel avec **l'adresse de son parent telle
   quelle** (un seul enfant → pas d'alias) ; son compte n'aura pas à être converti.
10. **Écran « Je m'inscris » (élève seul)** : l'élève soumis au consentement donne l'adresse d'un
    parent ; le lien de consentement part **après approbation de l'adresse par le prof** (un clic
    dans son tableau de bord) — jamais directement sur une adresse fournie par l'enfant (RGPD
    art. 8 : efforts raisonnables de vérification).
