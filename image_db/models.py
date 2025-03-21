from pydantic import BaseModel, Field, validator
from typing import Any, Dict, TypeVar, Generic, List, Optional
import re

# Define a generic type for the data field
T = TypeVar('T')

class ServerResponse(BaseModel, Generic[T]):
    success: bool
    data: T
    error: Optional[str] = None
    timestamp: str

class PostalAddress(BaseModel):
    street: Optional[str] = None
    sub_locality: Optional[str] = None
    city: Optional[str] = None
    sub_administrative_area: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    iso_country_code: Optional[str] = None

class ContactData(BaseModel):
    email_addresses: List[str] = Field(default_factory=list)
    phone_numbers: List[str] = Field(default_factory=list)
    url_addresses: List[str] = Field(default_factory=list)
    postal_addresses: List[PostalAddress] = Field(default_factory=list)

class ContactInfo(BaseModel):
    name: Dict[str, Optional[str]]
    work: Dict[str, Optional[str]]
    contact: ContactData
    social: List[Dict[str, str]]
    notes: Optional[str] = None

class SocialProfile(BaseModel):
    service: str
    url: Optional[str] = None
    username: str

class DbPath(BaseModel):
    db_path: str
    
    @validator('db_path')
    def validate_path(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Database path cannot be empty')
        return v.strip()

class ImageUpdate(BaseModel):
    name_prefix: Optional[str] = None
    given_name: Optional[str] = None
    middle_name: Optional[str] = None
    family_name: Optional[str] = None
    name_suffix: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    organization_name: Optional[str] = None
    phone_numbers: Optional[List[str]] = None
    email_addresses: Optional[List[str]] = None
    url_addresses: Optional[List[str]] = None
    postal_addresses: Optional[List[Dict[str, Optional[str]]]] = None
    social_profiles: Optional[List[Dict[str, str]]] = None
    
    @validator('email_addresses', each_item=True)
    def validate_email(cls, v):
        if v and not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError(f'Invalid email address: {v}')
        return v
    
class VersionCreate(BaseModel):
    tag: str
    source_version_id: Optional[int] = None
    notes: Optional[str] = None
    create_blank: bool = False

class VersionUpdate(BaseModel):
    tag: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
