from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class BodyFatRequest(BaseModel):
    gender: Gender = Field(..., description="Gender: male or female")
    age: int = Field(..., ge=1, le=120, description="Age in years")
    height: float = Field(..., gt=0, description="Height in centimeters")
    weight: float = Field(..., gt=0, description="Weight in kilograms")
    waist: Optional[float] = Field(None, gt=0, description="Waist circumference in centimeters (optional)")

    @field_validator("height", "weight")
    @classmethod
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError("Value must be positive")
        return v

    @field_validator("waist")
    @classmethod
    def validate_waist(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Waist circumference must be positive if provided")
        return v


class BodyFatResponse(BaseModel):
    body_fat_percent: float = Field(..., ge=0, le=100, description="Estimated body fat percentage")
    comment: str = Field(..., description="Brief comment about the result")
    evaluation: Optional[str] = Field(None, description="Evaluation: низкий/нормальный/высокий etc")


class AdviceRequest(BaseModel):
    body_fat_percent: float = Field(..., ge=0, le=100, description="Body fat percentage")
    gender: Gender = Field(..., description="Gender: male or female")
    age: int = Field(..., ge=1, le=120, description="Age in years")
    evaluation: str = Field(..., description="Evaluation of body fat level")


class AdviceResponse(BaseModel):
    title: str = Field(..., description="Title of the advice")
    sections: list[dict] = Field(..., description="List of advice sections with title and content. Nutrition section can include 'macros' field with calories, protein, carbs, fats")
    time_estimate: Optional[list[dict] | str] = Field(None, description="Time estimate - array of {percent, months} or text string")


