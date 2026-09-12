$root = "faturaxpress"

$folders = @(
# API - Backend FastAPI
"apps/api/src/app/core",
"apps/api/src/app/db",
"apps/api/src/app/shared",
"apps/api/src/app/modules/auth",
"apps/api/src/app/modules/tenants",      # Empresas/Contabilistas
"apps/api/src/app/modules/invoices",     # FaturaXpress - Coração
"apps/api/src/app/modules/agt",          # Integração AGT
"apps/api/src/app/modules/billing",      # Planos e Pagamentos
"apps/api/src/app/modules/products",     # Produtos/Serviços
"apps/api/src/app/modules/clients",      # Clientes com NIF
"apps/api/src/app/modules/reports",      # SAF-T e Relatórios
"apps/api/src/app/tests",

# WEB - Painel Admin pra ti gerir o FaturaXpress
"apps/web/src/app",
"apps/web/src/components",
"apps/web/src/lib",
"apps/web/src/api",
"apps/web/public",

# MOBILE - App FaturaXpress pro cliente final
"apps/mobile/src/screens",
"apps/mobile/src/components",
"apps/mobile/src/services",
"apps/mobile/src/store",
"apps/mobile/src/assets",

# PACKAGES - Código compartilhado
"packages/ui",
"packages/tsconfig",
"packages/eslint-config",
"packages/db",           # Models e migrations
"packages/config",       # Validações NIF, IVA, etc

"infra",
"docs",
".github/workflows"
)

$files = @(
# API
"apps/api/src/app/main.py",
"apps/api/src/app/__init__.py",
"apps/api/src/app/core/config.py",
"apps/api/src/app/core/security.py",
"apps/api/src/app/core/exceptions.py",
"apps/api/src/app/db/session.py",
"apps/api/src/app/db/base.py",
"apps/api/src/app/shared/utils.py",

# Modulo Auth
"apps/api/src/app/modules/auth/router.py",
"apps/api/src/app/modules/auth/service.py",
"apps/api/src/app/modules/auth/schemas.py",
"apps/api/src/app/modules/auth/models.py",

# Modulo Tenants - Quem paga o FaturaXpress
"apps/api/src/app/modules/tenants/router.py",
"apps/api/src/app/modules/tenants/service.py",
"apps/api/src/app/modules/tenants/schemas.py",
"apps/api/src/app/modules/tenants/models.py",

# Modulo Clients
"apps/api/src/app/modules/clients/router.py",
"apps/api/src/app/modules/clients/service.py",
"apps/api/src/app/modules/clients/schemas.py",
"apps/api/src/app/modules/clients/models.py",

# Modulo Products
"apps/api/src/app/modules/products/router.py",
"apps/api/src/app/modules/products/service.py",
"apps/api/src/app/modules/products/schemas.py",
"apps/api/src/app/modules/products/models.py",

# Modulo Invoices - FaturaXpress
"apps/api/src/app/modules/invoices/router.py",
"apps/api/src/app/modules/invoices/service.py",
"apps/api/src/app/modules/invoices/schemas.py",
"apps/api/src/app/modules/invoices/models.py",
"apps/api/src/app/modules/invoices/pdf_generator.py",

# Modulo AGT
"apps/api/src/app/modules/agt/client.py",
"apps/api/src/app/modules/agt/schemas_agt.py",
"apps/api/src/app/modules/agt/signer.py",

# Modulo Billing
"apps/api/src/app/modules/billing/router.py",
"apps/api/src/app/modules/billing/service.py",
"apps/api/src/app/modules/billing/schemas.py",
"apps/api/src/app/modules/billing/models.py",

# Modulo Reports
"apps/api/src/app/modules/reports/router.py",
"apps/api/src/app/modules/reports/service.py",

"apps/api/src/app/tests/test_auth.py",
"apps/api/alembic.ini",
"apps/api/Dockerfile",
"apps/api/pyproject.toml",

# WEB - Painel Admin
"apps/web/src/app/layout.tsx",
"apps/web/src/app/login/page.tsx",
"apps/web/src/app/dashboard/page.tsx", # Ver todos clientes, pagamentos
"apps/web/src/components/Header.tsx",
"apps/web/src/api/client.ts",
"apps/web/package.json",
"apps/web/next.config.js",

# MOBILE - FaturaXpress
"apps/mobile/src/screens/LoginScreen.tsx",
"apps/mobile/src/screens/DashboardScreen.tsx",
"apps/mobile/src/screens/NewInvoiceScreen.tsx",
"apps/mobile/src/screens/ClientsScreen.tsx",
"apps/mobile/src/screens/ProductsScreen.tsx",
"apps/mobile/src/services/api.ts",
"apps/mobile/package.json",

# PACKAGES
"packages/ui/index.ts",
"packages/tsconfig/base.json",
"packages/eslint-config/index.js",
"packages/db/index.ts",

"infra/docker-compose.yml",
"infra/render.yaml",
"docs/API.md",
"docs/ONBOARDING.md",
".github/workflows/deploy.yml",
".gitignore",
"package.json",
"pnpm-workspace.yaml",
"README.md",
".env.example"
)

# Criar pastas
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path "$root/$folder" | Out-Null
}

# Criar arquivos vazios
foreach ($file in $files) {
    New-Item -ItemType File -Force -Path "$root/$file" | Out-Null
}

Write-Host "Estrutura do FaturaXpress criada com sucesso em ./$root"
