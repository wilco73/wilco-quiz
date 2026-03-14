#!/usr/bin/env python3
"""
🎮 WilcoQuiz — Outil d'upload R2
=================================
Upload les médias (images, musique, vidéos) vers Cloudflare R2.

Configuration (variables d'environnement ou fichier .env) :
  R2_BUCKET_NAME       - Nom du bucket
  R2_ACCOUNT_ID        - Account ID Cloudflare
  R2_ACCESS_KEY_ID     - Clé d'accès
  R2_SECRET_ACCESS_KEY - Clé secrète
  R2_PUBLIC_URL        - URL publique (optionnel)

Usage :
  python upload-r2.py sync ./client/public/resources/quiz   Upload tout le dossier
  python upload-r2.py list                                   Liste les fichiers sur R2
  python upload-r2.py add ./chemin/fichier.mp3              Upload un fichier
  python upload-r2.py delete images/affiche001.png          Supprime un fichier
"""

import argparse
import mimetypes
import os
import sys
from pathlib import Path

# ============================================================
# CONFIG — charge depuis .env si présent
# ============================================================
def load_env():
    """Charge les variables depuis .env si le fichier existe."""
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    value = value.strip().strip("'\"")
                    os.environ.setdefault(key.strip(), value)

load_env()

R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "")
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "https://pub-213740a6c3174eb3973155e21bca5314.r2.dev")

# Extensions à uploader
MEDIA_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp",
    # Audio
    ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac",
    # Vidéo
    ".mp4", ".webm", ".mkv", ".avi", ".mov", ".m4v",
}

# Extensions à ignorer
IGNORE_EXTENSIONS = {".csv", ".txt", ".md", ".json"}


def check_config():
    missing = []
    if not R2_BUCKET_NAME: missing.append("R2_BUCKET_NAME")
    if not R2_ACCOUNT_ID: missing.append("R2_ACCOUNT_ID")
    if not R2_ACCESS_KEY_ID: missing.append("R2_ACCESS_KEY_ID")
    if not R2_SECRET_ACCESS_KEY: missing.append("R2_SECRET_ACCESS_KEY")

    if missing:
        print("❌ Variables d'environnement manquantes :")
        for m in missing:
            print(f"   - {m}")
        print()
        print("Créez un fichier .env à côté de ce script :")
        print('   R2_BUCKET_NAME="votre-bucket"')
        print('   R2_ACCOUNT_ID="votre-account-id"')
        print('   R2_ACCESS_KEY_ID="..."')
        print('   R2_SECRET_ACCESS_KEY="..."')
        print('   R2_PUBLIC_URL="https://pub-xxx.r2.dev"')
        sys.exit(1)


def get_s3_client():
    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        print("❌ boto3 requis : pip install boto3")
        sys.exit(1)

    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


# ============================================================
# COMMANDS
# ============================================================
def cmd_sync(args):
    """Upload récursivement un dossier vers R2."""
    base_dir = Path(args.path)
    
    if not base_dir.is_dir():
        print(f"❌ '{base_dir}' n'est pas un dossier")
        sys.exit(1)

    s3 = get_s3_client()
    
    # Collecter tous les fichiers médias
    files_to_upload = []
    for filepath in base_dir.rglob("*"):
        if filepath.is_file() and filepath.suffix.lower() in MEDIA_EXTENSIONS:
            # Calculer le chemin relatif pour R2
            rel_path = filepath.relative_to(base_dir)
            files_to_upload.append((filepath, str(rel_path).replace("\\", "/")))
    
    if not files_to_upload:
        print(f"❌ Aucun fichier média trouvé dans '{base_dir}'")
        print(f"   Extensions recherchées: {', '.join(sorted(MEDIA_EXTENSIONS))}")
        sys.exit(1)
    
    # Calculer la taille totale
    total_size = sum(f[0].stat().st_size for f in files_to_upload)
    
    print(f"📤 Upload de {len(files_to_upload)} fichiers ({format_size(total_size)}) vers R2...")
    print(f"   Bucket: {R2_BUCKET_NAME}")
    print()
    
    uploaded = 0
    errors = 0
    
    for filepath, key in files_to_upload:
        content_type = mimetypes.guess_type(str(filepath))[0] or "application/octet-stream"
        file_size = filepath.stat().st_size
        size_str = format_size(file_size)
        
        # Afficher progression
        print(f"  ⬆️  {key} ({size_str})...", end=" ", flush=True)
        
        try:
            with open(filepath, "rb") as f:
                s3.upload_fileobj(
                    f,
                    R2_BUCKET_NAME,
                    key,
                    ExtraArgs={"ContentType": content_type},
                )
            print("✅")
            uploaded += 1
        except Exception as e:
            print(f"❌ {e}")
            errors += 1
    
    print()
    print(f"✨ Upload terminé : {uploaded} réussis, {errors} erreurs")
    
    if R2_PUBLIC_URL:
        print(f"\n🔗 URL de base : {R2_PUBLIC_URL}/")
        print(f"   Exemple : {R2_PUBLIC_URL}/{files_to_upload[0][1]}")


