import express from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Room } from "./Room";
import { User } from '../frontend/src/app/interfaces/User';
import { Server } from "socket.io";
import http from "http";

const app = express();

app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:4200"
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`server is running ${PORT}`);
})

const problems: any[] = [];

function LoadProblems(){
    problems.length = 0;
    const ProblemDir = path.join(__dirname, "problems");
    const files = fs.readdirSync(ProblemDir);

    for(const file of files){
        if(file.endsWith(".json")){
            const FileName = path.join(ProblemDir, file);
            const problem = JSON.parse(
                fs.readFileSync(FileName, "utf-8")
            )
            problems.push(problem);
        }
    }
}

app.get("/api/problems",(req, res) => {
    LoadProblems();
    res.json(problems);
})

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';

  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  return id;
}

function generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0');
}

const rooms = new Map<string, Room>();

app.post("/api/createRoom", (req, res) => {
    const { user_name } = req.body;

    let key = '';
    do{
        key = generateRoomId();
    }while(rooms.has(key))

    const color = generateRandomColor();    
    const user: User = {name: user_name, role: "owner", color: color, mute: false, mutedByOwner: false};

    const users: User[] = [];
    users.push(user);

    const room: Room = {
        key: key,
        owner: user,
        users: users
    };


    rooms.set(key, room);

    res.json({
        success: true,
        room: room,
        current_user: user
    });

})

app.post("/api/joinRoom", (req, res) => {
    const { user_name, key } = req.body;

    if(!rooms.has(key)){
        return res.json({
            success: false,
            message: "room with that code dosnt exist"
        })
    }

    const room = rooms.get(key);
    const UserExist = room?.users.some( user => user.name === user_name);

    if(UserExist){
        return res.json({
            success: false,
            message: "exist a user with that user name"
        })
    }

    let color: string;
    do {
        color = generateRandomColor();
    } while (room?.users.some(user => user.color === color));

    const user: User = {name: user_name, role: "viewer", color: color, mute: false, mutedByOwner: false};

    room?.users.push(user);

    return res.json({
        success: true,
        room: room,
        current_user: user
    })

})

io.on("connection", (socket) => {
    socket.on("joinRoom", ({ key }) => {
        if(!rooms.has(key)){
            return;
        }

        socket.join(key);

        const room = rooms.get(key);

        io.to(key).emit("roomUpdated", room?.users);
    })
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("sendMessage", ({ key, message }) => {
        io.to(key).emit("newMessage", message);
    });
    socket.on("toggleMute", ( { key, user_name}) => {
        const user = rooms.get(key)?.users.find( u => u.name === user_name);
        if(user) {
            user.mute = ! user.mute;
        }
        io.to(key).emit("userMuteChange", user_name);
    })
    socket.on("choseProblem", ({ key, problem_id }) => {
        io.to(key).emit("selectProblem", problem_id);
    })

})

