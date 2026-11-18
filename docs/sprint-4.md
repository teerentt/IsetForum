# Sprint 4 — Livraison desktop d’IsetForum

## Périmètre livré

Le dépôt a été examiné sur main, avec le commit de départ 912d17f. Le sprint 3 (836fdf1 comme repère) a été conservé et étendu. Le sprint 4 a d’abord été préparé localement ; la demande suivante de refonte autorise désormais les commits et leur publication sur GitHub.

Cette livraison couvre l’import Excel des autorisations étudiantes et enseignantes, la confirmation des comptes, les PDF, le raccordement des parcours Angular à MySQL et la refonte desktop selon le nouveau template. Votes, favoris, notifications, commentaires imbriqués et refonte mobile restent hors périmètre.

## Backend

User reste l’unique entité de compte. Les couches model, repository, service, controller et DTO sont conservées. Les ajouts sont :

- RegistrationAuthorization : adresse normalisée, rôle STUDENT / PROFESSOR et date de mise à jour.
- EmailVerificationToken : utilisateur, hash SHA-256 d’un jeton aléatoire, expiration et date d’envoi.
- PdfAttachment : une communauté ou une publication, nom, taille, date et octets du PDF.
- Services d’import, de confirmation et d’envoi, ainsi que PdfService.
- Routes administrateur, de confirmation, de PDF et lecture globale des publications autorisées.

V4 ajoute les autorisations et confirmations et marque les comptes préexistants confirmés. V5 ajoute les PDF et leurs clés étrangères en cascade. Les migrations précédentes ne sont pas modifiées.

### Import Excel

| Action | Route |
| --- | --- |
| Lister les autorisations | GET `/api/admin/registration-authorizations` |
| Importer un .xlsx | POST `/api/admin/registration-authorizations/import`, multipart, champ file |
| Retirer une autorisation | DELETE `/api/admin/registration-authorizations/{id}` |

ADMIN est contrôlé par Spring Security et revérifié en base. Le fichier est limité à 2 Mo, première feuille et 5 000 lignes de données. La première ligne contient email et role. Les formules ne sont pas acceptées dans ces cellules. La normalisation est identique à l’inscription : trim et minuscules avec Locale.ROOT. Le rôle est nettoyé et mis en majuscules ; seuls STUDENT et PROFESSOR sont acceptés.

Les adresses sont uniques en base. Le bilan distingue imported (ajouts), updated (entrées déjà présentes mises à jour), duplicates (doublons dans le fichier) et invalidRows avec le numéro de ligne Excel. Une ligne invalide n’empêche pas les lignes valides d’être importées. Un fichier illisible ou sans en-tête requis est refusé. Les entrées absentes du fichier sont conservées. Le premier doublon valide est retenu.

Retirer une autorisation bloque une future inscription. Réimporter un rôle différent ne change pas le rôle d’un compte déjà créé. Les exemples [Excel](examples/inscriptions-autorisees.xlsx) et [PDF](examples/document.pdf) sont fictifs.

### Inscription et confirmation

POST `/api/auth/register` vérifie l’autorisation, attribue son rôle et crée un compte non confirmé. Aucun rôle transmis par le client n’est utilisé. Le mot de passe reste haché BCrypt et les limites du sprint précédent sont conservées.

POST `/api/auth/confirm` reçoit un token et le consomme sous verrou transactionnel. Le jeton dure 24 heures et est supprimé après confirmation ; un lien réutilisé, inconnu ou expiré est refusé. POST `/api/auth/resend-confirmation` reçoit email, remplace le jeton précédent et impose une minute entre les envois. Pour une adresse inconnue ou un compte déjà confirmé, la réponse ne révèle pas son état. Les écritures restent protégées par CSRF.

En profil dev, les liens sont affichés dans les logs et dans target/dev-confirmations.log ; ces fichiers ne sont pas servis par HTTP. Le mode console n’est autorisé qu’en dev/test. En mode smtp, Spring Mail utilise les variables documentées dans [backend/.env.example](../backend/.env.example). Un défaut d’envoi fait échouer la transaction d’inscription, afin de permettre un nouvel essai. Les délais SMTP sont limités à cinq secondes.

La page Angular `/confirmation` consomme le lien via POST et retire ensuite le jeton de l’URL affichée. La connexion est interdite tant que le compte n’est pas confirmé. Le renvoi est accessible depuis la page de connexion et celle de confirmation.

