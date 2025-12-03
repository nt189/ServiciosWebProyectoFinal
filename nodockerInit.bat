@echo off
setlocal ENABLEDELAYEDEXPANSION

set BASE_DIR=%~dp0

echo Iniciando servicios sin Docker...

pushd "%BASE_DIR%webhook"
REM 1) Webhook (Python/Flask) en puerto 5001
echo Instalando dependencias Python para webhook...
call py -3 -m pip install flask flask-cors firebase-admin
echo Iniciando Webhook Flask en http://localhost:5001 ...
start "webhook-python" cmd /c "py -3 webhook_service.py"
popd

pushd "%BASE_DIR%Microservicios\KioscoDigital.WebAPI"
echo Restaurando y lanzando KioscoDigital.WebAPI...
call dotnet restore
start "KioscoDigital.WebAPI" cmd /c "dotnet run"
popd

pushd "%BASE_DIR%Microservicios\Gestion de patrocinadores y compra"
echo Iniciando PHP built-in server para GPC en http://localhost:5002 ...
start "GPC-PHP" cmd /c "php -S localhost:5002 microservicioGPC.php"
popd

pushd "%BASE_DIR%Microservicios\Gestion_entrega_api"
echo Instalando dependencias Python para gestion_entrega_api...
if exist requirements.txt (
	call py -3 -m pip install -r requirements.txt
) else (
	echo requirements.txt no encontrado, continuando...
)
echo Iniciando gestion_entrega_api en http://localhost:5003 ...
start "gestion_entrega_api" cmd /c "py -3 app.py"
popd

pushd "%BASE_DIR%APIgateway"
if not exist node_modules (
	echo Instalando dependencias de APIgateway...
	call npm install
)
echo Iniciando API Gateway en http://localhost:3000 ...
start "APIgateway" cmd /c "node apiGateway.js"
popd

echo.
echo Todos los servicios fueron lanzados. Verifica las ventanas abiertas.
echo - Webhook:          http://localhost:5001
echo - KioscoDigital:    http://localhost:5000
echo - GPC (PHP):        http://localhost:5002
echo - Entrega API:      http://localhost:5003
echo - API Gateway:      http://localhost:3000
echo.
echo Recuerda ajustar las URLs internas del API Gateway si cambias puertos.

endlocal
exit /b 0
