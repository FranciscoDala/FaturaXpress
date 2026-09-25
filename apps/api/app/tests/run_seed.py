import uuid
from app.db.session import SessionLocal
from app.modules.documentos.seed import seed_modelos

company_id = uuid.UUID("COLOCA-AQUI-O-ID-DA-EMPRESA-DO-ADILSON")
db = SessionLocal()
seed_modelos(db, company_id)
db.close()
