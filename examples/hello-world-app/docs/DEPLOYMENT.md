# Deployment Guide

## Docker Deployment

### Build Image
```bash
docker build -t hello-world-app .
```

### Run Container
```bash
docker run -p 3000:3000 hello-world-app
```

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Manual Deployment

### Prerequisites
- Node.js 18+
- npm

### Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Start application: `npm start`

## CI/CD Pipeline

The application includes a GitHub Actions workflow that:
1. Runs tests on every push
2. Builds Docker image
3. Deploys to staging/production

See `.github/workflows/ci.yml` for configuration.

## Health Monitoring

Monitor application health:
- Health endpoint: `/health`
- Application info: `/api/info`
- Server logs for debugging

## Security Considerations

- Rate limiting enabled (100 requests per 15 minutes)
- Input validation and sanitization
- Security headers (XSS, CSRF protection)
- CORS configuration
