. "$PSScriptRoot\optica-cad-lib.ps1"
Add-Type -Path 'C:\Program Files\Autodesk\Inventor 2026\Bin\Autodesk.Inventor.Interop.dll'
Add-Type -ReferencedAssemblies 'C:\Program Files\Autodesk\Inventor 2026\Bin\Autodesk.Inventor.Interop.dll' -TypeDefinition @'
using System;
using Inventor;
public static class OpticaInterop {
 public static object Proxy(object occurrence,object geom){object p;((ComponentOccurrence)occurrence).CreateGeometryProxy(geom,out p);return p;}
}
'@
$arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1');$motor=$a.ComponentDefinition.Occurrences.Item(1)
$disk=$a.ComponentDefinition.Occurrences.ItemByName('disco:1')
$tr=$inv.TransactionManager.StartTransaction($a,'Corrigir centro geometrico do giro')
try{
 $a.ComponentDefinition.Constraints.Item(3).Suppressed=$true
 $old=$a.ComponentDefinition.Joints.Item(2);$old.Suppressed=$true
 $im=$arm.Transformation.Copy();$im.Invert();$ae=$null
 foreach($e in $arm.SurfaceBodies.Item(1).Edges){if($e.GeometryType -eq 5124){$g=$e.Geometry;$p0=$g.Center.Copy();$p0.TransformBy($im);if([Math]::Abs($p0.X+10) -lt .001 -and [Math]::Abs($p0.Y-1.325) -lt .001 -and [Math]::Abs($g.Radius-.25) -lt .001){$ae=$e;break}}}
 $me=$motor.SurfaceBodies.Item(1).Edges.Item(91)
 if($me.GeometryType -ne 5125 -or [Math]::Abs($me.Geometry.Radius-.25) -gt .001){throw 'Referencia do motor alterada.'}
 $def=$a.ComponentDefinition.Joints.CreateAssemblyJointDefinition(102402,$a.ComponentDefinition.CreateGeometryIntent($ae,57860),$a.ComponentDefinition.CreateGeometryIntent($me,57860))
 $j=$a.ComponentDefinition.Joints.Add($def);$j.Name='Giro_braco_coaxial'
 $a.Update()
 $pivot=P -10 0 0;$pivot.TransformBy($arm.Transformation);$center=$disk.Transformation.Translation
 $err=[Math]::Sqrt([Math]::Pow($pivot.X-$center.X,2)+[Math]::Pow($pivot.Z-$center.Z,2))
 Write-Host ('Erro coaxial mm '+($err*10)+' health '+$j.HealthStatus)
 if($err -gt .001 -or $j.HealthStatus -ne 11778){throw 'Falha no alinhamento'}
 $old.Delete();$tr.End();$a.Save()
}catch{$tr.Abort();throw}
