App misy componsants maro, gestion de mp3 (playlist)

Misy apk desktop - web

# Desktop: Php 
tsy voatery fenetree: apk standalone (main mainty fotsiny):
- mila repertoire iray fametrahana hira (copie maina be) = source/
- misy programme mihaino an le repertoire: SourceListener.php
	- misy hira vaovao tonga ao zany
	- Miteny hoe: ito le chemin absolu mankany amle hira vaovao (mp3)
	- mirecuperer liste ana mp3 isaky ny 5 min zany
	- sortie an le programme: liste ana chemin/file (mp3)
- misy 2e programme mandray an le liste: MetaDataExtractor.php
	- manao extraction metadata anatin le mp3
		- afaka mampiasa lib
	- input: list mp3
	- output: metadata
- misy 3e programme : ApiSender.php
	- input:  sortie an le 2e programme (liste mp3 avec chemin + metadata)
	- miantso api, dia alefany any le data teo
	- rehefa success le envoi dia supprimeny le anaty repertoire (fichier d'origine)
- OPTIONEL: 4e programme mamafa fichier

ny hitambarany: 
- manoratra anaty fichier log 
	- tamzao ora
		- 1e: nisy an'ito fichier mp3 ito...
		- 2e: nanao extaction an'ito fichier ito, zao avy le data
		- 3e: en cours d'envoi ito fichier ito, na niechouer 
	- exception
- tsisy db fa le log ihany


---

Misy notion ana dev: `MESSAGE BROKER`
- tsy synchrone le fiantsoan le programme p1 mankany @ p2
- rehefa vita nen p1, dia elefany any @ composant logiciel (librairie, programme hafa: rabbit MQ) iray izay ho enoin p2 
	- resaka mifandefa sy mifampihaino message (raha adresse amiko le izy)
- queue samihafa no hifandefasana message
	- p3 tsy mamaky nen p1 fa nen p2 ihany

---

# Web : React

Aleo asina CRUD ana mp3 ihany (satria mety tsy azo dol le metadata)
- api
	- misauvegarder an le file
	- misauvegarder anaty base de donnees
- generation de playlist
- misy interface
	- mampiditra critere
		- genre - artiste - langue
		- duree totale an le playlist
	- le programme no mipropose an le playlist possible mifanaraka an le critere
		- afaka manolo le olona
	- rehefa afapo le olona
		- afaka sauvegardena le playlist
	- pour chaque playlist
		- afaka play eo no eo, pause...
		- afaka telechargena au format zip 