. "$PSScriptRoot\optica-cad-lib.ps1"
$arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1');$rod=$a.ComponentDefinition.Occurrences.ItemByName('Haste_ajustavel_PM16');$det=$a.ComponentDefinition.Occurrences.ItemByName('Fotodetector_PM16_121');$disk=$a.ComponentDefinition.Occurrences.ItemByName('disco:1')
# A nervura foi criada depois do primeiro furo. Reabrir o alojamento remove a sua intrusao.
Cylinder $arm.Definition 0 0 1.4 5.4 .605 20482 'Acabamento_alojamento_apos_nervura'
$arm.Definition.Document.Update();$arm.Definition.Document.Save();$a.Update()
$j=$a.ComponentDefinition.Joints.Item(2)
$initial=$j.Definition.AngularPosition.Value
$checks=@()
foreach($angle in @(0,30,60,90,120,150,180)){
 $j.Definition.AngularPosition.Value=($angle*[Math]::PI/180)
 $a.Update()
 $set=$inv.TransientObjects.CreateObjectCollection();foreach($o in $a.ComponentDefinition.Occurrences){$set.Add($o)}
 $results=$a.ComponentDefinition.AnalyzeInterference($set)
 $pairs=@();foreach($r in $results){$pairs+=@{One=$r.OccurrenceOne.Name;Two=$r.OccurrenceTwo.Name;VolumeCm3=$r.Volume}}
 $checks+=@{Angle=$angle;JointHealth=$j.HealthStatus;Interferences=$pairs}
}
$j.Definition.AngularPosition.Value=$initial;$a.Update()
$checks | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $root 'verificacao-movimento.json')
$a.Save()
$checks | ConvertTo-Json -Depth 5 -Compress
