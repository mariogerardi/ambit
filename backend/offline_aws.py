"""Shared offline AWS boundary for backend tests; never shipped to Lambda."""
import sys
import types
from unittest.mock import MagicMock


class ClientError(Exception):
    def __init__(self, response, operation="test"):
        self.response = response
        super().__init__(operation)


# Lambda supplies boto3. Tests replace only the external AWS boundary.
sys.modules["boto3"] = MagicMock()
sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
sys.modules["boto3.dynamodb.types"] = MagicMock()
sys.modules["botocore.config"] = MagicMock()
exceptions = types.ModuleType("botocore.exceptions")
exceptions.ClientError = ClientError
sys.modules["botocore"] = types.ModuleType("botocore")
sys.modules["botocore.exceptions"] = exceptions
