from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal, Optional


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
    price: Optional[float] = None
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class WebhookAck(BaseModel):
    received: bool = True


# ── Auth schemas ───────────────────────────────────────────────────────────────

UserRole = Literal["admin", "staff"]


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = "staff"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    role: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Admin product schemas ──────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_\-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=128)
    current_stock: int = Field(..., ge=0, le=1_000_000)
    price: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    image_url: Optional[str] = Field(default=None, max_length=512)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, min_length=1, max_length=128)
    current_stock: Optional[int] = Field(default=None, ge=0, le=1_000_000)
    price: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    image_url: Optional[str] = Field(default=None, max_length=512)