### PDF

| Action | Route et droits |
| --- | --- |
| Lire les métadonnées | GET `/api/communities/{id}/pdf/metadata` ou `/api/publications/{id}/pdf/metadata` ; droits de lecture du contenu |
| Télécharger | GET sur la même route sans `/metadata` ; mêmes droits |
| Ajouter / remplacer | PUT sur `/pdf`, multipart champ file ; ADMIN pour une communauté, auteur membre actif pour une publication |
| Retirer | DELETE sur `/pdf` ; mêmes droits d’écriture |

Un PDF par parent, grâce à une contrainte unique et une contrainte imposant exactement un parent. Validation : taille, extension .pdf, signature %PDF-, ouverture réelle avec PDFBox, au moins une page et absence de chiffrement. Limite standard : 5 Mio. Le nom est nettoyé des chemins et caractères de contrôle et limité à 180 caractères.

Les octets sont en LONGBLOB MySQL. Les remplacements utilisent le même enregistrement ; supprimer le parent efface son PDF par cascade transactionnelle. Aucun nettoyage différé de dossier n’est nécessaire. Le téléchargement force la disposition attachment, Cache-Control no-store et X-Content-Type-Options nosniff.

Le PDF d’une communauté privée n’est pas rendu public avec sa présentation. Visiteur, non-membre et demandeur PENDING sont refusés même avec le lien direct. L’administrateur peut lire les contenus privés ; il doit néanmoins être membre actif et auteur pour joindre un PDF à sa propre publication.

### Droits et fil

GET `/api/publications` retourne seulement les publications publiques et les publications privées lisibles par le compte courant. La lecture unitaire et celle des commentaires restent protégées séparément. Écriture : membre ACTIVE. Modification : auteur membre actif. Suppression des publications/commentaires : auteur membre actif ou administrateur. Les anciennes règles de création de communautés et de validation des demandes sont conservées.

## Angular desktop

Le nouveau layout reprend le template fourni : navigation gauche, contenu central, panneau de contexte, recherche et cartes. Les couleurs sont adaptées à l’ISET Radès, avec logo, bleu et blanc et mode sombre. Les libellés applicatifs sont français.

ForumService remplace ForumDemoService. Il charge les communautés, le fil et les adhésions du compte ; aucune donnée métier ne reste dans localStorage. Seul le choix du thème y est conservé. Les réponses arrivant après un changement de session sont ignorées. La navigation et le rafraîchissement relisent les données serveur. Les anciens modèles et tests de démonstration ont été retirés et remplacés par des tests du service HTTP réel.

Les pages livrées sont connexion, inscription, confirmation, fil, annuaire, communauté, discussion, création de publication, profil et administration. Les formulaires et pièces jointes possèdent des états d’envoi et des erreurs françaises. En cas d’échec d’un PDF après création d’une publication, la publication est conservée et sa discussion permet de réessayer le fichier sans doublon.

L’administration conserve les communautés et demandes du sprint 3 et ajoute Inscriptions autorisées, avec import, bilan et retrait. Le détail de communauté gère son PDF. Les boutons de vote/favoris et le téléchargement fictif .txt ont été retirés.

## Base principale réinitialisée

Cet état décrit la fin du sprint 4 avant la demande suivante d’ajout d’exemples. Un jeu de données d’exploration a depuis été inséré ; voir la section correspondante du README.

Après validation de l’import et du scénario complet sur MySQL dédié, la base principale isetforum a été migrée de V3 à V5. Avant nettoyage, les 11 anciens comptes étaient toujours présents et confirmés : la migration a donc préservé les données existantes.

Le nettoyage demandé a ensuite supprimé les données métier, dans une transaction, avec [reset-local-data.sql](../scripts/reset-local-data.sql), backend arrêté. Les tables et flyway_schema_history sont conservées. Le démarrage dev a recréé uniquement admin@isetforum.test, confirmé, avec le mot de passe local initial IsetForumDev!2026. Communautés, adhésions, publications, commentaires, autorisations, jetons et PDF sont vides. Le démarrage normal ne recrée plus les fixtures des sprints précédents.

Ce script est destructif et ne fait pas partie des migrations ni du démarrage automatique. Le profil test active explicitement les anciennes fixtures pour la non-régression ; il ne faut pas activer cette option sur la base de travail.

