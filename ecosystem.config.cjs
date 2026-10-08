/**
 * PM2 config for git to invoice (SvelteKit adapter-node).
 *
 * Usage:
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
	apps: [
		{
			name: 'git-to-invoice',
			script: 'build/index.js',
			cwd: __dirname,
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			watch: false,
			max_memory_restart: '512M',
			env: {
				NODE_ENV: 'production',
				HOST: '0.0.0.0',
				PORT: '3000'
			}
		}
	]
};
