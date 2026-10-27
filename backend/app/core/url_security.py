import ipaddress
import socket
from urllib.parse import urlsplit


class UnsafeTargetError(ValueError):
    """Raised when a monitored URL could target a non-public network."""


def validate_public_http_url(url: str) -> None:
    """Reject URLs that target local, private, reserved, or otherwise non-public IPs.

    DNS is resolved immediately before each outbound request. Redirects are disabled
    by the monitoring client so a checked endpoint cannot redirect the worker to an
    internal address.
    """
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"}:
            raise UnsafeTargetError("Only http and https URLs can be monitored.")
        if not parsed.hostname:
            raise UnsafeTargetError("URL must include a hostname.")
        if parsed.username or parsed.password:
            raise UnsafeTargetError("URLs containing credentials are not allowed.")
        host = parsed.hostname.rstrip(".")
        if host.lower() in {"localhost", "localhost.localdomain"} or host.lower().endswith(".localhost"):
            raise UnsafeTargetError("Localhost targets are not allowed.")

        try:
            literal_ip = ipaddress.ip_address(host)
        except ValueError:
            literal_ip = None

        if literal_ip is not None:
            addresses = [literal_ip]
        else:
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            try:
                records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            except (socket.gaierror, OSError) as exc:
                raise UnsafeTargetError("The target hostname could not be resolved.") from exc
            addresses = [ipaddress.ip_address(record[4][0]) for record in records]

        if not addresses:
            raise UnsafeTargetError("The target hostname did not resolve to an IP address.")
        if any(not address.is_global for address in addresses):
            raise UnsafeTargetError("Targets resolving to non-public IP addresses are not allowed.")
    except (ValueError, UnicodeError) as exc:
        if isinstance(exc, UnsafeTargetError):
            raise
        raise UnsafeTargetError("Invalid HTTP URL.") from exc
