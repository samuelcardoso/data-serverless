import {
  KinesisStreamEvent,
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyHandler,
} from "aws-lambda";
import { Kinesis } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import * as tf from "@tensorflow/tfjs";
import wine_quality from "./externals/data/wine_quality.data";
import { LayersModel } from "@tensorflow/tfjs";

let model;

export const corsHeaders = {
  "X-Requested-With": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
};

export default class RequestUtils {
  static getCors() {
    return {
      "X-Requested-With": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    };
  }
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
        Data: JSON.stringify({ a: 3 }),
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

export async function check(
  event: Partial<APIGatewayProxyEvent>,
  context: Context
) {
  const inputToTest = JSON.parse(event.body!);

  var inputs = <any>[];
  for (var o in inputToTest) {
    inputs.push(inputToTest[o]);
  }
  const inputTensor = tf.tensor1d(inputs, "float32").expandDims(0);

  if(!model) {
    console.log('Model not trained ...');
    model = await train();
    console.log('Model trained!');
  } else {
    console.log('Model here!');
  }

  const result = await model.predict(inputTensor) as any;
 
  return {
    statusCode: 200,
    body: JSON.stringify({
      quality: result.argMax(1).dataSync()[0]
    }),
  };
}

export async function train() {
  const data = wine_quality;

  const model = createModel();

  const tensorData = prepareData(data);
  const { inputs, outputs } = tensorData;

  await trainModel(model, inputs, outputs, 100);
  console.log("Done Training");

  const result = await model.evaluate(inputs, outputs, { batchSize: 64 });
  console.log("Accuracy is:");
  result[1].print();

  return model;
}

function createModel(): LayersModel {
  const model = tf.sequential();
  model.add(tf.layers.dense({inputShape: [11], units: 50, useBias: true, activation: "relu"}));
  model.add(tf.layers.dense({ units: 30, useBias: true, activation: "tanh" }));
  model.add(tf.layers.dense({ units: 20, useBias: true, activation: "relu" }));
  model.add(tf.layers.dense({ units: 10, useBias: true, activation: "softmax" }));
  return model;
}

/**
 * @desc trains model
 * @return trained model
 */
async function trainModel(model, inputs, outputs, epochs) {
  model.compile({
    optimizer: tf.train.adam(),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  const batchSize = 64;

  return await model.fit(inputs, outputs, {
    batchSize,
    epochs,
    shuffle: true,
  });
}

/**
 * @desc creates array of input data for every sample
 * @param json data – complete json that contains wine quality data
 * @return array of input data
 */
function extractInputs(data): Array<any> {
  let inputs = [];
  inputs = data.map((d) => [
    d.fixed_acidity,
    d.volatile_acidity,
    d.citric_acid,
    d.residual_sugar,
    d.chlorides,
    d.free_sulfur_dioxide,
    d.total_sulfur_dioxide,
    d.density,
    d.pH,
    d.sulphates,
    d.alcohol,
  ]);
  return inputs;
}

/**
 * @desc converts data from json format to tensors
 * @param json data – complete json that contains wine quality data
 * @return tuple of converted data that can be used for training model
 */
function prepareData(data) {
  return tf.tidy(() => {
    tf.util.shuffle(data);

    const inputs = extractInputs(data);
    const outputs = data.map((d) => d.quality);

    const inputTensor = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);
    const outputTensor = tf.oneHot(tf.tensor1d(outputs, "int32"), 10);

    const inputMax = inputTensor.max();
    const inputMin = inputTensor.min();
    const outputMax = outputTensor.max();
    const outputMin = outputTensor.min();

    const normalizedInputs = inputTensor
      .sub(inputMin)
      .div(inputMax.sub(inputMin));
    const normalizedoutputs = outputTensor
      .sub(outputMin)
      .div(outputMax.sub(outputMin));

    return {
      inputs: normalizedInputs,
      outputs: normalizedoutputs,
      inputMax,
      inputMin,
      outputMax,
      outputMin,
    };
  });
}
