"""Only the configured, verified owner may receive the admin group."""
import os
import boto3


def handler(event, _context):
    attributes = event.get("request", {}).get("userAttributes", {})
    if (event.get("triggerSource") == "PostConfirmation_ConfirmSignUp"
            and attributes.get("email", "").lower() == os.environ["ADMIN_EMAIL"].lower()
            and str(attributes.get("email_verified", "")).lower() == "true"):
        boto3.client("cognito-idp").admin_add_user_to_group(
            UserPoolId=event["userPoolId"], Username=event["userName"], GroupName="admin")
    return event
