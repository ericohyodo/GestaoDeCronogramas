<#
.SYNOPSIS
  Publica o executável gerado por `npm run dist` na pasta de produção (rede).

.DESCRIPTION
  1. Confere que o .exe da versão do package.json existe em dist\.
  2. Recusa se ainda houver apps abertos (lidos do quadro de atualização) ou se o .exe estiver travado.
  3. Move o executável em uso para "Versões anteriores" (só a última versão anterior fica guardada lá).
  4. Copia o novo com o nome fixo "APP Gestao Novos Desenvolvimentos.exe" (os atalhos continuam valendo) e
     confere o hash. Se algo falhar, devolve o executável anterior ao lugar.
  O banco e os backups não são tocados: a nova versão aplica as migrações (com backup) na primeira abertura.

.PARAMETER Destino
  Pasta de produção.

.PARAMETER Forcar
  Publica mesmo que a mesma versão já esteja na pasta.

.EXAMPLE
  npm run publicar
#>
[CmdletBinding()]
param(
  [string]$Destino = 'E:\COMERCIAL - AV\APP - Gestão de Novos Desenvolvimentos - AV-SD-PRO',
  [switch]$Forcar
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------------------------------------
$NomeDoExe = 'APP Gestao Novos Desenvolvimentos.exe'
$PastaAnteriores = Join-Path $Destino 'Versões anteriores'
$Repositorio = Split-Path -Parent $PSScriptRoot
$ValidadeDoSinalEmSegundos = 90

<#
  Falha com mensagem clara e código de saída 1.
  @param Mensagem texto mostrado ao usuário
#>
function Parar([string]$Mensagem) {
  Write-Host ''
  Write-Host "PUBLICAÇÃO CANCELADA: $Mensagem" -ForegroundColor Red
  exit 1
}

<#
  Apps abertos agora, segundo o quadro de atualização (cada app renova o seu arquivo a cada 30 s).
  @returns lista de objetos com usuario, computador, usuarioDoWindows e modo
#>
function Obter-AppsAbertos {
  $pastaApps = Join-Path $Destino 'controle-de-atualizacao\apps'
  if (-not (Test-Path -LiteralPath $pastaApps)) { return @() }
  $limite = (Get-Date).ToUniversalTime().AddSeconds(-$ValidadeDoSinalEmSegundos)
  $abertos = @()
  foreach ($arquivo in Get-ChildItem -LiteralPath $pastaApps -Filter '*.json' -ErrorAction SilentlyContinue) {
    try {
      $app = Get-Content -LiteralPath $arquivo.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      $sinal = if ($app.ultimoSinal -is [datetime]) { $app.ultimoSinal.ToUniversalTime() } else {
        [datetime]::Parse($app.ultimoSinal, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal)
      }
      if ($sinal -ge $limite) { $abertos += $app }
    } catch {
      # arquivo sendo gravado ou corrompido: ignora
    }
  }
  return $abertos
}

# ---------------------------------------------------------------------------------------------------------
# 1. Executável novo
# ---------------------------------------------------------------------------------------------------------
$versao = (Get-Content -LiteralPath (Join-Path $Repositorio 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$novo = Join-Path $Repositorio "dist\GestaoNovosDesenvolvimentos-$versao-portatil.exe"
if (-not (Test-Path -LiteralPath $novo)) { Parar "não encontrei $novo. Rode 'npm run dist' antes." }
if (-not (Test-Path -LiteralPath $Destino)) { Parar "a pasta de produção não existe ou está fora do ar: $Destino" }

$alvo = Join-Path $Destino $NomeDoExe
$versaoEmUso = $null
if (Test-Path -LiteralPath $alvo) {
  $versaoEmUso = (Get-Item -LiteralPath $alvo).VersionInfo.ProductVersion
  if ($versaoEmUso -eq $versao -and -not $Forcar) {
    Parar "a versão $versao já está publicada. Use -Forcar para copiar de novo."
  }
}
Write-Host "Publicando a versão $versao (em uso: $(if ($versaoEmUso) { $versaoEmUso } else { 'nenhuma' }))."

# ---------------------------------------------------------------------------------------------------------
# 2. Ninguém pode estar com o app aberto
# ---------------------------------------------------------------------------------------------------------
$abertos = @(Obter-AppsAbertos)
if ($abertos.Count -gt 0) {
  Write-Host 'Apps ainda abertos:' -ForegroundColor Yellow
  foreach ($app in $abertos) {
    $quem = if ($app.usuario) { $app.usuario } else { 'tela de login' }
    Write-Host ("  - {0} no {1} (Windows: {2}, modo {3})" -f $quem, $app.computador, $app.usuarioDoWindows, $app.modo)
  }
  Parar "peça o fechamento pelo painel inicial do app (Atualização do sistema) e rode de novo quando todos fecharem."
}

# ---------------------------------------------------------------------------------------------------------
# 3. Executável em uso -> Versões anteriores (só a última fica)
# ---------------------------------------------------------------------------------------------------------
$guardado = $null
if ($versaoEmUso) {
  New-Item -ItemType Directory -Force -Path $PastaAnteriores | Out-Null
  $guardado = Join-Path $PastaAnteriores "APP Gestao Novos Desenvolvimentos $versaoEmUso.exe"
  if (Test-Path -LiteralPath $guardado) { Remove-Item -LiteralPath $guardado -Force }
  try {
    Move-Item -LiteralPath $alvo -Destination $guardado
  } catch {
    Parar "o executável em uso está travado (alguém abriu o app pela rede sem aparecer na lista, ou o app acabou de fechar). Tente de novo em instantes. Detalhe: $($_.Exception.Message)"
  }
}

# ---------------------------------------------------------------------------------------------------------
# 4. Copia o novo e confere
# ---------------------------------------------------------------------------------------------------------
try {
  Copy-Item -LiteralPath $novo -Destination $alvo
  if ((Get-FileHash -LiteralPath $alvo).Hash -ne (Get-FileHash -LiteralPath $novo).Hash) {
    throw 'o hash da cópia não confere com o executável gerado.'
  }
} catch {
  Remove-Item -LiteralPath $alvo -Force -ErrorAction SilentlyContinue
  if ($guardado) { Move-Item -LiteralPath $guardado -Destination $alvo }
  Parar "falha ao copiar a versão nova; a anterior foi devolvida ao lugar. Detalhe: $($_.Exception.Message)"
}

# Só a última versão anterior fica guardada.
if ($guardado) {
  Get-ChildItem -LiteralPath $PastaAnteriores -File |
    Where-Object { $_.FullName -ne $guardado } |
    Remove-Item -Force
}

Write-Host ''
Write-Host "Versão $versao publicada em: $alvo" -ForegroundColor Green
if ($guardado) { Write-Host "Versão anterior guardada em: $guardado" }
Write-Host 'Na primeira abertura, a nova versão faz backup do banco, aplica as migrações e libera o aviso de atualização.'
