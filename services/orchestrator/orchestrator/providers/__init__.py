from .base import Provider, ProviderError, Submission, VendorStatus
from .fal import FalProvider

__all__ = ["Provider", "ProviderError", "Submission", "VendorStatus", "FalProvider", "make_provider"]


def make_provider(name: str, client=None) -> Provider:
    if name == "fal":
        return FalProvider(client)
    raise ProviderError(f"no adapter for provider '{name}'", retryable=False)
