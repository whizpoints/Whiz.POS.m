@echo off
cd /d "%~dp0"
echo Wiping all local data for Whiz POS...
node wipe-data.cjs
pause
