import { KinesisStreamEvent, APIGatewayProxyEvent, Context } from 'aws-lambda';
import TensorFlowHandler from './tensorflow.handler';
import KinesisHandler from './kinesis.handler';

/*
  Kinesis Stream
*/

export async function listener(
  event: Partial<KinesisStreamEvent>,
  context: Context
): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;

  await KinesisHandler.listener(event.Records!);
}

export async function send(
  event: Partial<APIGatewayProxyEvent>,
  context: Context
): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;

  await KinesisHandler.put();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Message placed in the Event Stream!'
    })
  };
}

/*
  Tensorflow Model
*/

// Cached variable
let model;

export async function check(
  event: Partial<APIGatewayProxyEvent>
) {
  const inputTensor = TensorFlowHandler.prepareDataForRunning(JSON.parse(event.body!));

  if (!model) {
    console.log('Model not trained ...');
    model = await TensorFlowHandler.train();
    console.log('Model trained!');
  } else {
    console.log('Model already trained!');
  }

  const result = await model.predict(inputTensor);

  return {
    statusCode: 200,
    body: JSON.stringify({
      quality: result.argMax(1).dataSync()[0]
    }),
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*'
    }
  };
}
