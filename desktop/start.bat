@echo off
start "Logger"    cmd /k "php src/Logger.php"
start "P1"        cmd /k "php src/SourceListener.php"
start "P2"        cmd /k "php src/MetaDataExtractor.php"
start "P3"        cmd /k "php src/ApiSender.php"
start "API"       cmd /k "php -S localhost:8080 router.php"
echo Tous les services sont démarrés !