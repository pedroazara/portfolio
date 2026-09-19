$ErrorActionPreference='Stop'
$inv=[Runtime.InteropServices.Marshal]::GetActiveObject('Inventor.Application')
function Pt($p) { @([Math]::Round($p.X,5),[Math]::Round($p.Y,5),[Math]::Round($p.Z,5)) }
$a=$inv.ActiveDocument
$res=@{Assembly=$a.FullFileName; Parts=@(); Constraints=@(); Joints=@()}
foreach($o in $a.ComponentDefinition.Occurrences) {
 $d=$o.Definition
 $m=$o.Transformation
 $mat=@(); for($r=1;$r -le 4;$r++){for($c=1;$c -le 4;$c++){$mat+=$m.Cell($r,$c)}}
 $part=@{Name=$o.Name; File=$d.Document.FullFileName; Grounded=$o.Grounded; Matrix=$mat; Min=(Pt $d.RangeBox.MinPoint); Max=(Pt $d.RangeBox.MaxPoint); Parameters=@(); Features=@(); Faces=@()}
 foreach($p in $d.Parameters){$part.Parameters+=@{Name=$p.Name;Expression=$p.Expression;Value=$p.Value}}
 foreach($f in $d.Features){$part.Features+=@{Name=$f.Name;Type=$f.Type}}
 if($o.Name -notlike '*NEMA*') {
  foreach($b in $d.SurfaceBodies){foreach($f in $b.Faces){$geo=$f.Geometry; $part.Faces+=@{Type=$f.SurfaceType;Point=(Pt $f.PointOnFace);Normal= $(if($f.SurfaceType -eq 5890){Pt $geo.Normal});Radius=$geo.Radius;Axis=$(if($geo.AxisVector){Pt $geo.AxisVector});Base=$(if($geo.BasePoint){Pt $geo.BasePoint})}}}
 }
 $res.Parts+=$part
}
foreach($c in $a.ComponentDefinition.Constraints){$res.Constraints+=@{Name=$c.Name;Type=$c.Type;Health=$c.HealthStatus;Suppressed=$c.Suppressed;One=$c.OccurrenceOne.Name;Two=$c.OccurrenceTwo.Name;Offset=$c.Offset.Expression;Ratio=$c.Ratio.Expression}}
foreach($j in $a.ComponentDefinition.Joints){$res.Joints+=@{Name=$j.Name;Health=$j.HealthStatus;One=$j.OccurrenceOne.Name;Two=$j.OccurrenceTwo.Name;Type=$j.Definition.JointType}}
$res | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath ($PSScriptRoot+'\optica-inspection.json')
