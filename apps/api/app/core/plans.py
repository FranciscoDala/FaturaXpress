# LIMITES POR PLANO - FONTE DA VERDADE
PLAN_LIMITS = {
    "free": {
        "empresas": 1,
        "faturas_mes": 5,
        "label": "FREE"
    },
    "plus": {
        "empresas": 3,
        "faturas_mes": 100,
        "label": "PLUS"
    },
    "premium": {
        "empresas": 10,
        "faturas_mes": 500,
        "label": "PREMIUM"
    },
    "diamond": {
        "empresas": 999999, # ilimitado
        "faturas_mes": 999999, # ilimitado
        "label": "DIAMOND"
    }
}

def get_plan_limit(plan_id: str):
    plan_id = (plan_id or "free").lower()
    return PLAN_LIMITS.get(plan_id, PLAN_LIMITS["free"])

def is_ilimitado(plan_id: str):
    plan_id = (plan_id or "free").lower()
    return plan_id == "diamond"
