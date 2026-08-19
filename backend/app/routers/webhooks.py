"""
Webhook receiver — POST /webhooks/inventory-update

The warehouse pushes stock changes here. We:
  1. Verify the HMAC-SHA256 signature so only the real warehouse can trigger updates.
  2. Immediately ack with 200.
  3. Persist the new stock level + an audit event in TiDB.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import WEBHOOK_SECRET
from app.database import get_db
from app.models import InventoryEvent, Product
from app.schemas import InventoryUpdatePayload, WebhookAck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_SECRET_BYTES = WEBHOOK_SECRET.encode()


def _verify_signature(raw_body: bytes, signature_header: str | None) -> None:
    """
    Raise 401 if the request's HMAC-SHA256 signature doesn't match.

    The warehouse must send the header:
        X-Webhook-Signature: sha256=<hex-digest>
    computed over the raw request body using the shared secret.
    """
    if not signature_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Webhook-Signature header",
        )

    if not signature_header.startswith("sha256="):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature must be prefixed with 'sha256='",
        )

    received_hex = signature_header.removeprefix("sha256=")
    expected_hex = hmac.new(_SECRET_BYTES, raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(received_hex, expected_hex):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature mismatch — request rejected",
        )


@router.post(
    "/inventory-update",
    response_model=WebhookAck,
    status_code=status.HTTP_200_OK,
    summary="Receive a stock update from the warehouse",
)
async def receive_inventory_update(
    request: Request,
    x_webhook_signature: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> WebhookAck:
    # 1. Read raw body BEFORE Pydantic parses it — we need the original bytes for
    #    the HMAC check.
    raw_body = await request.body()

    # 2. Verify signature — rejects unsigned / tampered payloads.
    _verify_signature(raw_body, x_webhook_signature)

    # 3. Parse payload (validation errors return 422 automatically via FastAPI).
    payload = InventoryUpdatePayload.model_validate_json(raw_body)

    # 4. Update DB — record old value for the audit log.
    product = db.get(Product, payload.product_id)
    if product is None:
        # Unknown product — log and ack anyway so the warehouse isn't stuck
        # retrying. Operations can reconcile via the events log.
        logger.warning(
            "Webhook received for unknown product_id=%s — ignored", payload.product_id
        )
        return WebhookAck()

    old_stock = product.current_stock
    product.current_stock = payload.stock_quantity
    product.last_updated = datetime.now(timezone.utc)

    event = InventoryEvent(
        product_id=payload.product_id,
        old_stock=old_stock,
        new_stock=payload.stock_quantity,
        received_at=datetime.now(timezone.utc),
        source="webhook",
    )
    db.add(event)
    db.commit()

    logger.info(
        "inventory_update product_id=%s old=%d new=%d",
        payload.product_id,
        old_stock,
        payload.stock_quantity,
    )

    # 5. Fast 200 ack — the warehouse only needs this acknowledgement.
    return WebhookAck()
