from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,30}$")
ACCESS_KEY_PATTERN = re.compile(r"^SC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")


def normalize_username(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


class DemoUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=USERNAME_PATTERN.pattern)
    display_name: str = Field(min_length=2, max_length=80)
    class_level: Literal["class_10"]
    curriculum: Literal["nctb_bangla"]
    preferred_subject: Literal["mathematics"]
    school_name: str | None = Field(default=None, max_length=120)

    model_config = ConfigDict(extra="forbid")

    @field_validator("username", mode="before")
    @classmethod
    def clean_username(cls, value: object) -> object:
        return normalize_username(value)

    @field_validator("display_name", mode="before")
    @classmethod
    def clean_display_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("school_name", mode="before")
    @classmethod
    def clean_school_name(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        cleaned = value.strip()
        return cleaned or None


class DemoSessionVerify(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    access_key: str = Field(min_length=12, max_length=20, pattern=ACCESS_KEY_PATTERN.pattern)

    model_config = ConfigDict(extra="forbid")

    @field_validator("username", mode="before")
    @classmethod
    def clean_username(cls, value: object) -> object:
        return normalize_username(value)

    @field_validator("access_key", mode="before")
    @classmethod
    def clean_access_key(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value


class DemoUserPublic(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    class_level: str
    curriculum: str
    preferred_subject: str
    school_name: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DemoUserCreated(BaseModel):
    user: DemoUserPublic
    access_key: str

