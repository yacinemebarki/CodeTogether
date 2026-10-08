# AlgoLearn

AlgoLearn is a collaborative algorithm-learning platform that lets users browse coding problems, join shared rooms, and solve challenges with live code collaboration.

## Overview

The app is designed around two core experiences:

- Learning algorithmic problems with descriptions, constraints, examples, and starter code
- Working together in real-time rooms where users can chat, change roles, and sync their solution state

This is a full-stack TypeScript project with an Angular frontend and an Express + Socket.IO backend.

## Features

- Problem library with difficulty and category metadata
- Problem detail pages with examples, constraints, and test cases
- Starter code templates for multiple languages
- Room creation and joining via shareable room codes
- Real-time code synchronization across users in the same room
- Chat, user roles, mute/kick controls, and ownership management
- Backend code execution against problem test cases

## Tech stack

- Frontend: Angular 21, TypeScript, RxJS, Socket.IO client
- Backend: Express, Socket.IO, TypeScript
- Code execution: Node-based runners for JavaScript, TypeScript, Python, C++, C, and Java
- Problem definitions: JSON files under `backend/problems/`

## Project structure

```text
AlgoLearn/
├── backend/
│   ├── execution/          # Code runners for multiple languages
│   ├── problems/          # Problem definitions in JSON format
│   ├── Room.ts            # Room model
│   ├── server.ts          # Express + Socket.IO server
│   └── package.json
├── frontend/
│   ├── src/               # Angular application source
│   ├── angular.json
│   └── package.json
├── README.md
├── package.json
└── package-lock.json
```

## Running locally

Install the dependencies in both app folders:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm start
```

Then open:

```text
http://localhost:4200
```

The backend runs on port `3000` and serves the problem API and real-time room events.

## API and real-time behavior

The backend exposes:

- `GET /api/problems` — returns the list of available challenge definitions
- `POST /api/createRoom` — creates a room and returns the owner user data
- `POST /api/joinRoom` — joins an existing room if the room code and username are valid

Socket events power the collaborative room functionality such as:

- room updates
- chat messages
- problem selection
- role changes
- code synchronization
- running solution code

## Adding a new problem

Each problem is stored as a JSON file in `backend/problems/`.

A problem definition includes:

- `id`
- `title`
- `category`
- `difficulty`
- `description`
- `function_name`
- `constraints`
- `input` and `output` metadata
- `test_cases`
- `starterCode` for supported languages

Example:

```json
{
  "id": 3,
  "title": "Two Sum",
  "category": "arrays",
  "difficulty": "easy",
  "description": "Return the indices of two numbers that add up to a target value.",
  "function_name": "TwoSum",
  "constraints": ["1 <= nums.length <= 10^4"],
  "test_cases": [
    { "input": [[2, 7, 11, 15], 9], "expected_output": [0, 1] }
  ],
  "starterCode": {
    "javascript": "function TwoSum(nums, target) {\n  // your code\n}",
    "python": "def TwoSum(nums, target):\n    pass"
  }
}
```

Once added, the frontend will automatically read it from the backend API.

## Notes

- The project is intentionally lightweight and JSON-driven for easy experimentation with problem content.
- The app is best suited for local development and educational use rather than production deployment.
- If you want to extend the platform, the primary integration points are the backend server, room event handlers, and the problem JSON definitions.


