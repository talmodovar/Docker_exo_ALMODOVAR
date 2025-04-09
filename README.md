Application Containerisée avec Docker

Ce projet contient une architecture backend (server) et frontend (client) 

---

1. STRUCTURE DU PROJET :

Twitter2-main/
├── client/          --> Code source du Frontend (React.js)
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── context/
│       ├── services/
│       └── types/
├── server/          --> Code source du Backend (Node.js)
│   ├── app/
│       ├── models/
│       ├── routes/
│       └── services/
└── docker-compose.yml

---

2. MISE EN PLACE DE L'ENVIRONNEMENT :


2.1 Installations Pré-Requises :


Vérifiez avec les commandes suivantes :
docker --version
docker-compose --version


---

2.4 Dockerisation :
-------------------

Étape 1 : Construire les Conteneurs
-----------------------------------
Exécutez la commande suivante :
docker-compose build

Cela créera deux images Docker :
- Une pour le serveur (server).
- Une pour le client (client).

Étape 2 : Lancer les Conteneurs
-------------------------------
Commande suivante :
docker-compose up

Cela démarrera deux conteneurs Docker connectés :
- Le serveur (backend) : http://localhost:3001.
- Le client (frontend) : http://localhost:3000.

---

3. STRUCTURE DES FICHIERS DOCKER :

- server/Dockerfile :
  Ce fichier décrit la configuration pour le backend (API Node.js).


- client/Dockerfile :
  Ce fichier décrit la configuration pour le frontend (React.js).


- docker-compose.yml :
  Déclare les ports.

---

4. TESTER L'APPLICATION :

Une fois les conteneurs lancés :
- Frontend : http://localhost:3000.
- Backend : http://localhost:3001.

---

5. COMMANDES UTILES POUR DOCKER ET DOCKER COMPOSE :

- Reconstruire les conteneurs après des modifications :
  docker-compose build
  docker-compose up

- Arrêter les conteneurs :
  docker-compose down

- Afficher les logs des conteneurs :
  docker-compose logs -f

