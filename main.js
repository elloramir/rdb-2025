const cluster = require("cluster");
const server = require("./server");
const tasks = require("./tasks");
const cores = 2;

if (cluster.isPrimary) {
	const pool = [];
	const batchSize = 8;
	const checkInterval = 100;
	let batch = null;

	// The task manager is created on the primary
	// cluster to avoid multiple processes handling it.
	// This centralized approach is way less trouble maker.
	cluster.on("message", function(worker, message, handle) {
		if (message.type === "addTaskToQueue") {
			pool.push(tasks.payments(message.data));
		}
	});

	// Given an interval, we always check for new tasks
	// added to the pool list and execute them in batches.
	setInterval(function() {
		if (!batch && pool.length > 0) {
			batch = Promise.all(pool.splice(0, batchSize)).then(() => {
				batch = null;
			});
		}
	}, checkInterval);

	// Forces round-robin algorithm for fairer distribution
	cluster.schedulingPolicy = cluster.SCHED_RR;

	for (let i = 0; i < cores; i++) {
		cluster.fork();
	}
} else {
	// Run the server for each cluster instance
	server.boot();
}