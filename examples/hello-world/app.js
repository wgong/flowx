const express = require('express');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine (using plain HTML for simplicity)
app.use(express.static(path.join(__dirname, 'views')));

// Routes
// Home route - serves the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API endpoint for greeting
app.get('/api/greeting', (req, res) => {
  const name = req.query.name || 'World';
  res.json({ message: `Hello, ${name}!` });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});