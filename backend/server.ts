import { API_BASE } from './../frontend/src/app/config';
import express from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Room } from "./Room";
import { User } from '../frontend/src/app/interfaces/User';

const app = express();

app.use(cors({
    origin: 'http://localhost:4200'
}));
app.use(express.json());

const PORT = 3000;

app.listen(PORT, () =>{
    console.log(`server is runni g ${PORT}`);
})

app.get("/", (req, res) =>{
    res.send("CodeTogether api is running");
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

app.get(`${API_BASE}/api/problems`,(req, res) => {
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

app.get(`${API_BASE}/api/createRoom`, (req, res) => {
    const { user_name } = req.body;

    let key = '';
    do{
        key = generateRoomId();
    }while(rooms.has(key))

    const color = generateRandomColor();    
    const user: User = {name: user_name, role: "owner", color: color, mute: false, mutedByOwner: false};

    const users: User[] = [];
    users.push(user);

    rooms.set(key, {
        key: key,
        owner: user,
        users: users
    })

})

