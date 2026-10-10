"""CloudFormation definition for Ambit's production account and feedback services."""
import json


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


def template():
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
    origins = ["https://playambit.com", "http://localhost:5173", "http://127.0.0.1:5173"]
    r = {}
    r["Feedback"] = resource("AWS::DynamoDB::Table", {
        "TableName": "ambit-production-feedback", "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [{"AttributeName": key, "AttributeType": "S"} for key in ("pk", "queue", "createdAt")],
        "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}],
        "GlobalSecondaryIndexes": [{"IndexName": "feedback-by-date", "KeySchema": [{"AttributeName": "queue", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}],
        "TimeToLiveSpecification": {"AttributeName": "expiresAt", "Enabled": True},
        "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": True},
        "SSESpecification": {"SSEEnabled": True},
    }, retain=True)
    r["ConfirmationRole"] = resource("AWS::IAM::Role", {"AssumeRolePolicyDocument": trust, "ManagedPolicyArns": [logging_policy]})
    code = {"S3Bucket": ref("ArtifactBucket"), "S3Key": ref("ArtifactKey")}
    r["Confirmation"] = resource("AWS::Lambda::Function", {
        "FunctionName": "ambit-production-account-confirmation", "Runtime": "python3.13", "Handler": "confirmation.handler",
        "Role": arn("ConfirmationRole"), "Code": code, "Timeout": 5, "MemorySize": 128,
        "Environment": {"Variables": {"ADMIN_EMAIL": ref("AdminEmail")}},
        "Tags": [{"Key": "project", "Value": "ambit"}, {"Key": "environment", "Value": "production"}],
    })
    r["Users"] = resource("AWS::Cognito::UserPool", {
        "UserPoolName": "ambit-production-users", "UserPoolTier": "LITE",
        "UsernameAttributes": ["email"], "UsernameConfiguration": {"CaseSensitive": False},
        "AutoVerifiedAttributes": ["email"], "MfaConfiguration": "OFF", "DeletionProtection": "ACTIVE",
        "Schema": [{"Name": "email", "AttributeDataType": "String", "Required": True, "Mutable": False}],
        "AccountRecoverySetting": {"RecoveryMechanisms": [{"Name": "verified_email", "Priority": 1}]},
        "Policies": {"PasswordPolicy": {"MinimumLength": 12, "RequireUppercase": True, "RequireLowercase": True, "RequireNumbers": True, "RequireSymbols": False, "TemporaryPasswordValidityDays": 7}},
        "EmailConfiguration": {"EmailSendingAccount": "COGNITO_DEFAULT"},
        "LambdaConfig": {"PostConfirmation": arn("Confirmation")},
        "UserPoolTags": {"project": "ambit", "environment": "production"},
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
        "CallbackURLs": [origin + "/auth/callback" for origin in origins], "LogoutURLs": [origin + "/" for origin in origins],
        "PreventUserExistenceErrors": "ENABLED", "EnableTokenRevocation": True,
        "AccessTokenValidity": 60, "IdTokenValidity": 60, "RefreshTokenValidity": 30,
        "TokenValidityUnits": {"AccessToken": "minutes", "IdToken": "minutes", "RefreshToken": "days"},
        "ExplicitAuthFlows": ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
        "ReadAttributes": ["email", "email_verified"],
    })
    r["LoginDomain"] = resource("AWS::Cognito::UserPoolDomain", {"Domain": sub("ambit-${AWS::AccountId}"), "UserPoolId": ref("Users"), "ManagedLoginVersion": 1})
    r["ApiRole"] = resource("AWS::IAM::Role", {
        "AssumeRolePolicyDocument": trust, "ManagedPolicyArns": [logging_policy],
        "Policies": [{"PolicyName": "FeedbackData", "PolicyDocument": {"Version": "2012-10-17", "Statement": [
            {"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"], "Resource": [arn("Feedback"), sub("${Feedback.Arn}/index/feedback-by-date")]},
            {"Fn::If": ["UseDatadog", {"Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": ref("DatadogSecretArn")}, ref("AWS::NoValue")]},
        ]}}],
    })
    env = {"FEEDBACK_TABLE": ref("Feedback"), "RATE_SALT": ref("RateSalt"), "ALLOWED_ORIGINS": ",".join(origins), "RELEASE": ref("Release"),
           "DD_ENV": "production", "DD_SERVICE": "ambit-api", "DD_VERSION": ref("Release"), "DD_SITE": ref("DatadogSite"),
           "DD_API_KEY_SECRET_ARN": ref("DatadogSecretArn"), "DD_LAMBDA_HANDLER": "handler.handler", "DD_TRACE_ENABLED": "true", "DD_LOGS_INJECTION": "true", "DD_SERVERLESS_LOGS_ENABLED": "true", "DD_CAPTURE_LAMBDA_PAYLOAD": "false"}
    r["ApiFunction"] = resource("AWS::Lambda::Function", {
        "FunctionName": "ambit-production-feedback", "Runtime": "python3.13",
        "Handler": {"Fn::If": ["UseDatadog", "datadog_lambda.handler.handler", "handler.handler"]},
        "Role": arn("ApiRole"), "Code": code, "Timeout": 15, "MemorySize": 256, "ReservedConcurrentExecutions": 5,
        "Environment": {"Variables": env},
        "Layers": {"Fn::If": ["UseDatadog", [sub("arn:aws:lambda:${AWS::Region}:464622532012:layer:Datadog-Python313:127"), sub("arn:aws:lambda:${AWS::Region}:464622532012:layer:Datadog-Extension:99")], ref("AWS::NoValue")]},
        "Tags": [{"Key": "project", "Value": "ambit"}, {"Key": "environment", "Value": "production"}, {"Key": "service", "Value": "ambit-api"}],
    })
    r["Api"] = resource("AWS::ApiGatewayV2::Api", {"Name": "ambit-production", "ProtocolType": "HTTP", "CorsConfiguration": {"AllowOrigins": origins, "AllowMethods": ["POST", "GET", "PATCH", "OPTIONS"], "AllowHeaders": ["content-type", "authorization", "x-datadog-origin", "x-datadog-parent-id", "x-datadog-trace-id", "x-datadog-sampling-priority", "traceparent", "tracestate"], "MaxAge": 3600}})
    r["Integration"] = resource("AWS::ApiGatewayV2::Integration", {"ApiId": ref("Api"), "IntegrationType": "AWS_PROXY", "IntegrationUri": arn("ApiFunction"), "PayloadFormatVersion": "2.0", "TimeoutInMillis": 15000})
    r["Authorizer"] = resource("AWS::ApiGatewayV2::Authorizer", {"ApiId": ref("Api"), "Name": "accounts", "AuthorizerType": "JWT", "IdentitySource": ["$request.header.Authorization"], "JwtConfiguration": {"Audience": [ref("Client")], "Issuer": sub("https://cognito-idp.${AWS::Region}.amazonaws.com/${Users}")}})
    for name, route, authenticated in [("Submit", "POST /feedback", False), ("AccountSubmit", "POST /account/feedback", True), ("Review", "GET /admin/feedback", True), ("Update", "PATCH /admin/feedback/{id}", True)]:
        properties = {"ApiId": ref("Api"), "RouteKey": route, "Target": sub("integrations/${Integration}"), "AuthorizationType": "JWT" if authenticated else "NONE"}
        if authenticated:
            properties.update(AuthorizerId=ref("Authorizer"), AuthorizationScopes=["openid"])
        r[name + "Route"] = resource("AWS::ApiGatewayV2::Route", properties)
    r["AccessLogs"] = resource("AWS::Logs::LogGroup", {"LogGroupName": "/aws/apigateway/ambit-production", "RetentionInDays": 30})
    for name, function in [("ApiLogs", "ambit-production-feedback"), ("ConfirmationLogs", "ambit-production-account-confirmation")]:
        r[name] = resource("AWS::Logs::LogGroup", {"LogGroupName": "/aws/lambda/" + function, "RetentionInDays": 30})
    r["Stage"] = resource("AWS::ApiGatewayV2::Stage", {"ApiId": ref("Api"), "StageName": "$default", "AutoDeploy": True, "DefaultRouteSettings": {"ThrottlingBurstLimit": 10, "ThrottlingRateLimit": 2}, "AccessLogSettings": {"DestinationArn": arn("AccessLogs"), "Format": json.dumps({"request_id": "$context.requestId", "route": "$context.routeKey", "status": "$context.status", "duration_ms": "$context.responseLatency", "integration_status": "$context.integration.status"})}})
    r["ApiPermission"] = resource("AWS::Lambda::Permission", {"Action": "lambda:InvokeFunction", "FunctionName": ref("ApiFunction"), "Principal": "apigateway.amazonaws.com", "SourceArn": sub("arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*")})
    return {"AWSTemplateFormatVersion": "2010-09-09", "Description": "Ambit production accounts, private feedback review, and optional Datadog tracing", "Parameters": parameters, "Conditions": {"UseDatadog": {"Fn::Not": [{"Fn::Equals": [ref("DatadogSecretArn"), ""]}]}}, "Resources": r, "Outputs": {
        "ApiUrl": {"Value": sub("https://${Api}.execute-api.${AWS::Region}.amazonaws.com")},
        "UserPoolId": {"Value": ref("Users")}, "ClientId": {"Value": ref("Client")},
        "Authority": {"Value": sub("https://cognito-idp.${AWS::Region}.amazonaws.com/${Users}")},
        "LoginUrl": {"Value": sub("https://ambit-${AWS::AccountId}.auth.${AWS::Region}.amazoncognito.com")},
    }}


if __name__ == "__main__":
    print(json.dumps(template(), indent=2))
