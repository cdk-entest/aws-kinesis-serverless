---
author: haimtran
title: kinesis serverless demo
description:
publishedDate: 17/07/2023
date: 17/07/2023
---

## Introduction

This [GitHub]() shows some basic serverless architecture with kinesis

- lambda and kinesis enhanced fan-out

> Configure the ParallelizationFactor setting to process one shard of a Kinesis or DynamoDB data stream with more than one Lambda invocation simultaneously. You can specify the number of concurrent batches that Lambda polls from a shard via a parallelization factor from 1 (default) to 10. For example, when you set ParallelizationFactor to 2, you can have 200 concurrent Lambda invocations at maximum to process 100 Kinesis data shards. This helps scale up the processing throughput when the data volume is volatile and the IteratorAge is high. Note that parallelization factor will not work if you are using Kinesis aggregation. For more information, see New AWS Lambda scaling controls for Kinesis and DynamoDB event sources. Also, see the Serverless Data Processing on AWS workshop for complete tutorials.


![Untitled Diagram drawio](https://github.com/cdk-entest/aws-kinesis-serverless/assets/20411077/69001712-9f0b-4160-a94d-604b6e536614)


## Lamda and Kinesis

create a role for lambda function

```ts
// role for lambda
const roleLambda = new aws_iam.Role(this, "RoleForLambdaConsumerKinesis", {
  roleName: "RoleForLambdaConsumerKinesis",
  assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
});

// attach an aws managed policy allow accessing cw logs
roleLambda.addManagedPolicy(
  aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
    "service-role/AWSLambdaBasicExecutionRole"
  )
);

// cloudwatch log policy accessing kinesis and ddb
roleLambda.attachInlinePolicy(
  new aws_iam.Policy(this, "ReadKinesisStream", {
    statements: [
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kinesis:*"],
        resources: ["*"],
      }),
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:*"],
        resources: ["*"],
      }),
    ],
  })
);
```

create a lambda function

```ts
const func = new aws_lambda.Function(this, "LambdaConsumerKinesisStream", {
  functionName: "LambdaConsumerKinesisStream",
  code: aws_lambda.Code.fromInline(
    fs.readFileSync(path.resolve(__dirname, "./../lambda/index.py"), {
      encoding: "utf-8",
    })
  ),
  handler: "index.handler",
  runtime: aws_lambda.Runtime.PYTHON_3_8,
  timeout: Duration.seconds(10),
  memorySize: 512,
  role: roleLambda,
  environment: {
    TABLE_NAME: props.tableName,
    STREAM_NAME: props.streamName,
  },
});
```

create a dynamod db table

```ts
// dynamodb table
const table = new aws_dynamodb.Table(this, "StockTable", {
  tableName: props.tableName,
  removalPolicy: RemovalPolicy.DESTROY,
  partitionKey: {
    name: "id",
    type: aws_dynamodb.AttributeType.STRING,
  },
  billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  stream: aws_dynamodb.StreamViewType.NEW_IMAGE,
});
```

create a kinesis data stream

```ts
const stream = new aws_kinesis.Stream(this, `${props.streamName}-demo`, {
  streamName: props.streamName,
  retentionPeriod: Duration.hours(24),
  shardCount: 4,
  streamMode: aws_kinesis.StreamMode.PROVISIONED,
});
```

register a consumer with kinesis enhanced fan-out

```ts
const consumer = new aws_kinesis.CfnStreamConsumer(
  this,
  "LambdaRegisterConsumer",
  {
    consumerName: "LambdaRegisterConsumer",
    streamArn: stream.streamArn,
  }
);
```

configure lambda envent source mapping to processing messages in kinesis data stream

```ts
const eventSource = new aws_lambda.EventSourceMapping(
  this,
  "LambdaEventSourceMappingKinesis",
  {
    target: func,
    eventSourceArn: consumer.attrConsumerArn,
    batchSize: 10,
    parallelizationFactor: 2,
    // maxConcurrency: 5,
    // maxRecordAge: Duration.minutes(30),
    startingPosition: aws_lambda.StartingPosition.LATEST,
    // tumblingWindow: Duration.minutes(1),
    enabled: true,
    retryAttempts: 1,
  }
);
```

## Lambda Handler

the handler receive event from kinesis then parse records and write to ddb

```py
# haimtran 03 DEC 2022
# receive event from kinesis data stream
# lambda write messages to dyanmdodb

import os
import datetime
import uuid
import json
import boto3

# create dynamodb client
ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])

def handler(event, context) -> json:
    """
    simple lambda function
    """
    # time stamp
    now = datetime.datetime.now()
    time_stamp = now.strftime("%Y/%m/%d %H:%M:%S.%f")

    # parse message from post request body
    records =[]
    try:
        records = event["Records"]
    except:
        print("error parsing message from post body")
    # write record to dynamodb
    for record in records:
      try:
          table.put_item(Item={"id": str(uuid.uuid4()), "message": str(record)})
      except:
          table.put_item(Item={"id": str(uuid.uuid4()), "message": "NULL"})

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET",
        },
        "body": json.dumps({"time": f"lambda {time_stamp}", "event": event}),
    }
```

## Simple Producer

let put some messages to the stream and see results in dynamod db

```ts
import datetime
import json
import random
import boto3
import time

STREAM_NAME = "sensor-input-stream"
REGION = "ap-southeast-1"


def get_random_data():
    current_temperature = round(10 + random.random() * 170, 2)
    if current_temperature > 160:
        status = "ERROR"
    elif current_temperature > 140 or random.randrange(1, 100) > 80:
        status = random.choice(["WARNING","ERROR"])
    else:
        status = "OK"
    return {
        'sensor_id': random.randrange(1, 100),
        'current_temperature': current_temperature,
        'status': status,
        'event_time': datetime.datetime.now().isoformat()
    }


def send_data(stream_name, kinesis_client):
    while True:
        data = get_random_data()
        partition_key = str(data["sensor_id"])
        print(data)
        kinesis_client.put_record(
            StreamName=stream_name,
            Data=json.dumps(data),
            PartitionKey=partition_key)
        #
        time.sleep(2)


if __name__ == '__main__':
    kinesis_client = boto3.client('kinesis', region_name=REGION)
    send_data(STREAM_NAME, kinesis_client)
```

## References

- [using lambda with amazon kinesis](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-configure)

- [lambda with kinesis efo](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-configure)

- [lambda and kinesis scaling](https://aws.amazon.com/blogs/compute/new-aws-lambda-scaling-controls-for-kinesis-and-dynamodb-event-sources/)

- [serverless workshop](https://data-processing.serverlessworkshops.io/)

- [amazon kinesis enhanced fan-out blog](https://medium.com/avmconsulting-blog/amazon-kinesis-enhanced-fan-out-4e500411a414)
