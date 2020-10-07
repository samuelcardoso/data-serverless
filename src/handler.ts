import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export const corsHeaders = {
  'X-Requested-With': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*'
};

export async function api(event: Partial<APIGatewayProxyEvent>, context: Context): Promise<any> {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
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
