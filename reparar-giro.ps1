. "$PSScriptRoot\optica-cad-lib.ps1"
$arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1');$motor=$a.ComponentDefinition.Occurrences.Item(1)
$saved=(Get-Content -LiteralPath "$PSScriptRoot\optica-inspection.json" -Raw|ConvertFrom-Json).Parts|Where-Object Name -eq 'braco:1'
$m=$tg.CreateMatrix();for($r=1;$r -le 4;$r++){for($c=1;$c -le 4;$c++){$m.Cell($r,$c)=$saved.Matrix[($r-1)*4+$c-1]}};$arm.SetTransformWithoutConstraints($m)
$im=$arm.Transformation.Copy();$im.Invert()
function TopIntent($occ,$x,$y){
 $edge=$null;$face=$null
 foreach($e in $occ.SurfaceBodies.Item(1).Edges){if($e.GeometryType -eq 5124){$g=$e.Geometry;$p=$g.Center.Copy();$p.TransformBy($im);if([Math]::Abs($p.X-$x) -lt .001 -and [Math]::Abs($p.Y-$y) -lt .001 -and [Math]::Abs($g.Radius-.25) -lt .001){$edge=$e;break}}}
 if(-not $edge){foreach($f in $occ.SurfaceBodies.Item(1).Faces){if($f.SurfaceType -eq 5890){$p=$f.PointOnFace.Copy();$p.TransformBy($im);$n=$f.Geometry.Normal.Copy();$n.TransformBy($im);if([Math]::Abs($p.Y-$y) -lt .001 -and [Math]::Abs($n.Y) -gt .99){$face=$f;break}}};if(-not $face){throw ('Face not found '+$occ.Name)};$pt=P $x $y 0;$pt.TransformBy($arm.Transformation);return $a.ComponentDefinition.CreateGeometryIntent($face,$pt)}
 foreach($f in $edge.Faces){if($f.SurfaceType -eq 5890){$face=$f;break}}
 if(-not $face){throw 'Face not found'}
 $ei=$a.ComponentDefinition.CreateGeometryIntent($edge,57860)
 return $a.ComponentDefinition.CreateGeometryIntent($face,$ei)
}
foreach($c in $a.ComponentDefinition.Constraints){if($c.Type -eq 100666624){$c.Suppressed=$true}}
$tr=$inv.TransactionManager.StartTransaction($a,'Reparar junta de giro')
try{
 $d=$a.ComponentDefinition.Joints.CreateAssemblyJointDefinition(102402,(TopIntent $arm -10 1.325),(TopIntent $motor -10 1.325));$d.FlipOriginDirection=$true
 $j=$a.ComponentDefinition.Joints.Add($d);$j.Name='Giro_braco_revisado';$a.Update();Write-Host ('Junta '+$j.HealthStatus)
 $tr.End();$a.Save()
}catch{$tr.Abort();throw}
