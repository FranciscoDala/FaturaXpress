from app.db.session import SessionLocal
from app.modules.assinatura.models import Plan

db = SessionLocal()
plans = [
  {"id":"free","name":"FREE","sub":"Para testar grátis","price":0,"price_label":"0","popular":False,"features":["05 Faturas por mês","Biblioteca Básica","1 Empresa","Suporte por email","Acesso imediato"]},
  {"id":"plus","name":"PLUS","sub":"Para quem está começando","price":5000,"price_label":"5.000","popular":False,"features":["05 Faturas por mês","Biblioteca Básica","1 Empresa","Suporte por email","Acesso imediato"]},
  {"id":"premium","name":"PREMIUM","sub":"Para negócios profissionais","price":8500,"price_label":"8.500","popular":True,"features":["Faturas ilimitadas","Biblioteca Premium","Fatura AGT FT + SAFT","QR Code AGT","Suporte WhatsApp"]},
  {"id":"diamond","name":"DIAMOND","sub":"Para Agências e Equipes","price":18000,"price_label":"18.000","popular":False,"features":["Tudo do Premium","Multi-empresas","API e Webhooks","Suporte prioritário","Onboarding dedicado"]},
]
for p in plans:
    if not db.query(Plan).filter_by(id=p["id"]).first():
        db.add(Plan(**p))
        print(f"adicionado {p['id']}")
db.commit()
print("seed ok")
