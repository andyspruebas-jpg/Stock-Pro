module.exports = {
    apps: [
        {
            name: 'stock-backend',
            script: '/home/gabriel/Quiebra/backend/venv/bin/python3',
            args: ['main.py'],
            cwd: '/home/gabriel/Quiebra/backend',
            watch: false,
            env: {
                PORT: 5176
            }
        },
        {
            name: 'stock-frontend',
            script: 'npm',
            args: 'run preview -- --host 0.0.0.0 --port 5173',
            cwd: '/home/gabriel/Quiebra/frontend',
            watch: false,
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
