const http = require("http");
const mux = new Map();

mux.set("[GET]/payments-summary", handlePaymentsSummary);
mux.set("[POST]/payments", handlePayments);

function waitForBodyData(request) {
	return new Promise(function(resolve) {
		let body = "";

		request.on("data", chunk => { body += chunk.toString(); });
		request.on("end", () => resolve(body))
	});
}

function getParamsFromRequest(request) {
	return parseUrl(request).searchParams;
}

function parseUrl(request) {
	const strUrl = `http://${request.headers.host}${request.url}`;
	const url = new URL(strUrl);

	return url;
}

function parseJson(strData) {
    try {
        return [JSON.parse(strData), null];
    } catch (err) {
        return [null, err];
    }
}

function handleRequest(request, response) {
	const url = parseUrl(request);
	const path = url.pathname;
	const method = request.method.toUpperCase();
	const key = `[${method}]${path}`;
	
	// For debug
	console.log(`${key} - Worker PID: ${process.pid}`);
	
	// If it's a valid endpoint, send the current request
	// forward, calling the handler.
	if (mux.has(key)) {
		const handler = mux.get(key);
		handler(request, response);
	}
	// Otherwise, it will recive an 404 response.
	else {
		response.statusCode = 404;
		response.end();
	}
}

async function handlePaymentsSummary(request, response) {
	const params = getParamsFromRequest(request);
	const paramFrom = params.get("from");
	const paramTo = params.get("to");
	
	if (!paramFrom || !paramTo) {
		response.statusCode = 400;
		response.end("Please especify the query parameters!");
	}
	else {
		response.writeHead(200, { "Content-Type": "application/json" });
		response.end(JSON.stringify({
		    "default" : {
		        "totalRequests": 0,
		        "totalAmount": 0
		    },
		    "fallback" : {
		        "totalRequests": 0,
		        "totalAmount": 0
		    }
		}));
	}
}

async function handlePayments(request, response) {
	const rawBody = await waitForBodyData(request);
	const [data, error] = parseJson(rawBody);
	
	if (error || !data.correlationId || !data.amount) {
		response.statusCode = 400;
		response.end("Body data is in incorrect format!");
	}
	else {
		process.send({ type: "addTaskToQueue", data });
		response.statusCode = 202;
		response.end("Job has been created");
	}
}

module.exports.boot = function() {
	const options = { };
	const server = http.createServer(options, handleRequest);
	
	// O cluster do Node.js automaticamente distribui as conexões
	server.listen(9999, "127.0.0.1", function() {
		console.log(`Server working on PID ${process.pid} at localhost:9999`);
	});
}