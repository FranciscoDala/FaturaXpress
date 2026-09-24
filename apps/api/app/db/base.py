from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Registra todos os models no mesmo metadata
# Isso corrige o erro "removed table faturas"
try:
    from app.modules.auth.models import Company, User  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.areas.models import Area  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.clients.models import Cliente  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.products.models import Produto  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.funcionarios.models import Funcionario, funcionario_areas  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.fatura.models import Fatura, FaturaItem  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.assinatura.models import Plan, Subscription  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.auditoria.models import AtividadeLog  # noqa: F401
except ImportError:
    pass

try:
    from app.modules.documentos.models import ModeloDocumento, DocumentoGerado  # noqa: F401
except ImportError:
    pass