def cmd_add(args):
    """Upload un fichier unique vers R2."""
    filepath = Path(args.path)
    
    if not filepath.is_file():
        print(f"❌ '{filepath}' n'est pas un fichier")
        sys.exit(1)
    
    s3 = get_s3_client()
    
    # Utiliser le chemin custom ou le nom du fichier
    key = args.key if args.key else filepath.name
    
    content_type = mimetypes.guess_type(str(filepath))[0] or "application/octet-stream"
    file_size = filepath.stat().st_size
    
    print(f"📤 Upload de '{key}' ({format_size(file_size)})...", end=" ", flush=True)
    
    try:
        with open(filepath, "rb") as f:
            s3.upload_fileobj(
                f,
                R2_BUCKET_NAME,
                key,
                ExtraArgs={"ContentType": content_type},
            )
        print("✅")
        
        if R2_PUBLIC_URL:
            print(f"🔗 URL : {R2_PUBLIC_URL}/{key}")
    except Exception as e:
        print(f"❌ {e}")


def cmd_list(args):
    """Liste les fichiers sur R2."""
    s3 = get_s3_client()
    
    prefix = args.prefix or ""
    
    print(f"📚 Fichiers sur R2 (bucket: {R2_BUCKET_NAME}):\n")
    
    folders = {}
    total_size = 0
    total_files = 0
    
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=R2_BUCKET_NAME, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            size = obj["Size"]
            total_size += size
            total_files += 1
            
            # Grouper par dossier
            parts = key.split("/")
            if len(parts) > 1:
                folder = parts[0]
                if folder not in folders:
                    folders[folder] = {"count": 0, "size": 0}
                folders[folder]["count"] += 1
                folders[folder]["size"] += size
            else:
                if "_root" not in folders:
                    folders["_root"] = {"count": 0, "size": 0}
                folders["_root"]["count"] += 1
                folders["_root"]["size"] += size
    
    if not folders:
        print("  (vide)")
        return
    
    # Afficher par dossier
    for folder in sorted(folders):
        info = folders[folder]
        display_name = "(racine)" if folder == "_root" else f"{folder}/"
        print(f"  📁 {display_name}")
        print(f"     {info['count']} fichiers, {format_size(info['size'])}")
    
    print()
    print(f"  Total : {total_files} fichiers, {format_size(total_size)}")


def cmd_delete(args):
    """Supprime un fichier ou dossier de R2."""
    key = args.key
    s3 = get_s3_client()
    
    # Vérifier si c'est un dossier (préfixe)
    objects = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=R2_BUCKET_NAME, Prefix=key):
        for obj in page.get("Contents", []):
            objects.append({"Key": obj["Key"]})
    
    if not objects:
        print(f"❌ '{key}' non trouvé sur R2")
        sys.exit(1)
    
    print(f"🗑  Suppression de {len(objects)} fichier(s) correspondant à '{key}'...")
    for obj in objects[:5]:
        print(f"     - {obj['Key']}")
    if len(objects) > 5:
        print(f"     ... et {len(objects) - 5} autres")
    
    confirm = input("\n   Confirmer ? (oui/non) : ").strip().lower()
    if confirm not in ("oui", "o", "yes", "y"):
        print("   Annulé.")
        return
    
    s3.delete_objects(Bucket=R2_BUCKET_NAME, Delete={"Objects": objects})
    print(f"✅ {len(objects)} fichier(s) supprimé(s).")


# ============================================================
# HELPERS
# ============================================================
def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / 1024**2:.1f} MB"
    else:
        return f"{size_bytes / 1024**3:.2f} GB"


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="🎮 WilcoQuiz — Upload médias vers Cloudflare R2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", help="Commande")

    # sync
    p_sync = sub.add_parser("sync", help="Upload récursivement un dossier")
    p_sync.add_argument("path", help="Chemin du dossier à uploader")

    # add
    p_add = sub.add_parser("add", help="Upload un fichier unique")
    p_add.add_argument("path", help="Chemin du fichier")
    p_add.add_argument("--key", help="Chemin sur R2 (défaut: nom du fichier)")

    # list
    p_list = sub.add_parser("list", help="Liste les fichiers sur R2")
    p_list.add_argument("--prefix", help="Filtrer par préfixe", default="")

    # delete
    p_del = sub.add_parser("delete", help="Supprime un fichier ou dossier")
    p_del.add_argument("key", help="Chemin du fichier/dossier à supprimer")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        print()
        print("Exemples :")
        print("  python upload-r2.py sync ./client/public/resources/quiz")
        print("  python upload-r2.py list")
        print("  python upload-r2.py list --prefix images/")
        sys.exit(0)

    check_config()

    if args.command == "sync":
        cmd_sync(args)
    elif args.command == "add":
        cmd_add(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "delete":
        cmd_delete(args)


if __name__ == "__main__":
    main()
