import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_client = None

BLOCKLIST_PREFIX = "auth:blacklist:"


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _client


def blacklist_token(jti: str, ttl_seconds: int) -> None:
    try:
        _get_client().setex(f"{BLOCKLIST_PREFIX}{jti}", ttl_seconds, "revoked")
    except redis.RedisError:
        logger.warning("redis unavailable during blacklist; token not revoked")


def is_token_blacklisted(jti: str) -> bool:
    try:
        return bool(_get_client().exists(f"{BLOCKLIST_PREFIX}{jti}"))
    except redis.RedisError:
        logger.warning("redis unavailable during check; assuming token is valid")
        return False