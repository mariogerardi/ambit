"""Exercise the native-value adapter at the shared SDK boundary, without AWS."""
import unittest
from unittest.mock import MagicMock, patch
from offline_aws import ClientError
import dynamodb


class DynamoTests(unittest.TestCase):
    def test_attributes_and_pagination_cross_the_sdk_boundary_without_changing_expressions(self):
        client = MagicMock()
        client.query.return_value = {"Items": [{"clock": {"native": 7}}], "LastEvaluatedKey": {"pk": {"native": "user#a"}}}
        with patch.object(dynamodb, "client", client), patch.object(dynamodb.serializer, "serialize", side_effect=lambda v: {"native": v}), patch.object(dynamodb.deserializer, "deserialize", side_effect=lambda v: v["native"]):
            options = {"ExpressionAttributeValues": {":owner": "user#a"}, "ExpressionAttributeNames": {"#clock": "clock"}, "KeyConditionExpression": "pk = :owner", "ExclusiveStartKey": {"pk": "user#a"}}
            result = dynamodb.Table("saves").query(**options)
            self.assertEqual(result, {"Items": [{"clock": 7}], "LastEvaluatedKey": {"pk": "user#a"}})
            self.assertEqual(client.query.call_args.kwargs["ExpressionAttributeValues"], {":owner": {"native": "user#a"}})
            self.assertEqual(client.query.call_args.kwargs["ExpressionAttributeNames"], {"#clock": "clock"})
            self.assertEqual(options["ExclusiveStartKey"], {"pk": "user#a"})
            dynamodb.Table("community").get_item(Key={"pk": "user#a"})
            self.assertEqual(client.get_item.call_args.kwargs["TableName"], "community")
            dynamodb.Table("feedback").put_item(Item={"id": "report", "ttl": 10})
            self.assertEqual(client.put_item.call_args.kwargs["Item"]["ttl"], {"native": 10})

    def test_conditional_errors_are_preserved_for_idempotent_save_retries(self):
        client = MagicMock()
        error = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}})
        client.put_item.side_effect = error
        with patch.object(dynamodb, "client", client), self.assertRaises(ClientError) as raised:
            dynamodb.Table("saves").put_item(Item={"clock": 7})
        self.assertIs(raised.exception, error)
