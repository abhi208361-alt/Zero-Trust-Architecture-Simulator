from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    theme: str = "system"
    timezone: str = "UTC"
    notification_preferences: str = "{}"


class UserUpdateRequest(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    theme: str | None = Field(default=None, pattern="^(light|dark|system|ocean)$")
    timezone: str | None = Field(default=None, max_length=64)
    notification_preferences: dict[str, bool] | None = None


class UserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole | None = None