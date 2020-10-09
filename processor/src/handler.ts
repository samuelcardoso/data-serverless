import {
  KinesisStreamEvent,
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyHandler,
} from "aws-lambda";
import { Kinesis }  from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

export const corsHeaders = {
  "X-Requested-With": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
};

export default class RequestUtils {
  static getCors() {
    return {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*'
    };
  };
}

export async function listener(
  event: Partial<KinesisStreamEvent>,
  context: Context
): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // console.log(JSON.stringify(event, null, 2));
    event.Records!.forEach((record) => {
      // Kinesis data is base64 encoded so decode here
      const payload = Buffer.from(record.kinesis.data, "base64").toString(
        "ascii"
      );
      console.log("Decoded payload:", payload);
    });
  } catch (err) {
    console.error(err);
  }
}

export async function send(
  event: Partial<APIGatewayProxyEvent>,
  context: Context
): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;

  const kinesis = new Kinesis({
    apiVersion: "2013-12-02",
  });

  let statusCode: number = 200;
  let message: string;

  // if (!event.body) {
  //   return {
  //     statusCode: 400,
  //     body: JSON.stringify({
  //       message: "No body was found",
  //     }),
  //     headers: {
  //       ...RequestUtils.getCors()
  //     }
  //   };
  // }

  const streamName: string = "myapp_stream";

  try {
    await kinesis
      .putRecord({
        StreamName: streamName,
        PartitionKey: uuidv4(),
        Data: JSON.stringify({a: 3}),
      })
      .promise();

    message = "Message placed in the Event Stream!";
  } catch (error) {
    console.log(error);
    message = error;
    statusCode = 500;
  }

  return {
    statusCode,
    body: JSON.stringify({
      message,
    }),
  };
}

export async function checkModel() {
  

}

export async function trainModel() (
  
}