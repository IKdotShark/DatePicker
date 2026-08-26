from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Restaurant
from ..schemas import RestaurantCreate, RestaurantOut, RestaurantUpdate
from ..security import require_admin

router = APIRouter(prefix="/admin/restaurants", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[RestaurantOut])
def list_restaurants(db: Session = Depends(get_db)):
    return db.query(Restaurant).order_by(Restaurant.sort_order, Restaurant.created_at).all()


@router.post("", response_model=RestaurantOut, status_code=status.HTTP_201_CREATED)
def create_restaurant(payload: RestaurantCreate, db: Session = Depends(get_db)):
    r = Restaurant(**payload.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch("/{restaurant_id}", response_model=RestaurantOut)
def update_restaurant(restaurant_id: str, payload: RestaurantUpdate, db: Session = Depends(get_db)):
    r = db.get(Restaurant, restaurant_id)
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    clear_image = data.pop("clear_image", False)
    for k, v in data.items():
        setattr(r, k, v)
    if clear_image:
        r.image_url = None
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_restaurant(restaurant_id: str, db: Session = Depends(get_db)):
    r = db.get(Restaurant, restaurant_id)
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return None
