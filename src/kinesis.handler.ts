import { KinesisStreamRecord } from 'aws-lambda';
import { Kinesis } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export default class KinesisHandler {
  public static async listener(records: KinesisStreamRecord[]) {
    try {
      records.forEach((record) => {
        const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
        console.log('Decoded payload:', payload);
      });
    } catch (err) {
      console.error(err);
      console.log('Retrying...');
      throw new Error(err);
    }
  }

  public static async put(): Promise<any> {
    const kinesis = new Kinesis({
      apiVersion: '2013-12-02'
    });

    const streamName = 'myapp_stream';

    try {
      await kinesis
        .putRecord({
          StreamName: streamName,
          PartitionKey: uuidv4(),
          Data: JSON.stringify({ randomValue: uuidv4() })
        })
        .promise();
    } catch (error) {
      console.log('Retrying...');
      throw new Error(error);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Message placed in the Event Stream!'
      })
    };
  }
}
