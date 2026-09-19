. "$PSScriptRoot\optica-cad-lib.ps1"
$tr=$inv.TransactionManager.StartTransaction($a,'Reforcos e regulagens da bancada')
try {
 $arm=$a.ComponentDefinition.Occurrences.ItemByName('braco:1');$d=$arm.Definition
 $d.Features.ExtrudeFeatures.Item(4).Suppressed=$true
 $d.Parameters.Item('d6').Value=4.0
 Box $d -9.7 0 0 1.325 -.6 .6 20481 'Braco_reforcado_12mm'
 Ring $d -10 0 0 1.325 .8 .25 20481 'Cubo_reforcado'
 Cylinder $d 0 0 1.325 5.325 .9 20481 'Bucha_telescopica_18mm'
 Cylinder $d 0 0 1.4 5.4 .605 20482 'Alojamento_haste_12_1mm'
 $s=Sketch $d 'XY' -.2 'Nervura_perfil';Poly $s @(@(-2.7,1.325,-.2),@(0,1.325,-.2),@(0,4.1,-.2));[void](Extrude $d $s .4 20481 'Nervura_haste')
 $s=Sketch $d 'XY' .55 'Trava_altura_perfil';Circle $s 0 4.7 .55 .165;[void](Extrude $d $s .5 20482 'Pre_furo_rosca_M4_trava_altura')
 $s=Sketch $d 'XY' .2 'Trava_cubo_perfil';Circle $s -10 .65 .2 .125;[void](Extrude $d $s .7 20482 'Pre_furo_rosca_M3_cubo')
 Box $d -6.8 -5.2 0 1.325 .55 1.05 20481 'Orelha_alivio_cabo'
 Cylinder $d -6.4 .82 -.05 1.4 .17 20482 'Passagem_abracadeira_1'
 Cylinder $d -5.6 .82 -.05 1.4 .17 20482 'Passagem_abracadeira_2'
 $d.Document.Update();$d.Document.Save()
 $base=$a.ComponentDefinition.Occurrences.ItemByName('base:1');$bd=$base.Definition
 Box $bd -1 6 -.6 0 -1 5.25 20481 'Sapata_ampliada_70x62_5'
 foreach($x in @(-.5,5.5)){foreach($z in @(-.5,4.75)){Cylinder $bd $x $z -.65 .05 .275 20482 ('Fixacao_bancada_'+$x+'_'+$z)}}
 $bd.Document.Update();$bd.Document.Save()
 $disk=$a.ComponentDefinition.Occurrences.ItemByName('disco:1');$dd=$disk.Definition
 # Pares de rasgos para fixacao e centragem manual do porta-amostra.
 foreach($z in @(-1.5,1.5)){Box $dd -1.5 1.5 -.05 .4 ($z-.22) ($z+.22) 20482 ('Rasgo_centragem_'+$z)}
 $dd.Document.Update();$dd.Document.Save()
 $a.Update();$tr.End();$a.Save();'Reforcos aplicados.'
}catch{$tr.Abort();throw}
