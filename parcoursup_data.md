# Parcoursup Data: 

## explications des données
Les informations sont accessibles selon l’établissement d’accueil et la formation (liste non exhaustive) : 

- Le nom de l’établissement et son n°UAI
-La région, l’académie et le département de l’établissement
-La formation demandée, agrégée et détaillée ainsi que sa nature sélective ou non
-Le nombre de places (capacité d’accueil)
-Le nombre de vœux reçus selon le sexe et la série du baccalauréat
-Le nombre de vœux classés par l’établissement de la formation d’accueil selon la série du baccalauréat
-Le nombre de propositions d’admission faites selon la série du baccalauréat 
-Le nombre de propositions d’admission faites aux différentes dates clés de la campagne Parcoursup et qui seront ensuite acceptées 
-Le nombre d’admis selon le sexe, la série du baccalauréat et la mention obtenue
-Le rang du dernier appelé de son groupe parmi les candidatures en phase principale
-Le nombre de boursiers de l’enseignement secondaire pour les lycéens de terminale et de l’enseignement supérieur pour les étudiants en réorientation
-Le nombre de candidats admis en BTS ou en CPGE et issus de leur lycée (i.e. le lycée où ils étaient inscrits en terminale)

Depuis 2021 la mention « Très bien » est détaillée par deux variables : la mention « Très Bien (hors félicitations) » (entre 16 et 18 de moyenne au baccalauréat) et la mention « Très bien avec félicitations du jury » (plus de 18 de moyenne au baccalauréat). 
Taux d’accès 2025 : rapport entre le nombre de candidats dont le rang de classement est inférieur ou égal au rang du dernier appelé de son groupe et le nombre de candidats ayant validé un vœu pour la formation étudiée en phase principale (hors GDD - phase permettant de redistribuer les places laissées vacantes à l’issue de la phase principale aux néo-bacheliers sans proposition). Ce taux prend en compte l’ensemble des candidats ayant confirmé au moins un vœu en PP (les élèves de terminale, les étudiants en réorientation et les reprises d’études)

## regles d'importation

### Attributs à conserver :
Statut de l’établissement de la filière de formation (public, privé…);
Code UAI de l'établissement;
Établissement;
Code départemental de l’établissement;
Département de l’établissement;
Région de l’établissement;
Académie de l’établissement;
Commune de l’établissement;
Filière de formation;
Sélectivité;
Filière de formation très agrégée;
Filière de formation détaillée;
Filière de formation;
Filière de formation détaillée bis;
Filière de formation très détaillée;
Coordonnées GPS de la formation;
Capacité de l’établissement par formation;
Effectif total des candidats pour une formation;
Effectif total des candidats en phase principale;
Effectif total des candidats en phase complémentaire;
Effectif total des candidats classés par l’établissement en phase principale;
Effectif des candidats classés par l’établissement en phase complémentaire;
Effectif des candidats classés par l’établissement en internat (CPGE);
Effectif des candidats classés par l’établissement hors internat (CPGE);
Effectif des candidats néo bacheliers généraux classés par l’établissement;
Effectif des autres candidats classés par l’établissement;
Effectif total des candidats ayant reçu une proposition d’admission de la part de l’établissement;
Effectif total des candidats ayant accepté la proposition de l’établissement (admis);
Dont effectif des candidates admises;
Effectif des admis en phase principale;
Effectif des admis en phase complémentaire;
Dont effectif des admis ayant reçu leur proposition d’admission à l'ouverture de la procédure principale;
Dont effectif des admis ayant reçu leur proposition d’admission avant le baccalauréat;
Dont effectif des admis ayant reçu leur proposition d’admission avant la fin de la procédure principale;
Dont effectif des admis en internat;
Dont effectif des admis néo bacheliers sans information sur la mention au bac;
Dont effectif des admis néo bacheliers sans mention au bac;
Dont effectif des admis néo bacheliers avec mention Assez Bien au bac;
Dont effectif des admis néo bacheliers avec mention Bien au bac;
Dont effectif des admis néo bacheliers avec mention Très Bien au bac;
Dont effectif des admis néo bacheliers avec mention Très Bien avec félicitations au bac;
Dont effectif des admis issus du même établissement (BTS/CPGE);
Dont effectif des admis issus de la même académie;
% d’admis ayant reçu leur proposition d’admission à l'ouverture de la procédure principale;
% d’admis ayant reçu leur proposition d’admission avant le baccalauréat;
% d’admis ayant reçu leur proposition d’admission avant la fin de la procédure principale;
% d’admis dont filles;
% d’admis néo bacheliers issus de la même académie;
% d’admis néo bacheliers issus de la même académie (Paris/Créteil/Versailles réunies);
% d’admis néo bacheliers issus du même établissement (BTS/CPGE);
% d’admis néo bacheliers sans mention au bac;
% d’admis néo bacheliers avec mention Assez Bien au bac;
% d’admis néo bacheliers avec mention Bien au bac;
% d’admis néo bacheliers avec mention Très Bien au bac;
% d’admis néo bacheliers avec mention Très Bien avec félicitations au bac;
Dont % d’admis avec mention (BG);
Effectif des candidats en terminale générale ayant reçu une proposition d’admission de la part de l’établissement;
Regroupement 1 effectué par les formations pour les classements;
Rang du dernier appelé du groupe 1;
Regroupement 2 effectué par les formations pour les classements;
Rang du dernier appelé du groupe 2;
Regroupement 3 effectué par les formations pour les classements;
Rang du dernier appelé du groupe 3;
list_com;
tri;
cod_aff_form;
Concours communs et banque d'épreuves;
Lien de la formation sur la plateforme Parcoursup;
Taux d’accès;
etablissement_id_paysage;
composante_id_paysage

### filtre à appliquer
- "Filière de formation très agrégée" ne commence pas par {"BTS", "Autre formation", "BUT "}