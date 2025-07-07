const express = require('express');
const router = express.Router();

// Greeting endpoint
router.get('/greeting', (req, res) => {
  const { name = 'World', lang = 'en' } = req.query;
  
  const greetings = {
    en: `Hello, ${name}!`,
    es: `¡Hola, ${name}!`,
    fr: `Bonjour, ${name}!`,
    de: `Hallo, ${name}!`
  };
  
  const message = greetings[lang] || greetings.en;
  
  res.json({
    message,
    timestamp: new Date().toISOString(),
    language: lang,
    recipient: name,
    agent: 'Claude Flow Swarm'
  });
});

// Info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Hello World App',
    version: '1.0.0',
    description: 'Built by intelligent agents working together',
    agents: 12,
    technologies: ['Node.js', 'Express', 'HTML5', 'CSS3', 'JavaScript'],
    features: ['REST API', 'I18n', 'Security', 'Testing', 'Docker', 'CI/CD']
  });
});

module.exports = router;
