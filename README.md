---
author: haimtran
title: kinesis serverless demo
description:
publishedDate: 17/07/2023
date: 17/07/2023
---

## Introduction

> Configure the ParallelizationFactor setting to process one shard of a Kinesis or DynamoDB data stream with more than one Lambda invocation simultaneously. You can specify the number of concurrent batches that Lambda polls from a shard via a parallelization factor from 1 (default) to 10. For example, when you set ParallelizationFactor to 2, you can have 200 concurrent Lambda invocations at maximum to process 100 Kinesis data shards. This helps scale up the processing throughput when the data volume is volatile and the IteratorAge is high. Note that parallelization factor will not work if you are using Kinesis aggregation. For more information, see New AWS Lambda scaling controls for Kinesis and DynamoDB event sources. Also, see the Serverless Data Processing on AWS workshop for complete tutorials.

## References

- [using lambda with amazon kinesis](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-configure)

- [lambda with kinesis efo](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-configure)

- [lambda and kinesis scaling](https://aws.amazon.com/blogs/compute/new-aws-lambda-scaling-controls-for-kinesis-and-dynamodb-event-sources/)

- [serverless workshop](https://data-processing.serverlessworkshops.io/)

- [amazon kinesis enhanced fan-out blog](https://medium.com/avmconsulting-blog/amazon-kinesis-enhanced-fan-out-4e500411a414)

-
