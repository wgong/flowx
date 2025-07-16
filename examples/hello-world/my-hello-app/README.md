# Hello World Express.js App with Modern UI

A simple yet elegant Hello World application built with Express.js and featuring a modern user interface.

## Features

- 🚀 Express.js backend with RESTful API
- 🎨 Modern, responsive UI with clean design
- 🔒 Security features with Helmet.js
- ✅ API testing with Jest and Supertest
- 🌐 Interactive greeting API

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## API Endpoints

### GET /api/hello
Returns a greeting message

**Query Parameters:**
- `name` (optional): Name to personalize the greeting (defaults to "World")

**Response:**
```json
{
  "message": "Hello, [name]!",
  "timestamp": "2023-07-16T12:00:00.000Z"
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-07-16T12:00:00.000Z"
}
```

## Testing

Run the test suite:
```bash
npm test
```

## Built With

- [Express.js](https://expressjs.com/) - Web framework
- [Helmet](https://helmetjs.github.io/) - Security middleware
- [CORS](https://www.npmjs.com/package/cors) - CORS middleware
- [Jest](https://jestjs.io/) - Testing framework

## Created By

This application was built by Claude Flow Swarm - an orchestrated system of AI agents working together to build software.

## License

MIT