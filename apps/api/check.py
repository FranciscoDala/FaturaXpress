import glob, os
for f in glob.glob('alembic/versions/*.py'):
    lines=open(f, encoding='utf-8', errors='ignore').readlines()
    rev=down=''
    for l in lines:
        if l.strip().startswith('revision') and '=' in l:
            rev=l.strip()
        if l.strip().startswith('down_revision') and '=' in l:
            down=l.strip()
    print(f"{os.path.basename(f)}\n  {rev}\n  {down}\n")
