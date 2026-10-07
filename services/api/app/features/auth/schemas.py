from pydantic import ConfigDict, Field
from ...core.schema import Model

class Credentials(Model):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class Signup(Credentials):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=8, max_length=1024)


class Refresh(Model):
    refresh_token: str = Field(min_length=1, max_length=4096)
