# This file give the requierements to get Formation data from the website L'etudiant.fr

3 types of data will be added to the model:
* a new entity "MasterFormation" which is a training/cursus (e.g., "Master in Political sciences") availble after a CPGE. It is linked to several "Formation" which lead to this "MasterFormation".
* a new entity called "panier" which is a set of "MasterFormation" for a given CPGE type (eg. MP, BCPST, etc.). A "panier" as a name which is the name of the most difficult "MasterFormation" in the set or a generic name like "Panier large". 
* extra data for the Formation of the category "CPGE" (other types are not concerned).This data set are the statistics of success for each "Formation" to get into a "MasterFormation".

## Scrapping logic:
- General warning: 
    - website is in French
    - it use a lot of javascript to load the content. So you may need to use a headless browser like puppeteer or playwright.
    - there are ads on the website, you should ignore them.
    - lists of "MasterFormation" are paginated. You will add "?page=X" to the url to load the  next batch of "MasterFormation". Stop if the page is empty (or returns 404 http code)
- Step one:Get the list of all "MasterFormation" and "Paniers". You will find them in the <div> element id "main-article". The are presented in sets called "paniers", a "panier" can have one or several "MasterFormation". The first "panier" is the one with the most difficult "MasterFormation". Second "panier" is the contect of the first one plus the one with the second most difficult "MasterFormation". etc. So you will have to scrap all the "paniers" to get all the "MasterFormation" and also keep that notion of panier as all statitics are linked to it (not directly to the MasterFormation).
- Step tow: Get the list of "Schools" from the table in the <div> element id "qiota_content". The table as 4 columns, the first one is empty the second is a ranking, the third the name + localisation (pattern below), the fourth an success rate. Inside the 3 column there is a list of information, parse it to get the "Parcoursup" presence indicator ("oui", "non"), and the link to the details of the schools under the "Voir la fiche" button  For the moment keep: the name of the school, the city, the department number (pattern: "Name(city, department number)"), the "Parcoursup" presence indicator, and the link to the details of the schools. This link is a link to the "School" page on letudiant.fr.

## Pages to scrap :

-For BCPST: https://www.letudiant.fr/classements/classement-des-prepas-bcpst-biologie-chimie-physique-et-sciences-de-la-terre/vous-visez-agroparistech-x-ens.html
- For MP: https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html
- For MPI: https://www.letudiant.fr/classements/classement-des-prepas-mpi-maths-physique-et-informatique/vous-visez-polytechnique-ens.html