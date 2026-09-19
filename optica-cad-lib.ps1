$ErrorActionPreference='Stop'
$inv=[Runtime.InteropServices.Marshal]::GetActiveObject('Inventor.Application')
$tg=$inv.TransientGeometry
$root=Join-Path $PSScriptRoot 'revisao-optica'
$a=$inv.ActiveDocument
if($a.FullFileName -ne (Join-Path $root 'Montagem-revisada.iam')){throw 'A revisao deve estar ativa.'}
function P($x,$y,$z){$tg.CreatePoint([double]$x,[double]$y,[double]$z)}
function V($x,$y,$z){$tg.CreateUnitVector([double]$x,[double]$y,[double]$z)}
function Sketch($d,$plane,$level,$name){
 switch($plane){
 'XZ' {$wp=$d.WorkPlanes.AddFixed((P 0 $level 0),(V 1 0 0),(V 0 0 -1),$true)}
 'XY' {$wp=$d.WorkPlanes.AddFixed((P 0 0 $level),(V 1 0 0),(V 0 1 0),$true)}
 'YZ' {$wp=$d.WorkPlanes.AddFixed((P $level 0 0),(V 0 1 0),(V 0 0 1),$true)}
 }
 $wp.Visible=$false;$s=$d.Sketches.Add($wp);$s.Name=$name;return $s
}
function Circle($s,$x,$y,$z,$r){[void]$s.SketchCircles.AddByCenterRadius($s.ModelToSketchSpace((P $x $y $z)),[double]$r)}
function Poly($s,$pts){$first=$null;$last=$null;for($i=0;$i -lt $pts.Count;$i++){ $p1=$pts[$i];$p2=$pts[($i+1)%$pts.Count];$start=if($null -eq $last){$s.ModelToSketchSpace((P $p1[0] $p1[1] $p1[2]))}else{$last};$end=if($i -eq ($pts.Count-1)){$first}else{$s.ModelToSketchSpace((P $p2[0] $p2[1] $p2[2]))};$line=$s.SketchLines.AddByTwoPoints($start,$end);if($i -eq 0){$first=$line.StartSketchPoint};$last=$line.EndSketchPoint} }
function Extrude($d,$s,$len,$op,$name){Write-Host ('Criando '+$name+' linhas='+$s.SketchLines.Count+' circulos='+$s.SketchCircles.Count);$profile=$s.Profiles.AddForSolid($true);$def=$d.Features.ExtrudeFeatures.CreateExtrudeDefinition($profile,$op);$def.SetDistanceExtent([double]$len,20993);$f=$d.Features.ExtrudeFeatures.Add($def);$f.Name=$name;$s.Visible=$false;return $f}
function Box($d,$x1,$x2,$y1,$y2,$z1,$z2,$op,$name){$s=Sketch $d 'XZ' $y1 ($name+'_perfil');Poly $s @(@($x1,$y1,$z1),@($x2,$y1,$z1),@($x2,$y1,$z2),@($x1,$y1,$z2));[void](Extrude $d $s ($y2-$y1) $op $name)}
function Cylinder($d,$x,$z,$y1,$y2,$r,$op,$name){$s=Sketch $d 'XZ' $y1 ($name+'_perfil');Circle $s $x $y1 $z $r;[void](Extrude $d $s ($y2-$y1) $op $name)}
function Ring($d,$x,$z,$y1,$y2,$ro,$ri,$op,$name){$s=Sketch $d 'XZ' $y1 ($name+'_perfil');Circle $s $x $y1 $z $ro;Circle $s $x $y1 $z $ri;[void](Extrude $d $s ($y2-$y1) $op $name)}
function NewPart($name){$doc=$inv.Documents.Add(12290,$inv.FileManager.GetTemplateFile(12290),$false);$doc.SaveAs((Join-Path $root ($name+'.ipt')),$false);return $doc}
function Attach($doc,$parent,$name){$doc.Update();$doc.Save();$o=$a.ComponentDefinition.Occurrences.Add($doc.FullFileName,$parent.Transformation);$o.Name=$name;for($i=1;$i -le 3;$i++){ $one=$null;$two=$null;$o.CreateGeometryProxy($o.Definition.WorkPlanes.Item($i),[ref]$one);$parent.CreateGeometryProxy($parent.Definition.WorkPlanes.Item($i),[ref]$two);[void]$a.ComponentDefinition.Constraints.AddFlushConstraint($one,$two,0)};return $o}
