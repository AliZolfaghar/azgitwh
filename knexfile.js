import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.AZGITWH_DATA_DIR ?? path.join(root, 'data');

mkdirSync(dataDir, { recursive: true });

/** @type {import('knex').Knex.Config} */
const config = {
	client: 'better-sqlite3',
	connection: {
		filename: path.join(dataDir, 'app.db')
	},
	useNullAsDefault: true,
	migrations: {
		directory: path.join(root, 'migrations'),
		extension: 'js'
	},
	seeds: {
		directory: path.join(root, 'seeds'),
		extension: 'js'
	}
};

export default config;
