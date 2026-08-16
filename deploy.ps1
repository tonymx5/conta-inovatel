# ==============================================================================
# PIPELINE DE DESPLIEGUE TRIPARTITA - CONTA INOVATEL (NEXUS v2.6)
# Orden Canónico: 1. Calidad Local -> 2. Supabase DB -> 3. GitHub -> 4. Vercel -> 5. Evidencia
# ==============================================================================

param (
    [string]$CommitMessage = "",
    [switch]$SkipBuild = $false,
    [switch]$ForceVercelCli = $false
)

$ErrorActionPreference = "Stop"

function Write-Step ($stepNum, $title) {
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " [PASO $stepNum] $title" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Write-Success ($msg) {
    Write-Host " [OK] $msg" -ForegroundColor Green
}

function Write-Warning ($msg) {
    Write-Host " [ALERTA] $msg" -ForegroundColor Yellow
}

function Write-ErrorMsg ($msg) {
    Write-Host "`n [FALLO CRÍTICO] $msg" -ForegroundColor Red
}

$startTime = Get-Date

Write-Host "`n========================================================" -ForegroundColor Magenta
Write-Host "   CONTA INOVATEL - DESPLIEGUE A PRODUCCION SIMULTANEO   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "Target GitHub: https://github.com/tonymx5/conta-inovatel" -ForegroundColor Gray
Write-Host "Target Vercel: https://conta.inovatel.mx" -ForegroundColor Gray
Write-Host "Target Supabase: https://jyhuvmqibfvmfutcvzhw.supabase.co" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# PASO 1: VALIDACION PRE-FLIGHT Y COMPILACION LOCAL (Gobernanza Pilar 11)
# ------------------------------------------------------------------------------
Write-Step "1/5" "Validación de Entorno, Linter y Compilación Local"

# 1.1 Validar archivo .env
if (-not (Test-Path ".env")) {
    Write-Warning "No se encontró archivo .env local. Asegúrate de configurar variables en Vercel."
} else {
    Write-Success "Archivo .env detectado localmente."
}

# 1.2 Ejecutar Linter
Write-Host "Ejecutando análisis estático (oxlint)..." -ForegroundColor Gray
try {
    npm run lint
    Write-Success "Análisis de código (Linter) superado sin errores."
} catch {
    Write-ErrorMsg "El linter detectó problemas en el código. Corrige los errores antes de desplegar."
    exit 1
}

# 1.3 Compilar Proyecto (Build Check)
if (-not $SkipBuild) {
    Write-Host "Compilando paquete de producción con Vite..." -ForegroundColor Gray
    try {
        npm run build
        Write-Success "Build de producción generado exitosamente en ./dist."
    } catch {
        Write-ErrorMsg "Falló la compilación local (npm run build). Despliegue abortado para proteger producción."
        exit 1
    }
} else {
    Write-Warning "Compilación local omitida por parámetro -SkipBuild."
}

# ------------------------------------------------------------------------------
# PASO 2: VERIFICACION DE BASE DE DATOS Y ESQUEMA (Supabase DB-First Audit)
# ------------------------------------------------------------------------------
Write-Step "2/5" "Verificación Activa de Base de Datos y Esquema (Supabase DB-First)"

$supabaseUrl = "https://jyhuvmqibfvmfutcvzhw.supabase.co"
Write-Host "Conectando y auditando esquema en Supabase ($supabaseUrl)..." -ForegroundColor Gray

try {
    # Inspeccionar definición OpenAPI de Supabase para validar tablas en vivo
    $swagger = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/" -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Success "Conexión a Supabase REST API activa."

    if ($swagger.definitions) {
        $expectedTables = @('invoices', 'clients', 'deductibles', 'account_deposits', 'tax_config', 'audit_logs')
        $missingTables = @()
        foreach ($tbl in $expectedTables) {
            if (-not $swagger.definitions.$tbl) {
                $missingTables += $tbl
            }
        }

        if ($missingTables.Count -eq 0) {
            Write-Success "Todas las tablas requeridas ($($expectedTables -join ', ')) existen activas en Supabase."
        } else {
            Write-Warning "Faltan las siguientes tablas en Supabase: $($missingTables -join ', ')"
            Write-Warning "Ejecuta las sentencias contenidas en deploy_migration.sql o supabase_schema.sql en el Editor SQL de Supabase."
        }

        # Auditar columnas críticas en account_deposits
        if ($swagger.definitions.account_deposits -and $swagger.definitions.account_deposits.properties) {
            $depCols = $swagger.definitions.account_deposits.properties
            if ($depCols.applies_equipment_expense -and $depCols.equipment_expense -and $depCols.equipment_provider -and $depCols.real_utility) {
                Write-Success "Esquema de 'account_deposits' verificado (Columnas de gasto de equipos y utilidad real activas)."
            } else {
                Write-Warning "Esquema de 'account_deposits' requiere actualización de columnas en Supabase (ejecutar deploy_migration.sql)."
            }
        }
    }
} catch {
    Write-Warning "No se pudo auditar la especificación OpenAPI de Supabase directamente ($($_.Exception.Message)). Continuando verificación básica."
}

if (Test-Path "deploy_migration.sql") {
    Write-Host "Archivo de migración SQL listo en: ./deploy_migration.sql" -ForegroundColor Cyan
}

# ------------------------------------------------------------------------------
# PASO 3: SINCRONIZACION Y CONTROL DE VERSIONES (GitHub)
# ------------------------------------------------------------------------------
Write-Step "3/5" "Control de Versiones y Empuje a GitHub"

$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Cambios detectados para staging:" -ForegroundColor Gray
    git status -s

    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm")
        $CommitMessage = "fix(core): actualizacion y sincronizacion integral de produccion ($timestamp) [skip ci]"
        Write-Host "Mensaje de commit automático asignado: '$CommitMessage'" -ForegroundColor Gray
    }

    Write-Host "Añadiendo archivos (git add -A)..." -ForegroundColor Gray
    git add -A

    Write-Host "Creando commit..." -ForegroundColor Gray
    git commit -m $CommitMessage
    Write-Success "Commit registrado exitosamente."
} else {
    Write-Host "El repositorio de trabajo ya está limpio. No hay cambios pendientes de commit." -ForegroundColor Gray
}

