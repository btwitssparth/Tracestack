"""Generate a VAPID key pair for TraceStack Web Push.

Run with: python scripts/generate_vapid_keys.py
Keep the private key secret and store it only in your backend environment.
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii")
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_key = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode("ascii")
    print("VAPID_PUBLIC_KEY=" + public_key)
    print("VAPID_PRIVATE_KEY_PEM_BEGIN")
    print(private_pem, end="")
    print("VAPID_PRIVATE_KEY_PEM_END")
    print("Set VAPID_CLAIMS_SUBJECT to a contact URI, e.g. mailto:admin@example.com.")


if __name__ == "__main__":
    main()
