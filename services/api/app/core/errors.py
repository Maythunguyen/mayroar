class ServiceError(Exception):
    """Safe application error; translated to HTTP only at the boundary."""
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
