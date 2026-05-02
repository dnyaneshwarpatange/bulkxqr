module.exports = {
  apps: [
    {
      name: 'BulkXQR',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/BulkXQR',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/BulkXQR/error.log',
      out_file: '/var/log/BulkXQR/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
