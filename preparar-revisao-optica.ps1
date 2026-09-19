$ErrorActionPreference='Stop'
$inv=[Runtime.InteropServices.Marshal]::GetActiveObject('Inventor.Application')
$a=$inv.ActiveDocument
if($a.DocumentType -ne 12291){throw 'Abra a montagem.'}
$root=Join-Path $PSScriptRoot 'revisao-optica'
if(Test-Path -LiteralPath $root){throw 'Pasta de revisao ja existe.'}
[void](New-Item -ItemType Directory -Path $root)
[void](New-Item -ItemType Directory -Path (Join-Path $root 'original'))
$refs=@{}
foreach($o in $a.ComponentDefinition.Occurrences){$d=$o.Definition.Document; if(-not $refs.ContainsKey($d.FullFileName)){
 $name=[IO.Path]::GetFileName($d.FullFileName)
 $d.SaveAs((Join-Path $root ('original\'+$name)),$true)
 $d.SaveAs((Join-Path $root $name),$true)
 $refs[$d.FullFileName]=(Join-Path $root $name)
}}
$a.SaveAs((Join-Path $root 'original\Montagem-original.iam'),$true)
$a.SaveAs((Join-Path $root 'Montagem-revisada.iam'),$true)
$copy=$inv.Documents.Open((Join-Path $root 'Montagem-revisada.iam'),$true)
foreach($o in $copy.ComponentDefinition.Occurrences){$path=$o.Definition.Document.FullFileName;if($refs.ContainsKey($path)){$o.Replace($refs[$path],$true)}}
$copy.Update();$copy.Save()
Write-Output $copy.FullFileName
