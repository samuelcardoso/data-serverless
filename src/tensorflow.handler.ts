import * as tf from '@tensorflow/tfjs';
import { LayersModel } from '@tensorflow/tfjs';
import wine_quality from './resources/wine_quality.data';

export default class TensorFlowHandler {
  /**
   * @return created and trained model
   */
  public static async train() {
    const data = wine_quality;

    const model = this.createModel();

    const tensorData = this.prepareDataForTrainning(data);
    const { inputs, outputs } = tensorData;

    console.log('Start training...');
    await this.trainModel(model, inputs, outputs, 100);
    console.log('Done training!');

    const result = await model.evaluate(inputs, outputs, { batchSize: 64 });

    console.log('Accuracy:');
    result[1].print();

    return model;
  }

  /**
   * @return created model
   */
  public static createModel(): LayersModel {
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        inputShape: [11],
        units: 50,
        useBias: true,
        activation: 'relu'
      })
    );
    model.add(
      tf.layers.dense({ units: 30, useBias: true, activation: 'tanh' })
    );
    model.add(
      tf.layers.dense({ units: 20, useBias: true, activation: 'relu' })
    );
    model.add(
      tf.layers.dense({ units: 10, useBias: true, activation: 'softmax' })
    );
    return model;
  }

  /**
   * @desc trains model
   * @return trained model
   */
  public static async trainModel(model, inputs, outputs, epochs) {
    model.compile({
      optimizer: tf.train.adam(),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    const batchSize = 64;

    return model.fit(inputs, outputs, {
      batchSize,
      epochs,
      shuffle: true
    });
  }

  /**
   * @desc creates array of input data for every sample
   * @param json data – complete json that contains wine quality data
   * @return array of input data
   */
  public static extractInputs(data): Array<any> {
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
      d.alcohol
    ]);
    return inputs;
  }

  /**
   * @desc converts data from json format to tensors
   * @return tuple of converted data that can be used for model
   */
  public static prepareDataForRunning(data) {
    const inputs = <any>[];
    for (const o in data) {
      inputs.push(data[o]);
    }
    return tf.tensor1d(inputs, 'float32').expandDims(0);
  }

  /**
   * @desc converts data from json format to tensors
   * @param json data – complete json that contains wine quality data
   * @return tuple of converted data that can be used for training model
   */
  public static prepareDataForTrainning(data) {
    return tf.tidy(() => {
      tf.util.shuffle(data);

      const inputs = this.extractInputs(data);
      const outputs = data.map((d) => d.quality);

      const inputTensor = tf.tensor2d(inputs, [
        inputs.length,
        inputs[0].length
      ]);
      const outputTensor = tf.oneHot(tf.tensor1d(outputs, 'int32'), 10);

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
        outputMin
      };
    });
  }
}
