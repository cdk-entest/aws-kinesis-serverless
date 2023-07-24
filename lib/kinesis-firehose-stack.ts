import {
  CfnResource,
  Stack,
  StackProps,
  aws_iam,
  aws_kinesisfirehose,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface KinesisFirehoseProps extends StackProps {
  streamName: string;
  bucketName: string;
}

export class KinesisFirehoseStack extends Stack {
  constructor(scope: Construct, id: string, props: KinesisFirehoseProps) {
    super(scope, id, props);

    // role for kinesis firehose
    const role = new aws_iam.Role(this, "RoleForKinesisFirehose", {
      assumedBy: new aws_iam.ServicePrincipal("firehose.amazonaws.com"),
      roleName: "RoleForKinesisFirehose",
    });

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*"],
        resources: ["*"],
      })
    );

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudwatch:*"],
        resources: ["*"],
      })
    );

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:*"],
        resources: ["*"],
      })
    );

    const firehorsePolicy = new aws_iam.Policy(this, "FirehosePolicy", {
      roles: [role],
      statements: [
        new aws_iam.PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["kinesis:*"],
          resources: ["*"],
        }),
      ],
    });

    // create a firehorse delivery
    const firehose = new aws_kinesisfirehose.CfnDeliveryStream(
      this,
      "KinesisFirehoseDemo",
      {
        deliveryStreamName: "KinesisFirehoseDemo",
        // direct put or kinesis as source
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          // source stream
          kinesisStreamArn: `arn:aws:kinesis:${this.region}:${this.account}:stream/${props.streamName}`,
          // role access source
          roleArn: role.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: `arn:aws:s3:::${props.bucketName}`,
          // role access destination
          roleArn: role.roleArn,
          bufferingHints: {
            intervalInSeconds: 60,
            sizeInMBs: 123,
          },
          cloudWatchLoggingOptions: {
            enabled: true,
            logGroupName: "FirehoseDemo",
            logStreamName: "FirehoseDemo",
          },
          // compressionFormat: "",
          // encryptionConfiguration: {},
          errorOutputPrefix: "firehose-error",
          prefix: "firehose-data",
        },
      }
    );

    firehose.addDependency(role.node.defaultChild as CfnResource);
    firehose.addDependency(firehorsePolicy.node.defaultChild as CfnResource);
  }
}
