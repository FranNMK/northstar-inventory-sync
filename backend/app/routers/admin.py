"""
Admin product management endpoints (admin role required).

POST   /admin/products        — create a new product
PUT    /admin/products/{id}   — update an existing product
DELETE /admin/products/{id}   — delete a product
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Product, User
from app.schemas import ProductCreate, ProductListItem, ProductUpdate, stock_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/products",
    response_model=ProductListItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product (admin only)",
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ProductListItem:
    existing = db.get(Product, payload.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with id '{payload.id}' already exists",
        )
    product = Product(
        id=payload.id,
        name=payload.name,
        category=payload.category,
        current_stock=payload.current_stock,
        price=payload.price,
        image_url=payload.image_url,
        last_updated=datetime.now(timezone.utc),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    logger.info("Product created: %s by admin %s", product.id, _admin.email)
    return ProductListItem(
        id=product.id,
        name=product.name,
        category=product.category,
        current_stock=product.current_stock,
        status=stock_status(product.current_stock),
        last_updated=product.last_updated,
        price=product.price,
        image_url=product.image_url,
    )


@router.put(
    "/products/{product_id}",
    response_model=ProductListItem,
    summary="Update an existing product (admin only)",
)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ProductListItem:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{product_id}' not found",
        )
    # Use model_fields_set so that explicitly-sent null clears a field,
    # while fields omitted from the request body are left untouched.
    for field in payload.model_fields_set:
        setattr(product, field, getattr(payload, field))
    product.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(product)
    logger.info("Product updated: %s by admin %s", product.id, _admin.email)
    return ProductListItem(
        id=product.id,
        name=product.name,
        category=product.category,
        current_stock=product.current_stock,
        status=stock_status(product.current_stock),
        last_updated=product.last_updated,
        price=product.price,
        image_url=product.image_url,
    )


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product (admin only)",
)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{product_id}' not found",
        )
    db.delete(product)
    db.commit()
    logger.info("Product deleted: %s by admin %s", product_id, _admin.email)
