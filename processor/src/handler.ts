import { KinesisStreamEvent, APIGatewayProxyEvent, Context } from 'aws-lambda';

export const corsHeaders = {
  'X-Requested-With': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*'
};

export async function listener(event: Partial<KinesisStreamEvent>, context: Context): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // console.log(JSON.stringify(event, null, 2));
    event.Records!.forEach((record) => {
      // Kinesis data is base64 encoded so decode here
      const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
      console.log('Decoded payload:', payload);
    });
    console.log('teste');
    return {
      statusCode: 200,
      body: JSON.stringify('AAAAAA'),
      headers: {
        ...corsHeaders
      }
    };
  } catch (err) {
    console.error(err);
  }
}

export async function send(event: Partial<APIGatewayProxyEvent>, context: Context): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const kinesis = new AWS.Kinesis({
      endpoint: `${process.env.LAMBDA_KINESIS_HOST}:${process.env.LAMBDA_KINESIS_PORT}`,
      region: process.env.LAMBDA_REGION,
      apiVersion: '2002',
      sslEnabled: false
    });
    // Read the records
    const records = await BB.all(process.argv.slice(1).map(f => readAsync(f)));
    // Write them to Kinesis
    return BB.map(records, record => kinesis.putRecord({
      Data: JSON.stringify(yaml.safeLoad(record)),
      PartitionKey: '0',
      StreamName: process.env.LAMBDA_KINESIS_STREAM_NAME
    }).promise());
    // console.log(JSON.stringify(event, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify('AAAAAA'),
      headers: {
        ...corsHeaders
      }
    };
  } catch (err) {
    console.error(err);
  }
}
