. "$PSScriptRoot\optica-cad-lib.ps1"
Add-Type -Path 'C:\Program Files\Autodesk\Inventor 2026\Bin\Autodesk.Inventor.Interop.dll'
Add-Type -ReferencedAssemblies 'C:\Program Files\Autodesk\Inventor 2026\Bin\Autodesk.Inventor.Interop.dll' -TypeDefinition @'
using System;using Inventor;
public static class OpticaInterop{public static object Proxy(object o,object g){object p;((ComponentOccurrence)o).CreateGeometryProxy(g,out p);return p;}}
'@
function LinkPlanes($one,$two,$prefix){for($i=1;$i -le 3;$i++){$p1=[OpticaInterop]::Proxy($one,$one.Definition.WorkPlanes.Item($i));$p2=[OpticaInterop]::Proxy($two,$two.Definition.WorkPlanes.Item($i));$c=$a.ComponentDefinition.Constraints.AddFlushConstraint($p1,$p2,0);$c.Name=$prefix+'_'+$i}}
$arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1');$disk=$a.ComponentDefinition.Occurrences.ItemByName('disco:1')
$det=$a.ComponentDefinition.Occurrences.ItemByName('PM16-121-Step:1')
$detPath=Join-Path $root 'PM16-121-integrado.ipt'
if(Test-Path -LiteralPath $detPath){throw 'Detector revisado ja existe'}
$det.Definition.Document.SaveAs($detPath,$true);$det.Replace($detPath,$false)
$sampleY=$disk.Transformation.Translation.Y+.35+2.0
$mountH=$sampleY-$arm.Transformation.Translation.Y-1.524
$rodDoc=NewPart 'Haste_PM16_12mm_M4';$rd=$rodDoc.ComponentDefinition
Cylinder $rd 0 0 ($mountH-8) $mountH .6 20481 'Haste_12mm_comprimento_80mm'
# Espigao representado pelo diametro de nucleo para nao simular interferencia da rosca.
Cylinder $rd 0 0 $mountH ($mountH+.3) .16 20481 'Espigao_M4_representacao_simplificada'
$rd.Parameters.UserParameters.AddByValue('Altura_optica_sobre_disco',2.0,'mm')|Out-Null
$rodDoc.Update();$rodDoc.Save()
$rod=$a.ComponentDefinition.Occurrences.Add($rodDoc.FullFileName,$arm.Transformation);$rod.Name='Haste_ajustavel_PM16'
LinkPlanes $rod $arm 'Posicao_haste'
$a.ComponentDefinition.Constraints.Item($a.ComponentDefinition.Constraints.Count-1).Name='Ajuste_altura_detector'
# Y original do detector aponta para a amostra (-X do braco).
# Eixo radial da rosca original aponta para baixo (-Y do braco).
$rel=$tg.CreateMatrix();$rot=@(@(0,-1,0),@(-.8660254037844386,0,-.5),@(.5,0,-.8660254037844386))
for($r=1;$r -le 3;$r++){for($c=1;$c -le 3;$c++){$rel.Cell($r,$c)=$rot[$r-1][$c-1]}}
$src=P 1.3600272957655235 2.3255634935754603 -.84614833145081891
$q=$src.Copy();$q.TransformBy($rel)
$rel.Cell(1,4)=-$q.X;$rel.Cell(2,4)=$mountH-$q.Y;$rel.Cell(3,4)=-$q.Z
$global=$arm.Transformation.Copy();$global.PostMultiplyBy($rel);$det.Grounded=$false;$det.SetTransformWithoutConstraints($global)
# Planos locais equivalentes aos planos da haste, para fixacao que acompanha o giro.
$inverse=$rel.Copy();$inverse.Invert();$dd=$det.Definition
for($i=1;$i -le 3;$i++){
 switch($i){1{$u=V 0 1 0;$v=V 0 0 1}2{$u=V 1 0 0;$v=V 0 0 -1}3{$u=V 1 0 0;$v=V 0 1 0}}
 $origin=P 0 0 0;$origin.TransformBy($inverse);$u.TransformBy($inverse);$v.TransformBy($inverse)
 $wp=$dd.WorkPlanes.AddFixed($origin,$u,$v,$true);$wp.Name='Referencia_suporte_'+$i;$wp.Visible=$false
 $p1=[OpticaInterop]::Proxy($det,$wp);$p2=[OpticaInterop]::Proxy($rod,$rd.WorkPlanes.Item($i))
 $c=$a.ComponentDefinition.Constraints.AddFlushConstraint($p1,$p2,0);$c.Name='Fixacao_PM16_'+$i
}
$det.Name='Fotodetector_PM16_121'
$dd.Document.Update();$dd.Document.Save();$a.Update();$a.Save()
Write-Host ('Altura haste mm: '+($mountH*10)+'; eixo optico global mm: '+($sampleY*10))
foreach($c in $a.ComponentDefinition.Constraints){Write-Host ($c.Name+' '+$c.HealthStatus)}
$inv.ActiveView.Fit()
