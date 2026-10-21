"""One pooled, thread-safe low-level client per Lambda execution environment.

Keep the handlers' native-value interface without sharing boto3 Resources across
friend workers. Only attribute maps are serialized; expressions remain untouched.
"""
import boto3
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from botocore.config import Config

client = boto3.client("dynamodb", config=Config(tcp_keepalive=True, max_pool_connections=8))
serializer, deserializer = TypeSerializer(), TypeDeserializer()


def encode(values):
    return {key: serializer.serialize(value) for key, value in values.items()}


def decode(values):
    return {key: deserializer.deserialize(value) for key, value in values.items()}


class Table:
    def __init__(self, name):
        self.name = name

    def call(self, operation, **options):
        for field in ("Key", "Item", "ExpressionAttributeValues", "ExclusiveStartKey"):
            if field in options:
                options[field] = encode(options[field])
        result = getattr(client, operation)(TableName=self.name, **options)
        for field in ("Item", "Attributes", "LastEvaluatedKey"):
            if field in result:
                result[field] = decode(result[field])
        if "Items" in result:
            result["Items"] = [decode(item) for item in result["Items"]]
        return result

    def get_item(self, **options):
        return self.call("get_item", **options)

    def get_many(self, keys):
        result = client.batch_get_item(RequestItems={self.name: {"Keys": [encode(key) for key in keys], "ConsistentRead": True}})
        return {"Items": [decode(item) for item in result.get("Responses", {}).get(self.name, [])], "unprocessed": bool(result.get("UnprocessedKeys", {}).get(self.name, {}).get("Keys"))}

    def query(self, **options):
        return self.call("query", **options)

    def put_item(self, **options):
        return self.call("put_item", **options)

    def update_item(self, **options):
        return self.call("update_item", **options)

    def delete_item(self, **options):
        return self.call("delete_item", **options)
