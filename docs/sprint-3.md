# Sprint 3 — Publications, commentaires et administration réelle

Document historique du sprint 3. Le [sprint 4](sprint-4.md) remplace depuis les démonstrations Angular par les API réelles, modifie l’inscription et réserve les anciennes fixtures aux tests. Utiliser le README actuel pour le lancement et la validation.

## Livré

- API CRUD des publications et commentaires, sans pièces jointes ni réponses imbriquées.
- Persistance MySQL via V3, sans modification de V1 ou V2.
- CRUD des communautés dans `/forum/administration`, réservé à `ADMIN`.
- Approbation et refus de véritables demandes d’adhésion depuis Angular.
- Écrans et messages en français ; couches backend existantes conservées.

Les écrans utilisateur Angular restent en démonstration locale. Ils ne consomment pas encore les nouvelles API de publications/commentaires, ni les communautés MySQL. Le bouton global de publication de démonstration est masqué dans l’administration.

## Lancement

Démarrer MySQL dans Laragon, puis depuis `backend/` :

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Flyway applique V3 et Hibernate valide le schéma. Les tables ajoutées sont `publication` et `publication_comment`. Depuis `frontend/`, lancer `ng serve`, se connecter avec `admin@isetforum.test` et ouvrir `/forum/administration`.

## API

| Méthode | Route | Action |
| --- | --- | --- |
| GET / POST | `/api/communities/{id}/publications` | Lister / créer une publication |
| GET / PUT / DELETE | `/api/publications/{id}` | Consulter / modifier / supprimer |
| GET / POST | `/api/publications/{id}/comments` | Lister / ajouter un commentaire |
| PUT / DELETE | `/api/comments/{id}` | Modifier / supprimer un commentaire |
| GET / POST | `/api/admin/communities` | Lister / créer une communauté |
| GET / PUT / DELETE | `/api/admin/communities/{id}` | Consulter / modifier / supprimer |
| GET | `/api/admin/membership-requests` | Lister les demandes privées en attente |
| POST | `/api/admin/membership-requests/{id}/approve` | Accepter une demande |
| POST | `/api/admin/membership-requests/{id}/reject` | Refuser une demande |

Création : `201`. Lecture, modification et approbation : `200`. Suppression et refus : `204`. Les erreurs utilisent le format API existant : `400` pour un champ ou paramètre invalide, `401` sans session lorsque nécessaire, `403` pour un droit manquant ou un CSRF absent, `404` pour une ressource inexistante.

Une publication reçoit uniquement `title` et `content`. Un commentaire reçoit `content`. Les DTO de réponse contiennent l’identifiant, le parent, l’auteur (identifiant et nom), le texte et les dates. Aucun e-mail ni mot de passe n’est renvoyé.

## Permissions

| Opération | Règle |
| --- | --- |
| Présentation d’une communauté | Publique, même pour une communauté privée |
| Lecture du contenu public | Autorisée sans connexion |
| Lecture du contenu privé | Membres `ACTIVE` et administrateurs |
| Publier / commenter | Membre `ACTIVE`, y compris pour un administrateur |
| Modifier un contenu | Auteur uniquement, avec adhésion toujours active |
| Supprimer un contenu | Auteur membre actif, ou administrateur même extérieur |
| CRUD administratif des communautés | Administrateur uniquement |

L’auteur est chargé depuis l’identité de la session serveur ; un identifiant envoyé dans le JSON ne peut pas usurper l’auteur ou déplacer le contenu vers un autre parent. Une demande `PENDING` ne donne aucun accès privé ni droit d’écriture. Quitter conserve les contenus, mais retire les droits d’auteur liés à l’adhésion ; rejoindre de nouveau les rétablit. Les administrateurs ne modifient pas les textes des autres auteurs.

`CommunityAccessService` applique les règles côté serveur. Les routes `/api/admin/**` sont aussi protégées dans Spring Security. Le rôle réel en base est revérifié pour les actions administratives. Les routes ordinaires de création des communautés restent ouvertes aux utilisateurs connectés comme au sprint 2.

Les limites après suppression des espaces aux extrémités sont : titre 160 caractères, publication 10 000 caractères, commentaire 2 000 caractères. Chaque champ est obligatoire. Le contenu est du texte simple.

