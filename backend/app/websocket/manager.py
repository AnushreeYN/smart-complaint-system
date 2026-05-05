from fastapi import WebSocket
from typing import Dict, List
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[UUID, List[WebSocket]] = {}
        self.user_organizations: Dict[UUID, UUID] = {}

    async def connect(self, user_id: UUID, organization_id: UUID, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.user_organizations[user_id] = organization_id

    def disconnect(self, user_id: UUID, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.user_organizations.pop(user_id, None)

    async def send_personal_message(self, message: str, user_id: UUID):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(message)

    async def broadcast(self, message: str):
        for user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(message)

    async def broadcast_to_organization(self, organization_id: UUID, message: str):
        for user_id, connections in self.active_connections.items():
            if self.user_organizations.get(user_id) != organization_id:
                continue
            for connection in connections:
                await connection.send_text(message)

manager = ConnectionManager()
