#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KinesisLambdaStack } from "../lib/kinesis-lambda-stack";

const app = new cdk.App();

new KinesisLambdaStack(app, "KinesisLambdaStack", {
  streamName: "sensor-input-stream",
  tableName: "sensor",
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