## Suppressions

Une communauté est supprimée définitivement, après confirmation dans Angular. Le service efface, dans une seule transaction :

1. Les commentaires de ses publications.
2. Ses publications.
3. Ses adhésions actives et demandes en attente.
4. La communauté.

Les comptes utilisateurs et les autres communautés restent conservés. Une erreur annule toute la transaction. Supprimer une publication efface ses commentaires ; supprimer un commentaire conserve sa publication. Les clés étrangères empêchent les enregistrements orphelins. Il n’y a ni corbeille ni restauration.

## Administration Angular

`AdminComponent` conserve ses fichiers HTML, TypeScript et CSS séparés. `AdminService` gère les appels HTTP, le rafraîchissement CSRF avant écriture et les contrats définis dans `admin.models.ts`.

- Onglet Communautés : liste, détail, formulaire de création/modification et confirmation de suppression.
- Onglet Demandes d’adhésion : noms fournis par le serveur, traitement par l’identifiant réel de la demande.
- Rechargement des données après chaque mutation, boutons désactivés pendant l’envoi et erreurs visibles, sans repli sur des données fictives.
- Passage en public : demandes en attente activées ; passage en privé : membres actifs conservés.

## Vérification

Depuis `backend/` : `./mvnw.cmd test` dans PowerShell. La suite contient 39 tests : 8 d’authentification, 19 du sprint 2 et 12 nouveaux tests. Les nouveaux tests couvrent les accès publics/privés, `PENDING`, l’auteur, les limites des champs, CSRF, les rôles administrateur falsifiés, le départ d’un membre, les suppressions et le retour arrière après une panne simulée au milieu d’une suppression.

Depuis `frontend/` : `npm test`, `npm run build`, puis `npm run test:browser` avec un backend `dev`. Le scénario navigateur crée sa propre communauté MySQL, approuve puis refuse une demande réelle, crée des contenus via les API, modifie la communauté, vérifie après actualisation et supprime ses données de test. Il vérifie aussi l’affichage mobile et les refus serveur pour les comptes non administrateurs.

Les tests Java utilisent H2 avec Flyway désactivé. Les vérifications MySQL de développement ont donc été réalisées séparément sur des bases isolées : installation V1/V2/V3 depuis une base vide ; application de V3 sur un schéma V1/V2 contenant un compte et une communauté conservés ; persistance des publications/commentaires et des droits privés après redémarrage.

Pour reproduire le contrôle des API et de la persistance, depuis la racine du dépôt :

```powershell
node scripts/verify-sprint3.mjs
# Redémarrer le même backend et la même base, puis :
node scripts/verify-sprint3.mjs --read-only
```

Le premier passage crée deux communautés de vérification et conserve leurs contenus. Les identifiants sont dans `backend/target/sprint3-verification.json`, ignoré par Git. Pour utiliser un autre serveur : définir `ISETFORUM_API_URL`, par exemple `http://127.0.0.1:8081`. Utiliser une base dédiée pour les vérifications MySQL ; aucune commande de suppression générale n’est nécessaire.

## Démonstration et suite

Créer une communauté privée depuis l’administration ; demander l’adhésion via l’API étudiante ; approuver dans Angular ; créer une publication et un commentaire via les API du membre ; constater les refus d’un visiteur et d’un membre en attente ; vérifier les données après redémarrage ; modifier et supprimer la communauté depuis l’administration.

Reportés : raccordement des écrans utilisateur, likes, favoris, ressources et fichiers, notifications, signalements, gestion des comptes et refonte graphique.

## Nettoyage après validation

Les trois bases MySQL isolées `isetforum_sprint3_20261118072854`, `isetforum_sprint3_20261118072918` et `isetforum_sprint3_fresh_20261118073257` ont été supprimées après validation et à la demande de l’utilisateur. La première était vide ; les deux autres contenaient uniquement les données de vérification et les comptes de développement. La base principale `isetforum` a été conservée, avec les mêmes nombres d’utilisateurs, de communautés et d’adhésions avant et après nettoyage.

Les rapports locaux associés à ces bases sont des artefacts de test. Pour une nouvelle vérification de persistance, créer de nouveaux contenus avec le script avant d’utiliser `--read-only`, en gardant le même serveur et la même base entre les deux passages.
