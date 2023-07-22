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