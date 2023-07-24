#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KinesisLambdaStack } from "../lib/kinesis-lambda-stack";
import { KinesisFirehoseStack } from "../lib/kinesis-firehose-stack";

const app = new cdk.App();

// stream name
const STREAM_NAME = "sensor-input-stream";
const BUCKET_NAME = "data-lake-stream-20072023";

const stream = new KinesisLambdaStack(app, "KinesisLambdaStack", {
  streamName: STREAM_NAME,
  tableName: "sensor",
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const firehose = new KinesisFirehoseStack(app, "KindesisFirehoseStack", {
  streamName: STREAM_NAME,
  bucketName: BUCKET_NAME,
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// firehose.addDependency(stream);
