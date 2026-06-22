@echo off
mkdir project
cd project
mkdir sources
mkdir logs
mkdir src
mkdir config
type nul > run.php
type nul > config\config.php
type nul > src\SourceListener.php
type nul > src\MetaDataExtractor.php
type nul > src\ApiSender.php
echo Structure creee avec succes !
pause