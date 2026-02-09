/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const instruction = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You only say "HI"
<|eot_id|>
`

const corsHeaders = {
    'Access-Control-Allow-Headers': '*', // What headers are allowed. * is wildcard. Instead of using '*', you can specify a list of specific headers that are allowed, such as: Access-Control-Allow-Headers: X-Requested-With, Content-Type, Accept, Authorization.
    'Access-Control-Allow-Methods': '*', // Allowed methods. Others could be GET, PUT, DELETE etc.
    'Access-Control-Allow-Origin': '*', // This is URLs that are allowed to access the server. * is the wildcard character meaning any URL can.
}

interface inputRequest {
    message: string
}

const parseInput = async (_request: Request<unknown, IncomingRequestCfProperties<unknown>>) => {
    try {
        const requestBody: inputRequest = await _request.json();
        return requestBody.message;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}

export default {
    async fetch(request, env, ctx): Promise<Response> {

        if (request.method === "OPTIONS") {
            return new Response("OK", {
                status: 200,
                headers: corsHeaders
            });
        }

        const requestMessage = await parseInput(request);
        if (!requestMessage)
            return new Response(null, { status: 400, headers: corsHeaders });

        const stream = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.2-lora", {
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: instruction
                },
                ...requestMessage
            ],
        });

        return new Response(
            stream,
            {
                status: 200,
                headers: {
                    'content-type': 'text/event-stream',
                    ...corsHeaders
                }
            });
    },
} satisfies ExportedHandler<Env>;
