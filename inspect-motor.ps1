$inv=[Runtime.InteropServices.Marshal]::GetActiveObject('Inventor.Application')
$a=$inv.ActiveDocument
$o=$a.ComponentDefinition.Occurrences.Item(1)
$arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1')
$im=$arm.Transformation.Copy(); $im.Invert()
foreach($b in $o.SurfaceBodies){foreach($f in $b.Faces){if($f.SurfaceType -eq 5891){$g=$f.Geometry; $p=$g.BasePoint.Copy();$p.TransformBy($im); [pscustomobject]@{R=$g.Radius;X=$p.X;Y=$p.Y;Z=$p.Z} }}} | Out-Null