## Scénario de démonstration

1. Connecter l’administrateur initial, importer l’Excel et lire le bilan.
2. Tenter une inscription avec une adresse absente : refus.
3. Inscrire un étudiant et un enseignant autorisés. Vérifier le refus de connexion avant confirmation, ouvrir leurs liens locaux puis se connecter. Le rôle professeur provient de l’Excel.
4. Créer une communauté privée depuis l’administration et joindre son PDF.
5. Demander l’adhésion depuis le compte étudiant. Avant approbation, le contenu privé et son PDF sont refusés.
6. Approuver depuis l’administration. L’étudiant actualise, lit et télécharge le document.
7. L’étudiant publie avec un PDF, ajoute un commentaire et modifie sa publication depuis Angular.
8. Un enseignant extérieur et un visiteur essaient le lien direct du PDF : refus.
9. Envoyer un faux PDF : refus, ancien PDF conservé. Remplacer par un vrai PDF, puis vérifier le nom et les octets téléchargés.
10. Redémarrer le backend et vérifier les comptes confirmés, l’adhésion, la discussion, le commentaire et les deux PDF.

Le scénario automatisé vérifie aussi la suppression d’une communauté de test, le retrait d’une autorisation sans désactivation du compte, la consultation publique sans connexion, la recherche, les thèmes et les accès administrateur refusés aux autres rôles.

## Vérifications et limites

- Java : 51 tests, incluant les 39 précédents et 12 tests d’inscription/Excel/PDF ; H2, sans Flyway.
- Angular : 9 tests, incluant les réponses serveur réelles, les erreurs et l’absence de fuite de données d’un ancien chargement après déconnexion.
- Build Angular de production : réussi.
- Navigateur Edge desktop : scénario complet réussi sur une base MySQL dédiée, sans faux backend ni comptes non confirmés forcés.
- Après redémarrage : scénario en lecture seule réussi ; hash des octets de chaque PDF identique au document de test.
- MySQL : installation V1 à V5 sur base dédiée ; migration des données existantes V3 → V5 ; nettoyage autorisé de la base principale et connexion de l’administrateur vérifiés.
- SMTP externe : non vérifié faute d’identifiants fournisseur ; envoi local console et parcours de confirmation vérifiés. Mobile : hors périmètre.

Depuis frontend, définir ISETFORUM_API_URL pour le serveur dédié et exécuter `npm run test:browser`. Le backend dev utilisé par le scénario doit écrire dans target/sprint4-test-confirmations.log, ou définir ISETFORUM_DEV_OUTBOX avec le chemin de son outbox. Le rapport est dans artifacts/sprint4-verification.json. Après redémarrage du même backend et de la même base, utiliser `npm run test:browser -- --read-only`. Ne pas supprimer la base de test entre les deux passages. `--clean-check` vérifie uniquement l’état initial administrateur et les listes vides.

Les captures de validation sont dans frontend/artifacts. Les images du README sont dans docs/images : viewport 1920 × 1080, ratio 16:9, sans toute la page déroulante. `npm run screenshots` les régénère depuis les exemples MySQL, avec Edge et le backend local actifs.

## Refonte du fil

La référence Contra/Mobbin et le principe du fil Reddit guident la nouvelle présentation : navigation au bord gauche avec profil et création, fil centré et cartes arrondies, panneau droit au bord de l’écran avec des communautés réellement chargées depuis l’API. Aucun compteur de votes ni bouton sans fonctionnalité n’est ajouté. La recherche, les adhésions, les publications, les commentaires et les PDF conservent leurs permissions serveur.

Les contrôles navigateur vérifient les extrémités des panneaux, le centrage et l’absence de débordement à 1920 et 1366 pixels, ainsi que l’affichage du fil à 390 pixels. Les captures publiées restent exclusivement au format desktop 16:9.

Les bases MySQL temporaires sont supprimées après validation. La base principale conserve les exemples demandés pour explorer l’interface : 9 comptes fictifs, 6 communautés, 13 publications, 26 commentaires et 12 PDF. Pour rejouer le scénario et son contrôle après redémarrage, créer une base dédiée et exécuter d’abord le scénario complet ; les anciens identifiants du rapport local ne sont plus utilisables après suppression de la base de validation.
