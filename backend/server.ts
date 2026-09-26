import express from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';

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

