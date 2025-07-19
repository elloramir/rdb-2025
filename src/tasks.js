const cluster = require("cluster");

const paymentsDefaultUrl = "http://localhost:8001/payments";
const paymentsFallbackUrl = "http://localhost:8002/payments";


// Heath check has a rate limit of 5 requests per second.
// That function should return true if
async function checkHeath(baseUrl) {
	const state = await fetch(`${baseUrl}/service-health`)
		.then(resp => resp.status == 200 && resp.json() || false)
		.then(data => !data.failing)
		.catch(resp => false);
	return state;
}

module.exports.payments = async function(data) {
	const api = paymentsDefaultUrl;
	const requestedAt = new Date().toISOString();
	const apiResponse = await fetch(api, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			correlationId: data.correlationId,
			amount: data.amount,
			requestedAt: requestedAt
		})
	});
}