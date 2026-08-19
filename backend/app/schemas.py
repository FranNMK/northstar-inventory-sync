from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


# ── Webhook payload sent by the warehouse ──────────────────────────────────────

class InventoryUpdatePayload(BaseModel):
    product_id: str
    stock_quantity: int = Field(..., ge=0)
    updated_at: datetime


# ── Response schemas ───────────────────────────────────────────────────────────

StockStatus = Literal["in_stock", "low_stock", "out_of_stock"]


def stock_status(qty: int) -> StockStatus:
    if qty == 0:
        return "out_of_stock"
    if qty <= 10:
        return "low_stock"
    return "in_stock"


class StockResponse(BaseModel):
    product_id: str
    current_stock: int
    status: StockStatus
    last_updated: datetime

    model_config = {"from_attributes": True}


class ProductListItem(BaseModel):
    id: str
    name: str
    category: str
    current_stock: int
    status: StockStatus
    last_updated: datetime

    model_config = {"from_attributes": True}


class WebhookAck(BaseModel):
    received: bool = True
