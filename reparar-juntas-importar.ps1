. "$PSScriptRoot\optica-cad-lib.ps1"
$arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1')
$edge=$null
foreach($e in $arm.Definition.SurfaceBodies.Item(1).Edges){if($e.GeometryType -eq 5124){$g=$e.Geometry;if([Math]::Abs($g.Center.X+10) -lt .0001 -and [Math]::Abs($g.Center.Y-1.325) -lt .0001 -and [Math]::Abs($g.Radius-.25) -lt .0001){$edge=$e;break}}}
if($null -eq $edge){throw 'Aresta do pivô nao encontrada.'}
$im=$arm.Transformation.Copy();$im.Invert();$proxy=$null
foreach($e in $arm.SurfaceBodies.Item(1).Edges){if($e.GeometryType -eq 5124){$g=$e.Geometry;$p=$g.Center.Copy();$p.TransformBy($im);if([Math]::Abs($p.X+10) -lt .0001 -and [Math]::Abs($p.Y-1.325) -lt .0001 -and [Math]::Abs($g.Radius-.25) -lt .0001){$proxy=$e;break}}}
$j=$a.ComponentDefinition.Joints.Item(1);$origin2=$j.Definition.OriginTwo
$def=$a.ComponentDefinition.Joints.CreateAssemblyJointDefinition(102402,$a.ComponentDefinition.CreateGeometryIntent($proxy,57860),$origin2)
$j.Delete();$newj=$a.ComponentDefinition.Joints.Add($def);$newj.Name='Giro_braco_revisado'
# Reparar referencia da transmissao, preservando ordem, razao e sentido existentes.
$motion=$a.ComponentDefinition.Constraints.Item(6)
Write-Host ('Motion '+$motion.Type+' '+$motion.HealthStatus)
$e1=$motion.EntityOne
$face=$null
foreach($f in $arm.SurfaceBodies.Item(1).Faces){if($f.SurfaceType -eq 5891 -and [Math]::Abs($f.Geometry.Radius-.25) -lt .0001){$face=$f;break}}
$ratio=$motion.Ratio.Value;$forward=$motion.ForwardDirection
$motion.Delete();$newMotion=$a.ComponentDefinition.Constraints.AddRotateRotateConstraint($e1,$face,$ratio,$forward);$newMotion.Name='Relacao_angular_2_1'
$a.Update();foreach($c in $a.ComponentDefinition.Constraints){Write-Host ($c.Name+' '+$c.HealthStatus)};foreach($c in $a.ComponentDefinition.Joints){Write-Host ($c.Name+' '+$c.HealthStatus)}
$a.Save()
$add=$inv.ApplicationAddIns.ItemById('{90AF7F40-0C01-11D5-8E83-0010B541CD80}')
$src=$inv.TransientObjects.CreateDataMedium();$src.FileName='G:\Meu Drive\ufla\2026-2\instrumentacao-em-optica\PM16-121-Step.step'
$ctx=$inv.TransientObjects.CreateTranslationContext();$ctx.Type=13059
$opts=$inv.TransientObjects.CreateNameValueMap();[void]$add.HasOpenOptions($src,$ctx,$opts)
$opts.Value('ImportAASP')=$true;$opts.Value('ImportAASPIndex')=0
$opts.Value('ComponentDestFolder')=$root;$opts.Value('AssemDestFolder')=$root
$doc=$null;$add.Open($src,$ctx,$opts,[ref]$doc)
$doc.SaveAs((Join-Path $root 'PM16-121.ipt'),$false)
Write-Host ('Detector: '+$doc.FullFileName+' tipo '+$doc.DocumentType)
$a.Activate()
