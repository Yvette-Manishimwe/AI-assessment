# API Documentation

## Overview

The Acme Platform REST API lets you programmatically manage tasks, projects, users, and more. All endpoints return JSON.

Base URL: `https://api.acmeplatform.com/v2`

## Authentication

All API requests must include your API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Generate an API key from Settings → Developer → API Keys. Keys can be scoped to specific permissions (read-only, read-write, admin).

Rate limits:
- Free plan: 100 requests/hour
- Starter: 1,000 requests/hour
- Growth: 10,000 requests/hour
- Enterprise: Custom (contact sales)

## Core Endpoints

### Tasks

**GET /tasks** — List tasks
Parameters: project_id, status, assignee_id, limit (max 100), offset

**POST /tasks** — Create a task
Body: title (required), description, project_id (required), assignee_id, due_date, priority

**GET /tasks/{id}** — Get a task
**PUT /tasks/{id}** — Update a task
**DELETE /tasks/{id}** — Delete a task

### Projects

**GET /projects** — List all projects in your workspace
**POST /projects** — Create a project
**GET /projects/{id}** — Get project details
**PUT /projects/{id}** — Update a project

### Users

**GET /users/me** — Get current authenticated user
**GET /users** — List workspace members (admin only)

## Webhooks

Register a webhook to receive real-time events:

**POST /webhooks**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["task.created", "task.updated", "task.completed"],
  "secret": "your-hmac-secret"
}
```

Supported events: task.created, task.updated, task.deleted, task.completed, comment.created, project.created, member.added

Each webhook delivery includes an `X-Acme-Signature` header for HMAC-SHA256 verification.

## Error Responses

All errors return:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

Common error codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, RATE_LIMITED, VALIDATION_ERROR, INTERNAL_ERROR

## SDK

Official SDKs are available for:
- JavaScript/TypeScript: `npm install @acme/sdk`
- Python: `pip install acme-sdk`
- Ruby: `gem install acme-platform`

Full SDK documentation is available at docs.acmeplatform.com/sdk
