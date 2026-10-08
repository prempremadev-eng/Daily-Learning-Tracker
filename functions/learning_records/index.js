'use strict';

const catalyst = require('zcatalyst-sdk-node');

// Table name comes from catalyst-config.json → env_variables (not hard-coded here)
const TABLE_NAME = process.env.TABLE_NAME || 'LearningRecords';
const ALLOWED_STATUS = ['Completed', 'In Progress'];

// ---------- small helpers ----------

// Send a JSON reply
function sendJson(res, statusCode, data) {
	res.writeHead(statusCode, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data));
}

// Read the request body and turn it into a JS object
function readBody(req) {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			if (!body) return resolve({});
			try {
				resolve(JSON.parse(body));
			} catch (err) {
				reject(new Error('Invalid JSON body'));
			}
		});
		req.on('error', reject);
	});
}

// Check the data coming from React before saving
function validate(data) {
	if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return 'Date is required (YYYY-MM-DD)';
	if (!data.topic || !data.topic.trim()) return 'Topic is required';
	if (!ALLOWED_STATUS.includes(data.status)) return 'Status must be Completed or In Progress';
	return null;
}

// Data Store row → clean object for React
function toRecord(row) {
	return {
		id: row.ROWID,
		date: row.learning_date,
		topic: row.topic,
		description: row.description || '',
		status: row.status,
		createdTime: row.CREATEDTIME
	};
}

// Allow the Vite dev server (localhost) to call this function directly during local dev.
// On Catalyst, CORS is handled by the console "Authorized Domains" setting.
function setLocalCors(req, res) {
	const origin = req.headers.origin || '';
	if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	}
}

// ---------- CRUD actions ----------

// GET → all records, latest first
async function getAll(table) {
	let rows = [];
	let nextToken;
	do {
		const page = await table.getPagedRows({ nextToken, maxRows: 200 });
		rows = rows.concat(page.data);
		nextToken = page.more_records ? page.next_token : undefined;
	} while (nextToken);

	const records = rows.map(toRecord);
	// Latest date first; same date → newest created first
	records.sort((a, b) => {
		if (a.date !== b.date) return a.date < b.date ? 1 : -1;
		return a.createdTime < b.createdTime ? 1 : -1;
	});
	return records;
}

// POST → add one record
async function addRecord(table, data) {
	const row = await table.insertRow({
		learning_date: data.date,
		topic: data.topic.trim(),
		description: (data.description || '').trim(),
		status: data.status
	});
	return toRecord(row);
}

// PUT → update one record
async function updateRecord(table, id, data) {
	const row = await table.updateRow({
		ROWID: id,
		learning_date: data.date,
		topic: data.topic.trim(),
		description: (data.description || '').trim(),
		status: data.status
	});
	return toRecord(row);
}

// ---------- main handler ----------
// URLs (after /server/learning_records):
//   GET    /      → list
//   POST   /      → add
//   PUT    /:id   → update
//   DELETE /:id   → delete
module.exports = async (req, res) => {
	setLocalCors(req, res);
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		return res.end();
	}

	const path = req.url.split('?')[0];
	const idMatch = path.match(/^\/(\d+)\/?$/);
	const id = idMatch ? idMatch[1] : null;

	try {
		const app = catalyst.initialize(req);
		const table = app.datastore().table(TABLE_NAME);

		if (req.method === 'GET' && (path === '/' || path === '')) {
			const records = await getAll(table);
			return sendJson(res, 200, { data: records });
		}

		if (req.method === 'POST' && (path === '/' || path === '')) {
			const data = await readBody(req);
			const error = validate(data);
			if (error) return sendJson(res, 400, { error });
			const record = await addRecord(table, data);
			return sendJson(res, 201, { data: record });
		}

		if (req.method === 'PUT' && id) {
			const data = await readBody(req);
			const error = validate(data);
			if (error) return sendJson(res, 400, { error });
			const record = await updateRecord(table, id, data);
			return sendJson(res, 200, { data: record });
		}

		if (req.method === 'DELETE' && id) {
			await table.deleteRow(id);
			return sendJson(res, 200, { data: { id } });
		}

		return sendJson(res, 404, { error: 'Route not found' });
	} catch (err) {
		console.error('learning_records error:', err);
		const status = err.message === 'Invalid JSON body' ? 400 : 500;
		return sendJson(res, status, { error: err.message || 'Something went wrong' });
	}
};
