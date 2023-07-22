import {
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_dynamodb,
  aws_iam,
  aws_kinesis,
  aws_lambda,
  aws_lambda_event_sources,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";
import * as fs from "fs";

interface KinesisLambdaProps extends StackProps {
  streamName: string;
  tableName: string;
}

export class KinesisLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: KinesisLambdaProps) {
    super(scope, id, props);

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

    // create consumer lambda
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

    // kinesis data stream
    const stream = new aws_kinesis.Stream(this, `${props.streamName}-demo`, {
      streamName: props.streamName,
      retentionPeriod: Duration.hours(24),
      shardCount: 4,
      streamMode: aws_kinesis.StreamMode.PROVISIONED,
    });

    // register a consumer with data stream
    const consumer = new aws_kinesis.CfnStreamConsumer(
      this,
      "LambdaRegisterConsumer",
      {
        consumerName: "LambdaRegisterConsumer",
        streamArn: stream.streamArn,
      }
    );

    // lambda - kinesis integration
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
  }
}
