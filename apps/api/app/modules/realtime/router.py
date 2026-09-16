import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import logging
from app.core.jwt import decode_access_token
from app.modules.realtime.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["Realtime"])

@router.websocket("/realtime")
async def websocket_realtime(websocket: WebSocket, token: str = Query(...)):
    company_id = None
    try:
        payload = decode_access_token(token)
        company_id_str = payload.get("company_id")
        if not company_id_str:
            await websocket.close(code=4001)
            return
        company_id = uuid.UUID(company_id_str)
    except Exception as e:
        logger.warning(f"WS token inválido: {e}")
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, company_id)
    try:
        # Mantém conexão viva, escuta ping do front se precisar
        while True:
            data = await websocket.receive_text()
            # opcional: responde pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS erro company {company_id}: {e}")
    finally:
        await manager.disconnect(websocket, company_id)
