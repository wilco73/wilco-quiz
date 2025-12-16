# Définir le chemin du dossier contenant les fichiers
$dossier = ".\client\public\resources\quiz\musique\blindtest\musique\medieval"

# Définir le préfixe pour les nouveaux noms
$prefixe = "bt_medieval"

# Chemin du fichier de correspondance
$fichierLog = Join-Path $dossier "correspondance.txt"

# Récupérer tous les fichiers (sans les sous-dossiers)
$fichiers = Get-ChildItem -Path $dossier -File

# Initialiser le compteur
$compteur = 1

# Créer/vider le fichier de correspondance
"Ancien nom -> Nouveau nom" | Out-File -FilePath $fichierLog -Encoding UTF8

# Parcourir et renommer chaque fichier
foreach ($fichier in $fichiers) {
    # Générer le nouveau nom avec extension
    $extension = $fichier.Extension
    $nouveauNom = "{0}_{1:D3}{2}" -f $prefixe, $compteur, $extension
    
    # Enregistrer la correspondance
    "$($fichier.Name) -> $nouveauNom" | Out-File -FilePath $fichierLog -Append -Encoding UTF8
    
    # Renommer le fichier en utilisant l'objet FileInfo directement
    $fichier | Rename-Item -NewName $nouveauNom
    
    $compteur++
}

Write-Host "Renommage terminé ! $($compteur - 1) fichiers renommés."
Write-Host "Fichier de correspondance créé : $fichierLog"