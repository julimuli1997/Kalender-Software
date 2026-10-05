from typing import Literal

ADMIN = "admin"
EMPLOYEE = "mitarbeiter"

# Keep in sync with the constants above; Literal needs the plain strings.
Role = Literal["admin", "mitarbeiter"]
