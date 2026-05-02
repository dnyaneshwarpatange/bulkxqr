module.exports = {
  apps: [
    {
      name: 'qrforge',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/qrforge',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/qrforge/error.log',
      out_file: '/var/log/qrforge/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
