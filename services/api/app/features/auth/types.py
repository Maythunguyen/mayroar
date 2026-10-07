from dataclasses import dataclass, field


@dataclass(frozen=True)
class User:
    id: str
    token: str = field(repr=False)
