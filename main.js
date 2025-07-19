const http = require("http");
const options = { };
const server = http.createServer(options, handleRequest);
const mux = new Map();

const paymentsDefaultUrl = "http://localhost:8001/payments";
const paymentsFallbackUrl = "http://localhost:8002/payments";

const paymentSumaryData = {
    "default" : {
        "totalRequests": 0,
        "totalAmount": 0
    },
    "fallback" : {
        "totalRequests": 0,
        "totalAmount": 0
    }
}


// Heath check has a rate limit of 5 requests per second.
// That function should return true if
async function checkHeath(baseUrl) {
	const state = await fetch(`${baseUrl}/service-health`)
		.then(resp => resp.status == 200 && resp.json() || false)
		.then(data => !data.failing)
		.catch(resp => false);

	return state;
}

function waitForBodyData(request) {
	return new Promise(function(resolve) {
		let body = "";

		request.on("data", chunk => { body += chunk.toString(); });
		request.on("end", () => resolve(body))
	});
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

function getParamsFromRequest(request) {
	return parseUrl(request).searchParams;
}

mux.set("[GET]/payments-summary", handlePaymentsSummary);
mux.set("[POST]/payments", handlePayments);

function handleRequest(request, response) {
	const url = parseUrl(request);
	const path = url.pathname;
	const method = request.method.toUpperCase();
	const key = `[${method}]${path}`;

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
		response.end(JSON.stringify(paymentSumaryData));
	}
}

async function handlePayments(request, response) {
	const api = paymentsDefaultUrl;
	const rawBody = await waitForBodyData(request);
	const [data, error] = parseJson(rawBody);

	if (error || !data.correlationId || !data.amount || !data.requestedAt) {
		response.statusCode = 400;
		response.end("Body data is in incorrect format!");
	}

	else {
		const response = await fetch(api, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				correlationId: data.correlationId,
				amount: data.amount,
				requestedAt: data.requestedAt
			})
		})
			.then(resp => resp.json())
			.catch(err => null);

		if (response) {
			response.statusCode = 500;
			response.end("Cannot complete operaation due an internal error");
		}
		else {
			const sumary = paymentSumaryData["default"];

			sumary["totalRequests"] += 1;
			sumary["totalAmount"] += data.amount;

			response.statusCode = 200;
			response.end();
		}
	}
}

server.listen(9999, "127.0.0.1", function() {
	console.log("Server workiing and running at localhost:9999");
});

