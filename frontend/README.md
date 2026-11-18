# IsetForum — Angular desktop, sprint 4

Le frontend utilise désormais les API Spring Boot/MySQL pour les parcours livrés. Les services, modèles et composants de démonstration locale ont été retirés. L’interface reprend le template fourni, avec l’identité ISET Radès, des libellés français, un thème clair bleu et blanc et un thème sombre.

La disposition desktop occupe toute la largeur : panneau gauche au bord gauche, panneau droit au bord droit, fil centré entre deux colonnes latérales égales. Les barres latérales restent visibles au défilement. Le contenu central conserve une largeur lisible sur les grands écrans. Des données d’exemple persistantes ont été ajoutées dans MySQL pour explorer ces pages ; voir les comptes du README principal.

## Lancer

Depuis ce dossier : `npm ci`, puis `ng serve`. Angular CLI 21 est requis pour cette commande ; `npm start` utilise également le CLI local. Ouvrir http://localhost:4200. Le proxy `/api/**` pointe vers Spring Boot sur 8080. MySQL et le backend dev doivent être démarrés séparément.

## Parcours

- Connexion, inscription avec adresse et rôle autorisés, confirmation e-mail et renvoi du lien.
- Fil et recherche sur les publications lisibles retournées par le serveur.
- Annuaire, création de communautés, adhésion publique et demande privée.
- Discussions, édition/suppression selon les droits, commentaires et PDF persistants.
- Profil courant et publications personnelles.
- Administration : communautés, demandes d’adhésion et import Excel des inscriptions autorisées.

Votes, favoris, notifications et réponses imbriquées ne sont pas proposés. Les anciennes adresses favoris/ressources redirigent vers les pages conservées. La livraison et les vérifications portent sur le desktop ; la refonte mobile est hors périmètre.

## Organisation

- `core/models/api.models.ts` : contrats des communautés, contenus, adhésions, PDF et inscriptions autorisées.
- `core/services/forum.service.ts` : données serveur, appels HTTP et rafraîchissement ; aucune persistance métier dans localStorage.
- `core/services/forum-ui.service.ts` : navigation, dialogues, filtres et messages de présentation.
- `core/services/auth.service.ts` : session, inscription et confirmation.
- `core/services/admin.service.ts` : CRUD administratif, demandes et Excel.
- `core/guards` et `core/interceptors` : navigation autorisée et expiration de session.
- `layout` : en-tête, navigation et structure desktop.
- `features` : composants de chaque page, avec HTML, TypeScript et CSS séparés.
- `shared/components/pdf-attachment` : ajout/remplacement/suppression et lien de téléchargement réel.

Le thème reste enregistré dans localStorage ; les comptes, publications et droits restent côté serveur. Les réponses d’un ancien chargement ne peuvent pas repeupler le fil après une déconnexion. Le garde administrateur ne remplace pas les contrôles de rôle côté Spring Boot.

## PDF et Excel

Les PDF sont stockés dans MySQL et téléchargés par une route protégée. Ils sont limités à 5 Mio par défaut. Si l’envoi du PDF d’une nouvelle publication échoue, la publication créée est conservée et la discussion permet de réessayer le fichier sans publier en double.

L’import Excel utilise les colonnes email et role (STUDENT / PROFESSOR). Un exemple est téléchargeable depuis l’administration et fourni dans `public/examples/inscriptions-autorisees.xlsx`. Le bilan affiche ajouts, mises à jour, doublons et numéros des lignes invalides.

## Tests

```text
npm test
npm run build
npm run test:browser
```

La suite unitaire contient 9 tests. Les tests navigateur nécessitent Microsoft Edge, PowerShell et un backend dev sur une base MySQL dédiée. Le scénario crée des adresses uniques et lit leur confirmation depuis l’outbox locale ; il ne nécessite pas de serveur SMTP externe.

```powershell
$env:ISETFORUM_API_URL='http://127.0.0.1:8081'
npm run test:browser
# Après redémarrage du même backend :
npm run test:browser -- --read-only
```

Configurer `ISETFORUM_DEV_OUTBOX` si nécessaire. Les captures et rapports de tests sont dans `artifacts/`, ignoré par Git. Voir le [README principal](../README.md) et le [sprint 4](../docs/sprint-4.md) pour les variables SMTP, le stockage PDF, les limites et le bilan des vérifications.

## Design et captures

Le fil s’inspire de Reddit et de la référence Contra : profil et création dans la navigation gauche, cartes de discussion au centre, communautés réelles à droite. Le thème conserve le bleu ISET, avec une version claire et sombre. Les panneaux latéraux restent aux extrémités et le fil est centré sur desktop. Le panneau droit disparaît sous 1150 pixels ; la navigation devient horizontale sous 800 pixels.

Après `npm run build`, lancer `npm run screenshots` avec un backend local contenant les exemples `dev,showcase`. Le script Edge capture cinq vues en **1920 × 1080**, avec `fullPage: false`, dans `../docs/images`. Il consulte les données existantes sans créer de contenu. Configuration facultative : `ISETFORUM_API_URL`, `ISETFORUM_CAPTURE_EMAIL`, `ISETFORUM_CAPTURE_PASSWORD`.
