# Hello World Express.js and React Application

A simple Hello World web application built with Express.js backend and React frontend with modern UI.

## Project Structure

```
hello-world-app/
├── server/             # Express.js backend
│   └── index.js        # Main server file
├── client/             # React frontend
│   ├── public/         # Static files
│   └── src/            # React components and styles
│       ├── components/ # Reusable components
│       ├── App.js      # Main App component
│       └── index.js    # React entry point
├── package.json        # Project dependencies & scripts
└── README.md           # Project documentation
```

## Features

- Express.js backend with API endpoint
- React frontend with modern UI
- Responsive design with animations
- Error handling and loading states

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Install server dependencies:
```bash
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
cd ..
```

### Running the Application

#### Development Mode

1. Start the Express.js server:
```bash
npm run server
```

2. In a new terminal, start the React frontend:
```bash
npm run client
```

3. Or run both concurrently:
```bash
npm run dev:full
```

#### Production Mode

1. Build the client:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## API Endpoints

- GET `/api/hello`: Returns a JSON response with a greeting message and timestamp

## Technologies Used

- **Backend**: Express.js, Node.js
- **Frontend**: React, CSS3
- **Tools**: axios, nodemon, concurrently

## License

This project is licensed under the MIT License