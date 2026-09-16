import asyncio
import uuid
from typing import Dict, List
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class RealtimeManager:
    def __init__(self):
        # company_id (str) -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, company_id: uuid.UUID):
        await websocket.accept()
        cid = str(company_id)
        async with self.lock:
            if cid not in self.active_connections:
                self.active_connections[cid] = []
            self.active_connections[cid].append(websocket)
        logger.info(f"WS conectado: company {cid} - total {len(self.active_connections[cid])}")

    async def disconnect(self, websocket: WebSocket, company_id: uuid.UUID):
        cid = str(company_id)
        async with self.lock:
            if cid in self.active_connections:
                if websocket in self.active_connections[cid]:
                    self.active_connections[cid].remove(websocket)
                if len(self.active_connections[cid]) == 0:
                    del self.active_connections[cid]
        logger.info(f"WS desconectado: company {cid}")

    async def broadcast(self, company_id: uuid.UUID, message: dict):
        cid = str(company_id)
        async with self.lock:
            connections = list(self.active_connections.get(cid, []))

        if not connections:
            return

        dead = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        if dead:
            async with self.lock:
                for ws in dead:
                    if cid in self.active_connections and ws in self.active_connections[cid]:
                        self.active_connections[cid].remove(ws)

manager = RealtimeManager()
