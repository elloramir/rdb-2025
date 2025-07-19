const cluster = require("cluster");
const server = require("./server");
const tasks = require("./tasks");
const cores = 2;

if (cluster.isPrimary) {
	const pool = [];
	const batchSize = 8;
	const checkInterval = 100;
	let batch = null;

	// The task manager runs only in the primary cluster
	// to avoid race conditions by keeping state updates centralized.
	cluster.on("message", function(worker, message, handle) {
		if (message.type === "addTaskToQueue") {
			pool.push(tasks.payments(message.data));
		}
	});

	// Node.js handles TCP connections asynchronously and in parallel,
	// so we can process I/O tasks without managing workers or threads.
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