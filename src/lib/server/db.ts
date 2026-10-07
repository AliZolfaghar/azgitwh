import { mkdirSync } from 'node:fs';
import path from 'node:path';
import knex, { type Knex } from 'knex';
import config from '../../../knexfile.js';

const dataDir = process.env.AZGITWH_DATA_DIR ?? path.join(process.cwd(), 'data');
const dbPath =
	typeof config.connection === 'object' &&
	config.connection &&
	'filename' in config.connection
		? String(config.connection.filename)
		: path.join(dataDir, 'app.db');

let db: Knex | undefined;
let ready: Promise<Knex> | undefined;

async function dropLegacyPrototypeTables(database: Knex) {
	// Pre-knex prototype created a `sessions` table without `user_id`.
	if (await database.schema.hasTable('sessions')) {
		const columns = await database('sessions').columnInfo();
		if (!('user_id' in columns)) {
			await database.schema.dropTable('sessions');
		}
	}
}

async function prepare(database: Knex) {
	await database.raw('PRAGMA foreign_keys = ON');
	await dropLegacyPrototypeTables(database);
	await database.migrate.latest();
	await database.seed.run();
}

/**
 * Knex connection (SQLite via better-sqlite3).
 * On first call (via `init` in hooks.server.ts) runs `migrate:latest` + `seed:run`.
 */
export async function getDb(): Promise<Knex> {
	if (db) return db;

	if (!ready) {
		ready = (async () => {
			mkdirSync(path.dirname(dbPath), { recursive: true });
			const instance = knex(config);
			await prepare(instance);
			db = instance;
			return instance;
		})().catch((error) => {
			ready = undefined;
			throw error;
		});
	}

	return ready;
}

export async function getDbInfo() {
	const database = await getDb();
	const installed = await database('app_meta').where({ key: 'installed_at' }).first<{
		value: string;
	}>();

	return {
		path: dbPath,
		installedAt: installed?.value ?? null
	};
}
