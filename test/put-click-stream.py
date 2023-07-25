"""
haimtran 17/07/2023
This is from Lab 2 building streaming data application on aws 
Script to generate clickstream data and send to aws stream.
python3 clickstream_generator_items.py REPLACE_WITH_KinesisDataStreamName 1 1
"""

import json
import random
from datetime import datetime
import time
import hashlib
import boto3

# parameters
REGION = "ap-southeast-1"
STREAM_NAME = "click-stream"
MAX_SECONDS_BETWEEN_EVENTS = 1
# debug mode
DEBUG_MODE = 1 


def get_event_id():
    hashed = hashlib.md5(datetime.now().strftime("%m/%d/%YT%H:%M:%S.%f").encode())

    return hashed.hexdigest()

def get_event():
    events = [
        "purchased_item", "liked_item", "reviewed_item", "entered_payment_method",
        "clicked_review", "clicked_item_description"
    ]

    return random.choice(events)

def get_item_quantity(eventname):
    MAX_ITEM_LIMIT = 5
    if (eventname == 'purchased_item'):
        itemqty=random.randint(1, MAX_ITEM_LIMIT)
    else:
        itemqty=0
    return itemqty

def get_item_id(page_name):
    #print(page_name)
    if (page_name == 'apparel'):
        MIN_ITEM_LIMIT = 11
        MAX_ITEM_LIMIT = 13
    elif (page_name == 'food'):
        MIN_ITEM_LIMIT = 21
        MAX_ITEM_LIMIT = 23
    elif (page_name == 'electronics'):
        MIN_ITEM_LIMIT = 31
        MAX_ITEM_LIMIT = 33
    elif (page_name == 'home'):
        MIN_ITEM_LIMIT = 41
        MAX_ITEM_LIMIT = 43
    else:
        MIN_ITEM_LIMIT = 51
        MAX_ITEM_LIMIT = 53

    #print(MIN_ITEM_LIMIT)
    #print(MAX_ITEM_LIMIT)
    return random.randint(MIN_ITEM_LIMIT, MAX_ITEM_LIMIT)


def get_user_id():
    MAX_USER_ID = 50

    return random.randint(1, MAX_USER_ID)

def get_event_time():
    #return datetime.now().strftime("%m/%d/%YT%H:%M:%S.%f")
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")

def get_os():
    os = ["ios", "android", "web"]

    return random.choice(os)

def get_page():
    pages = ["apparel", "food", "electronics", "home", "books"]

    return random.choice(pages)



if __name__ == '__main__':
    # create kinesis client 
    client = boto3.client("kinesis", region_name=REGION)

    # put messages or record to stream 
    while True:
        # sleep between record
        time.sleep(MAX_SECONDS_BETWEEN_EVENTS)
        # event name
        eventname=get_event()
        # page name
        pagename=get_page()
        # item id
        itemid=get_item_id(pagename)
        # item quantity
        itemquantity=get_item_quantity(eventname)
        # create a event
        event = {
            "event_id": get_event_id(),
            "event": eventname,
            "user_id": get_user_id(),
            "item_id": itemid,
            "item_quantity": itemquantity,
            "event_time": get_event_time(),
            "os": get_os(),
            "page": get_page(),
            "url": "www.cdk.entest.com"
           }
        # convert event dict to json
        data = json.dumps(event,indent=1)
        print(data)
        # convert event to blob data 
        encoded_data = data.encode("utf-8")
        # put the event to stream 
        response = client.put_record(
            StreamName=STREAM_NAME,
            Data=encoded_data,
            # PartitionKey="partitionkey"
            PartitionKey=str(event["user_id"]) 
            )
        # print for debugging 
        if (DEBUG_MODE == 1) :
            print("Message written to the Kineis Data Stream")
            print(json.dumps(response,indent=1))
            print(response["ShardId"])
            print("SequenceNumber:")
            print(response["SequenceNumber"])
            print("HTTStatusCode:")
            print(response["ResponseMetadata"]["HTTPStatusCode"])