# Express.js Hello World Application

A simple "Hello World" web application built with Express.js featuring a modern UI.

## Features

- Express.js backend server
- RESTful API endpoint for greetings
- Modern UI with CSS animations
- Interactive name updating
- API data fetching demonstration

## Project Structure

```
hello-world/
├── app.js                # Main Express application
├── package.json          # Project dependencies and scripts
├── public/               # Static assets
│   ├── css/
│   │   └── style.css     # Application styles
│   └── js/
│       └── script.js     # Frontend JavaScript
└── views/
    └── index.html        # Main HTML page
```

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm (comes with Node.js)

### Installation

1. Clone this repository or navigate to the project folder
2. Install dependencies:

```bash
npm install
```

### Running the Application

Start the development server with automatic reloading:

```bash
npm run dev
```

Or start the server normally:

```bash
npm start
```

Then visit `http://localhost:3000` in your web browser.

## API Usage

The application provides a simple greeting API:

- Endpoint: `/api/greeting`
- Method: GET
- Query Parameters:
  - `name` (optional): The name to greet (defaults to "World")
- Response: JSON with a message property

Example:
```
GET /api/greeting?name=Claude

Response:
{
  "message": "Hello, Claude!"
}
```

## License

MIT