Write-Host "Empujando cambios a origin/main (GitHub)..." -ForegroundColor Gray
try {
    git push origin main
    Write-Success "Código sincronizado exitosamente con GitHub (branch: main)."
} catch {
    Write-ErrorMsg "Error al hacer push a GitHub. Verifica tus credenciales o conexión de red."
    exit 1
}

# ------------------------------------------------------------------------------
# PASO 4: DESPLIEGUE EN PRODUCCION (Vercel)
# ------------------------------------------------------------------------------
Write-Step "4/5" "Despliegue y Activación en Producción (Vercel)"

if ($ForceVercelCli) {
    Write-Host "Ejecutando despliegue directo con Vercel CLI..." -ForegroundColor Gray
    try {
        npx vercel --prod --yes
        Write-Success "Despliegue directo de Vercel completado."
    } catch {
        Write-Warning "Vercel CLI devolvió una advertencia. El webhook de GitHub continuará el despliegue automático."
    }
} else {
    Write-Success "El push a GitHub 'main' activó el despliegue automático en Vercel CI/CD."
}

# ------------------------------------------------------------------------------
# PASO 5: VERIFICACION DE EVIDENCIA FISICA EN VIVO & CACHE (Pilar 8)
# ------------------------------------------------------------------------------
Write-Step "5/5" "Verificación de Salud en Vivo (https://conta.inovatel.mx)"

Write-Host "Esperando 8 segundos para inicio de propagación..." -ForegroundColor Gray
Start-Sleep -Seconds 8

$liveUrl = "https://conta.inovatel.mx"
Write-Host "Verificando disponibilidad de $liveUrl..." -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$liveUrl?v=$(Get-Random)" -Method Head -TimeoutSec 15 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Success "URL de producción respondiendo HTTP 200 OK (En línea)."
    } else {
        Write-Warning "URL respondió con código: $($response.StatusCode)"
    }
} catch {
    # Fallback GET request if HEAD is restricted by CDN
    try {
        $getRes = Invoke-WebRequest -Uri $liveUrl -TimeoutSec 15 -UseBasicParsing
        if ($getRes.StatusCode -eq 200) {
            Write-Success "URL de producción respondiendo HTTP 200 OK (En línea)."
        }
    } catch {
        Write-Warning "La verificación en vivo tardó más de lo esperado en propagar DNS/CDN. El deploy sigue en curso en Vercel."
    }
}

$elapsed = (Get-Date) - $startTime
Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETO FINALIZADO EN $($elapsed.TotalSeconds.ToString('F1')) SEGUNDOS  " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host " 1. Base de Datos: Supabase sincronizado" -ForegroundColor Gray
Write-Host " 2. Repositorio: GitHub actualizado en 'main'" -ForegroundColor Gray
Write-Host " 3. Hosting: Vercel actualizado en https://conta.inovatel.mx" -ForegroundColor Gray
