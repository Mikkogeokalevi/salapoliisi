@echo off
setlocal
REM ================================================================
REM  Salapoliisi - Git-paivitysskripti GitHubiin
REM  Tavallinen push, EI force pushia.
REM  Vaihda REPO_URL jos repon nimi on jotain muuta.
REM ================================================================
set "REPO_URL=https://github.com/Mikkogeokalevi/salapoliisi.git"
set "LAST_STEP=aloitus"

cd /d "%~dp0"

echo.
echo =========================================
echo Git-paivitysskripti GitHubiin
echo Salapoliisi -mysteeripeli
echo =========================================
echo.

REM Varmista etta repo on alustettu
set "LAST_STEP=git-repo tarkistus"
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo Git-repoa ei loydy. Alustetaan nyt...
    set "LAST_STEP=git init"
    git init
    if errorlevel 1 goto :error
    set "LAST_STEP=oletushaara"
    git symbolic-ref HEAD refs/heads/main >nul 2>&1
)

REM Varmista, etta origin on asetettu
set "LAST_STEP=origin tarkistus"
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Origin-remotea ei loydy. Asetetaan se nyt...
    set "LAST_STEP=origin add"
    git remote add origin %REPO_URL%
    if errorlevel 1 goto :error
) else (
    echo Origin-remote on jo asetettu:
    git remote get-url origin
)

REM Varmista, etta ollaan main-haarassa
set "LAST_STEP=haaran tarkistus"
for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%b"
if "%CURRENT_BRANCH%"=="" (
    echo Ei aktiivista haaraa - luodaan main kun tehdan ensimmainen commit.
) else if /I not "%CURRENT_BRANCH%"=="main" (
    echo Vaihdetaan haaraan main...
    set "LAST_STEP=checkout main"
    git checkout main >nul 2>&1
    if errorlevel 1 (
        git checkout -b main
        if errorlevel 1 goto :error
    )
)

REM Kysy commit-viesti
set /p commit_message="Syota lyhyt kuvaus tekemillesi muutoksille (commit-viesti): "

echo.
echo Lisataan muutokset...
set "LAST_STEP=git add"
git add .
if errorlevel 1 goto :error

echo.
echo Commitoidaan viestilla: "%commit_message%"
set "LAST_STEP=git commit"
git commit -m "%commit_message%"
if errorlevel 1 (
    echo Ei uusia muutoksia committavaksi.
)

set "LAST_STEP=commit tarkistus"
git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
    echo Ei yhtaan committia loydy. Tee ensin ainakin yksi commit.
    goto :eof
)

echo.
echo Haetaan mahdolliset uudet muutokset GitHubista...
set "LAST_STEP=git pull --rebase"
git pull --rebase origin main >nul 2>&1

echo.
echo Lahetetaan muutokset GitHubiin...
set "LAST_STEP=git push"
git push -u origin main
if errorlevel 1 goto :error

echo.
echo =========================================
echo GitHub-paivitys valmis onnistuneesti!
echo =========================================
echo.
echo Sivut loytyvat osoitteesta:
echo https://mikkogeokalevi.github.io/salapoliisi/
echo.
pause
goto :eof

:error
echo.
echo =========================================
echo VIRHE: GitHub-paivitys epaonnistui!
echo Viimeinen vaihe: %LAST_STEP%
echo.
echo Jos push epaonnistui koska GitHubissa on
echo uudempia muutoksia, aja ensin:
echo   git pull --rebase origin main
echo ja aja tama skripti uudelleen.
echo =========================================
echo.
pause
