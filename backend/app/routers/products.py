"""
Product query endpoints.

GET /products                 — list all products with live stock status
GET /products/{product_id}/stock — single-product stock level

Both endpoints read directly from TiDB; no call is made to the warehouse.
The data is kept fresh by the webhook receiver, not by polling.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.schemas import ProductListItem, StockResponse, stock_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["products"])


@router.get(
    "",
    response_model=list[ProductListItem],
    summary="List products with current stock status",
)
def list_products(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    db: Session = Depends(get_db),
) -> list[ProductListItem]:
    stmt = select(Product)
    if category:
        stmt = stmt.where(Product.category == category)
    stmt = stmt.order_by(Product.name)

    rows = db.execute(stmt).scalars().all()

    return [
        ProductListItem(
            id=p.id,
            name=p.name,
            category=p.category,
            current_stock=p.current_stock,
            status=stock_status(p.current_stock),
            last_updated=p.last_updated,
        )
        for p in rows
    ]


@router.get(
    "/{product_id}/stock",
    response_model=StockResponse,
    summary="Get current stock level for a single product",
)
def get_product_stock(
    product_id: str,
    db: Session = Depends(get_db),
) -> StockResponse:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{product_id}' not found",
        )

    return StockResponse(
        product_id=product.id,
        current_stock=product.current_stock,
        status=stock_status(product.current_stock),
        last_updated=product.last_updated,
    )
