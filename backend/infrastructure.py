"""CloudFormation definition for isolated production and staging services."""
import json
from login_branding import branding


def ref(name):
    return {"Ref": name}


def sub(value):
    return {"Fn::Sub": value}


def arn(name):
    return {"Fn::GetAtt": [name, "Arn"]}


def resource(kind, properties, retain=False):
    value = {"Type": kind, "Properties": properties}
    if retain:
        value.update(DeletionPolicy="Retain", UpdateReplacePolicy="Retain")
    return value


def template(environment="production"):
    if environment not in ("production", "staging"):
        raise ValueError("Choose production or staging.")
    prefix = "ambit-" + environment
    login_domain = "ambit-${AWS::AccountId}" if environment == "production" else "ambit-staging-${AWS::AccountId}"
    parameters = {
        "ArtifactBucket": {"Type": "String"}, "ArtifactKey": {"Type": "String"},
        "Release": {"Type": "String"},
        "AdminEmail": {"Type": "String", "Default": "mario.d.gerardi@gmail.com"},
        "RateSalt": {"Type": "String", "NoEcho": True, "MinLength": 32},
        "DatadogSecretArn": {"Type": "String", "Default": ""},
        "DatadogSite": {"Type": "String", "Default": "datadoghq.com"},
    }
    trust = {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]}
    logging_policy = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    local_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    origins = ["https://playambit.com"] if environment == "production" else local_origins
    login_origins = origins + local_origins if environment == "production" else local_origins
    r = {}
    r["Feedback"] = resource("AWS::DynamoDB::Table", {
        "TableName": prefix + "-feedback", "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [{"AttributeName": key, "AttributeType": "S"} for key in ("pk", "queue", "createdAt")],
        "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}],
        "GlobalSecondaryIndexes": [{"IndexName": "feedback-by-date", "KeySchema": [{"AttributeName": "queue", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}],
        "TimeToLiveSpecification": {"AttributeName": "expiresAt", "Enabled": True},
        "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": True},
        "SSESpecification": {"SSEEnabled": True},
    }, retain=True)
    r["Saves"] = resource("AWS::DynamoDB::Table", {
        "TableName": prefix + "-saves", "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [{"AttributeName": key, "AttributeType": "S"} for key in ("pk", "sk")],
        "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
        "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": True},
        "SSESpecification": {"SSEEnabled": True},
    }, retain=True)
    r["Community"] = resource("AWS::DynamoDB::Table", {
        "TableName": prefix + "-community", "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [{"AttributeName": k, "AttributeType": "S"} for k in ("pk", "sk")],
        "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
        "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": True},
        "SSESpecification": {"SSEEnabled": True},
    }, retain=True)
    r["ConfirmationRole"] = resource("AWS::IAM::Role", {"AssumeRolePolicyDocument": trust, "ManagedPolicyArns": [logging_policy]})
    code = {"S3Bucket": ref("ArtifactBucket"), "S3Key": ref("ArtifactKey")}
    r["Confirmation"] = resource("AWS::Lambda::Function", {
        "FunctionName": prefix + "-account-confirmation", "Runtime": "python3.13", "Handler": "confirmation.handler",
        "Role": arn("ConfirmationRole"), "Code": code, "Timeout": 5, "MemorySize": 128,
        "Environment": {"Variables": {"ADMIN_EMAIL": ref("AdminEmail")}},
        "Tags": [{"Key": "project", "Value": "ambit"}, {"Key": "environment", "Value": environment}],
    })
    r["Users"] = resource("AWS::Cognito::UserPool", {
        "UserPoolName": prefix + "-users", "UserPoolTier": "ESSENTIALS",
        "UsernameAttributes": ["email"], "UsernameConfiguration": {"CaseSensitive": False},
        "AutoVerifiedAttributes": ["email"], "MfaConfiguration": "OFF", "DeletionProtection": "ACTIVE",
        "Schema": [{"Name": "email", "AttributeDataType": "String", "Required": True, "Mutable": False}],
        "AccountRecoverySetting": {"RecoveryMechanisms": [{"Name": "verified_email", "Priority": 1}]},
        "Policies": {"PasswordPolicy": {"MinimumLength": 12, "RequireUppercase": True, "RequireLowercase": True, "RequireNumbers": True, "RequireSymbols": False, "TemporaryPasswordValidityDays": 7}},
        "EmailConfiguration": {"EmailSendingAccount": "COGNITO_DEFAULT"},
        "LambdaConfig": {"PostConfirmation": arn("Confirmation")},
        "UserPoolTags": {"project": "ambit", "environment": environment},
    }, retain=True)
    r["ConfirmationPolicy"] = resource("AWS::IAM::Policy", {
        "PolicyName": "AmbitOwnerRole", "Roles": [ref("ConfirmationRole")],
        "PolicyDocument": {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "cognito-idp:AdminAddUserToGroup", "Resource": arn("Users")}]},
    })
    r["ConfirmationPermission"] = resource("AWS::Lambda::Permission", {
        "Action": "lambda:InvokeFunction", "FunctionName": ref("Confirmation"), "Principal": "cognito-idp.amazonaws.com", "SourceArn": arn("Users"), "SourceAccount": ref("AWS::AccountId"),
    })
    r["AdminGroup"] = resource("AWS::Cognito::UserPoolGroup", {"UserPoolId": ref("Users"), "GroupName": "admin", "Description": "Ambit's verified owner only"})
    r["Client"] = resource("AWS::Cognito::UserPoolClient", {
        "ClientName": "ambit-web", "UserPoolId": ref("Users"), "GenerateSecret": False,
        "AllowedOAuthFlowsUserPoolClient": True, "AllowedOAuthFlows": ["code"], "AllowedOAuthScopes": ["openid", "email"], "SupportedIdentityProviders": ["COGNITO"],
        "CallbackURLs": [origin + "/auth/callback" for origin in login_origins], "LogoutURLs": [origin + "/" for origin in login_origins],
        "PreventUserExistenceErrors": "ENABLED", "EnableTokenRevocation": True,
        "AccessTokenValidity": 60, "IdTokenValidity": 60, "RefreshTokenValidity": 30,
        "TokenValidityUnits": {"AccessToken": "minutes", "IdToken": "minutes", "RefreshToken": "days"},
        "ExplicitAuthFlows": ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
        "ReadAttributes": ["email", "email_verified"],
    })
    r["LoginBranding"] = resource("AWS::Cognito::ManagedLoginBranding", {"UserPoolId": ref("Users"), "ClientId": ref("Client"), **branding()})
    r["LoginDomain"] = resource("AWS::Cognito::UserPoolDomain", {"Domain": sub(login_domain), "UserPoolId": ref("Users"), "ManagedLoginVersion": 2})
    # Publish the branded pages before switching away from classic login.
    r["LoginDomain"]["DependsOn"] = "LoginBranding"
    r["ApiRole"] = resource("AWS::IAM::Role", {
        "AssumeRolePolicyDocument": trust, "ManagedPolicyArns": [logging_policy],
        "Policies": [{"PolicyName": "FeedbackData", "PolicyDocument": {"Version": "2012-10-17", "Statement": [
            {"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"], "Resource": [arn("Feedback"), sub("${Feedback.Arn}/index/feedback-by-date")]},
            {"Effect": "Allow", "Action": ["dynamodb:PutItem", "dynamodb:Query"], "Resource": arn("Saves")},
            {"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:BatchGetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:ConditionCheckItem"], "Resource": arn("Community")},
            {"Fn::If": ["UseDatadog", {"Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": ref("DatadogSecretArn")}, ref("AWS::NoValue")]},
        ]}}],
    })
    env = {"COMMUNITY_TABLE": ref("Community"), "SAVES_TABLE": ref("Saves"), "FEEDBACK_TABLE": ref("Feedback"), "RATE_SALT": ref("RateSalt"), "ALLOWED_ORIGINS": ",".join(origins), "RELEASE": ref("Release"),
           "APP_ENV": environment, "DD_ENV": environment, "DD_SERVICE": "ambit-api", "DD_VERSION": ref("Release"), "DD_SITE": ref("DatadogSite"),
           "DD_API_KEY_SECRET_ARN": ref("DatadogSecretArn"), "DD_LAMBDA_HANDLER": "handler.handler", "DD_TRACE_ENABLED": "true", "DD_LOGS_INJECTION": "true", "DD_SERVERLESS_LOGS_ENABLED": "true", "DD_CAPTURE_LAMBDA_PAYLOAD": "false", "DD_AWS_TAG_NO_PARAMS": "true", "DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING": "", "DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING": ""}
    r["ApiFunction"] = resource("AWS::Lambda::Function", {
        "FunctionName": prefix + "-feedback", "Runtime": "python3.13",
        "Handler": {"Fn::If": ["UseDatadog", "datadog_lambda.handler.handler", "handler.handler"]},
        "Role": arn("ApiRole"), "Code": code, "Timeout": 15, "MemorySize": 1024, "ReservedConcurrentExecutions": 5,
        "Environment": {"Variables": env},
        "Layers": {"Fn::If": ["UseDatadog", [sub("arn:aws:lambda:${AWS::Region}:464622532012:layer:Datadog-Python313:127"), sub("arn:aws:lambda:${AWS::Region}:464622532012:layer:Datadog-Extension:99")], ref("AWS::NoValue")]},
        "Tags": [{"Key": "project", "Value": "ambit"}, {"Key": "environment", "Value": environment}, {"Key": "service", "Value": "ambit-api"}],
    })
    r["Api"] = resource("AWS::ApiGatewayV2::Api", {"Name": prefix, "ProtocolType": "HTTP", "CorsConfiguration": {"AllowOrigins": origins, "AllowMethods": ["POST", "GET", "PATCH", "OPTIONS"], "AllowHeaders": ["content-type", "authorization", "x-datadog-origin", "x-datadog-parent-id", "x-datadog-trace-id", "x-datadog-sampling-priority", "traceparent", "tracestate", "baggage", "x-datadog-tags"], "MaxAge": 3600}})
    r["Integration"] = resource("AWS::ApiGatewayV2::Integration", {"ApiId": ref("Api"), "IntegrationType": "AWS_PROXY", "IntegrationUri": arn("ApiFunction"), "PayloadFormatVersion": "2.0", "TimeoutInMillis": 15000})
    r["Authorizer"] = resource("AWS::ApiGatewayV2::Authorizer", {"ApiId": ref("Api"), "Name": "accounts", "AuthorizerType": "JWT", "IdentitySource": ["$request.header.Authorization"], "JwtConfiguration": {"Audience": [ref("Client")], "Issuer": sub("https://cognito-idp.${AWS::Region}.amazonaws.com/${Users}")}})
    community_routes = [(name, route, True) for name, route in [
        ("ReadProfile", "GET /account/profile"), ("WriteProfile", "PATCH /account/profile"),
        ("HandleAvailability", "GET /account/handles/{handle}"), ("FriendActivity", "GET /account/friends/activity"), ("FriendProfile", "GET /account/friends/{id}/profile"),
        ("FindPlayer", "GET /account/players/{handle}"), ("ReadFriends", "GET /account/friends"),
        ("RequestFriend", "POST /account/friends"), ("UpdateFriend", "PATCH /account/friends/{id}"),
        ("FriendJourneys", "GET /account/friends/{id}/journeys"),
        ("ReadChallenges", "GET /account/challenges"), ("CreateChallenge", "POST /account/challenges"),
        ("UpdateChallenge", "PATCH /account/challenges/{id}"),
    ]]
    for name, route, authenticated in community_routes + [("ReadJourneySchedule", "GET /journeys/schedule", False), ("WriteJourneySchedule", "PATCH /admin/journeys/schedule", True), ("ReadSaves", "GET /account/saves", True), ("WriteSaves", "POST /account/saves", True), ("Submit", "POST /feedback", False), ("AccountSubmit", "POST /account/feedback", True), ("Review", "GET /admin/feedback", True), ("Update", "PATCH /admin/feedback/{id}", True)]:
        properties = {"ApiId": ref("Api"), "RouteKey": route, "Target": sub("integrations/${Integration}"), "AuthorizationType": "JWT" if authenticated else "NONE"}
        if authenticated:
            properties.update(AuthorizerId=ref("Authorizer"), AuthorizationScopes=["openid"])
        r[name + "Route"] = resource("AWS::ApiGatewayV2::Route", properties)
    r["AccessLogs"] = resource("AWS::Logs::LogGroup", {"LogGroupName": "/aws/apigateway/" + prefix, "RetentionInDays": 30})
    for name, function in [("ApiLogs", prefix + "-feedback"), ("ConfirmationLogs", prefix + "-account-confirmation")]:
        r[name] = resource("AWS::Logs::LogGroup", {"LogGroupName": "/aws/lambda/" + function, "RetentionInDays": 30})
    r["Stage"] = resource("AWS::ApiGatewayV2::Stage", {"ApiId": ref("Api"), "StageName": "$default", "AutoDeploy": True, "DefaultRouteSettings": {"ThrottlingBurstLimit": 10, "ThrottlingRateLimit": 2}, "AccessLogSettings": {"DestinationArn": arn("AccessLogs"), "Format": json.dumps({"request_id": "$context.requestId", "route": "$context.routeKey", "status": "$context.status", "duration_ms": "$context.responseLatency", "integration_status": "$context.integration.status"})}})
    r["ApiPermission"] = resource("AWS::Lambda::Permission", {"Action": "lambda:InvokeFunction", "FunctionName": ref("ApiFunction"), "Principal": "apigateway.amazonaws.com", "SourceArn": sub("arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*")})
    return {"AWSTemplateFormatVersion": "2010-09-09", "Description": "Ambit " + environment + " accounts, private feedback review, and optional Datadog tracing", "Parameters": parameters, "Conditions": {"UseDatadog": {"Fn::Not": [{"Fn::Equals": [ref("DatadogSecretArn"), ""]}]}}, "Resources": r, "Outputs": {
        "ApiUrl": {"Value": sub("https://${Api}.execute-api.${AWS::Region}.amazonaws.com")},
        "UserPoolId": {"Value": ref("Users")}, "ClientId": {"Value": ref("Client")},
        "Authority": {"Value": sub("https://cognito-idp.${AWS::Region}.amazonaws.com/${Users}")},
        "LoginUrl": {"Value": sub("https://" + login_domain + ".auth.${AWS::Region}.amazoncognito.com")},
    }}


if __name__ == "__main__":
    print(json.dumps(template(), indent=2))
