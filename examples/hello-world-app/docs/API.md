# API Documentation

## Base URL
```
http://localhost:3000
```

## Endpoints

### GET /api/greeting

Get a personalized greeting message.

**Parameters:**
- `name` (optional): Name to greet (default: "World")
- `lang` (optional): Language code (default: "en")

**Supported Languages:**
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German

**Example Request:**
```
GET /api/greeting?name=Alice&lang=es
```

**Example Response:**
```json
{
  "message": "¡Hola, Alice!",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "language": "es",
  "recipient": "Alice",
  "agent": "Claude Flow Swarm"
}
```

### GET /api/info

Get application information.

**Example Response:**
```json
{
  "name": "Hello World App",
  "version": "1.0.0",
  "description": "Built by intelligent agents working together",
  "agents": 12,
  "technologies": ["Node.js", "Express", "HTML5", "CSS3", "JavaScript"],
  "features": ["REST API", "I18n", "Security", "Testing", "Docker", "CI/CD"]
}
```

### GET /health

Health check endpoint.

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

Error responses include a message:
```json
{
  "error": "Error description"
}
```
