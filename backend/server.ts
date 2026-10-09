import { RunResult } from './../frontend/src/app/interfaces/Problem';
import express from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Room } from "./Room";
import { User } from '../frontend/src/app/interfaces/User';
import { Server } from "socket.io";
import http from "http";
import { runCode } from './execution/runCode';
import { Language } from './../frontend/src/app/interfaces/Problem';

const app = express();

const allowedOrigins = [
    "http://localhost:4200",
    "https://code-together-lovat.vercel.app"
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins
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
    const user: User = {name: user_name, role: "owner", color: color, mute: false, mutedByOwner: false, socketId: ''};

    const users: User[] = [];
    users.push(user);

    const room: Room = {
        key: key,
        owner: user,
        users: users,
        code: ''
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
    if(!room){
        return;
    }

    if(room?.users.length <= 0){
        return res.json({
            success: false,
            message: "this room dosnt exist anymore you need to create a new one"
        })
    }
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

    const user: User = {name: user_name, role: "viewer", color: color, mute: false, mutedByOwner: false, socketId: ''};

    room?.users.push(user);

    return res.json({
        success: true,
        room: room,
        current_user: user
    })

})

io.on("connection", (socket) => {
    socket.on("createRoom", ({ key, user_name }) => {
        const room = rooms.get(key);
        if(!room){
            return;
        }
        const user = room.users.find(u => u.name === user_name);

        if(!user){
            return;
        }

        user.socketId = socket.id;
        socket.join(key);

        io.to(key).emit("roomUpdated", room.users);
    })
    socket.on("joinRoom", ({ key, user_name }) => {
        const room = rooms.get(key);
        if(!room){
            return;
        }

        const user = room.users.find(u => u.name === user_name);

        if (!user) {
            return;
        }

        user.socketId = socket.id;

        socket.join(key);

       

        io.to(key).emit("roomUpdated", { 
            code: room.code,
            users: room.users
        });
    })
    socket.on("disconnect", () => {
        for(const [key, room] of rooms){
            const user = room.users.find(u => u.socketId === socket.id);
            if(!user){
                continue;
            }
            room.users = room.users.filter( u => u.socketId !== socket.id);
            const code = room.code;
            let users = room.users;
            io.to(key).emit("roomUpdated", { code , users});
            console.log(`${user.name} disconnected from ${key}`); 
            if(room.users.length <= 0){
                rooms.delete(key);
                console.log(`Room ${key} deleted`);
                return;
            }  
            if(user.role === "owner"){
                room.users[0].role = "owner";   
            }
            users = room.users;
            io.to(key).emit("roomUpdated", { code, users});
            break;
        }

    });

    socket.on("sendMessage", ({ key, message }) => {
        io.to(key).emit("newMessage", message);
    });
    socket.on("toggleMute", ( { key, user_name, MutedByOwner }) => {
        const user = rooms.get(key)?.users.find( u => u.name === user_name);
        if(user) {
            user.mute = ! user.mute;
            user.mutedByOwner = MutedByOwner;
        }
        io.to(key).emit("userMuteChange", { user_name, MutedByOwner });
    })
    socket.on("choseProblem", ({ key, problem_id }) => {
        console.log("the porblem is in backend", problem_id);
        io.to(key).emit("selectProblem", problem_id);
    })
    socket.on("kickUser", ({ key, user_name }) => {
        const room = rooms.get(key);
        console.log(room);
        if(!room){
            return;
        }

        const kickedUser = room.users.find( u => u.name === user_name );
        console.log("kickedUser", kickedUser);
        if(!kickedUser){
            return;
        }

        io.to(kickedUser.socketId).emit("kicked");

        room.users = room.users.filter(u => u.name !== user_name);

        io.to(key).emit("kickedUser", { user_name });
    })
    socket.on("changeRole", ({ key, user_name, role}) => {
        const room = rooms.get(key);
        if(!room){
            return;
        }
        const targetUser = room.users.find( user => user.name === user_name);
        if(!targetUser){
            return;
        }

        targetUser.role = role;

        io.to(key).emit("roleChanged", { user_name, role});
    })
    socket.on('webrtc-offer', ({ key, offer }) => {
        socket.to(key).emit('webrtc-offer', offer);
    })
    socket.on('webrtc-answer', ({ key, answer }) => {
        socket.to(key).emit('webrtc-answer', answer);
    })
    socket.on('ice-candidate', ({ key, candidate }) => {
        console.log("candidate", candidate);
        socket.to(key).emit('ice-candidate', candidate);
    })
    socket.on("changeCode", ({ key, changes, code}) => {
        const room = rooms.get(key);
        if(!room){
            return;
        }
        room.code = code;
        socket.to(key).emit("codeChanged", { changes, code });
    })
    socket.on("runCode",async ({ key, code, language, problemId }) => {
        const room = rooms.get(key);
        if(!room){
            return;
        }
        room.code = code;

        io.to(key).emit("codeRunned", ({ language, code }));

        const result: RunResult = await runCode(code, language, problemId, problems);
        console.log("result", result);
        io.to(key).emit("runResult", result);
    })
    socket.on("changeLanguage",({ key, language }: { key: string; language: Language }) => {
        const room = rooms.get(key);
        if (!room) return;
        io.to(key).emit("languageChanged", { language });
    });
})
