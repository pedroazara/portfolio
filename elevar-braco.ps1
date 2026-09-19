. "$PSScriptRoot\optica-cad-lib.ps1"
$tr=$inv.TransactionManager.StartTransaction($a,'Espaco para apoio de rolamento')
try{
 $arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1');$before=$arm.Transformation.Translation.Y
 $a.ComponentDefinition.Constraints.Item(3).Suppressed=$true
 $j=$a.ComponentDefinition.Joints.Item(1);$j.Definition.Gap.Value=.3
 $a.Update()
 $after=$arm.Transformation.Translation.Y
 Write-Host ('Antes='+$before+' Depois='+$after)
 foreach($c in $a.ComponentDefinition.Constraints){Write-Host ($c.Name+' '+$c.HealthStatus)}
 foreach($c in $a.ComponentDefinition.Joints){Write-Host ($c.Name+' '+$c.HealthStatus)}
 $tr.Abort()
}catch{$tr.Abort();throw}
