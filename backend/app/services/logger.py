import json
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

# In-memory list of active WebSocket connections (we'll manage them later)
active_connections = []

def log_event(db: Session, message: str, level: str = "INFO", source: str = "SYSTEM", owner_id: int = None):
    """Save log to DB and push to WebSocket clients."""
    log_entry = ActivityLog(
        timestamp=datetime.utcnow(),
        level=level,
        source=source,
        message=message,
        owner_id=owner_id
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    # Prepare data for WebSocket
    payload = {
        "id": log_entry.id,
        "timestamp": log_entry.timestamp.isoformat(),
        "level": log_entry.level,
        "source": log_entry.source,
        "message": log_entry.message,
        "owner_id": log_entry.owner_id
    }
    
    # Shedule the async broadcast in the background
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(_broadcast(payload, owner_id))
    except RuntimeError:
        # Ignore broadcast
        pass
    
    
            
async def _broadcast(payload: dict, owner_id: int = None):
    """Push the payload to all matching WebSocket connections"""
    for conn, uid in active_connections:
        if owner_id is None or uid == owner_id:
            try:
                await conn.send_text(json.dumps(payload))
            except Exception:
                pass