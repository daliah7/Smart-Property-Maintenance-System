from __future__ import annotations


class DomainError(Exception):
    pass


class InvalidStatusTransitionError(DomainError):
    pass


class BusinessRuleViolationError(DomainError):
    pass


class NotFoundError(DomainError):
    pass
