# Thoughts - A Full-Stack Blog Application

A complete full-stack igeas application with a React frontend and Node.js backend. This project features user authentication, a global feed for ideas, daily posting limits, and voting functionality on posts. 

## Features
- **User Authentication**: Register and login using JWT.
- **Global Feed**: View thoughts shared by other users.
- **Daily Post Limit**: Rate-limiting to allow users a maximum of 2 posts per day.
- **Upvote / Downvote System**: Users can engage with posts.
- **Responsive UI**: A modern user interface built using React, Vite, and Framer Motion.

## Tech Stack
### Frontend (`/client`)
- React 19
- Vite
- Framer Motion (for animations)
- Lucide React (for icons)
- date-fns (for date formatting)

### Backend (`/server`)
- Node.js & Express
- MySQL (Database)
- bcrypt (Password Hashing)
- jsonwebtoken (Auth tokens)

## Getting Started

### Prerequisites
- Node.js (v14+)
- MySQL Server

### 1. Database Setup
1. Create a `.env` file in the `/server` directory using the provided `.env.example` file.
```bash
cp server/.env.example server/.env
```
2. Update the `server/.env` file with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blog_db
PORT=3000
```
3. Initialize the database and tables:
```bash
cd server
npm install
node setup_db.js
```

### 2. Run the Backend (Server)
Start the Express server on port 3000:
```bash
cd server
npm start
```
*Note: Ensure your MySQL server is running before starting the backend.*

### 3. Run the Frontend (Client)
In a new terminal instance, install dependencies and start the Vite development server:
```bash
cd client
npm install
npm run dev
```
The client will be running on [http://localhost:5173](http://localhost:5173).

## Contributing
Feel free to open issues or submit pull requests for any features or improvements!
