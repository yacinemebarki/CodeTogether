import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Problem, TestCase } from '../interfaces/Problem';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../config';
import { CommonModule } from '@angular/common';
import { TestStats } from '../interfaces/TestStats';
import { User } from '../interfaces/User';
import { Message } from '../interfaces/Message';


@Component({
  selector: 'app-room',
  imports: [FormsModule, CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room {
  time: number = 0;
  key = 'abcdeft';
  isClicked = false;
  selectedLanguage = 'cpp';
  ActiveProblemTab = 'problems';
  MemberTab = 'Chat';
  problems: Problem[] = [];
  SelectedProblem: Problem | null = null;
  code = '';
  RunMessage = '2/3 passed'
  stats: TestStats = {RunTime: 0, memory: 0};
  current_user: User = { name: 'Yacine', role: 'owner', color: '#818CF8', mute: false};
  selectedMember: User | null = null;
  showRoles = false;

  users: User[] = [
    {
        name: "Yacine",
        role: "owner",
        color: "#818CF8",
        mute: false
    },
    {
        name: "Ahmed",
        role: "editor",
        color: "#4ADE80",
        mute: true
    },
    {
        name: "Sara",
        role: "viewer",
        color: "#FBBF24",
        mute: false
    }
];

  messages: Message[] = [];
  test_messages: Message[] = [
    {
        message: "Hey everyone!",
        user: {
            name: "Yacine",
            color: "#818CF8",
            role: "editor",
            mute: true
        }
    },
    {
        message: "Hello! I'm joining the room now.",
        user: {
            name: "Ahmed",
            color: "#4ADE80",
            role: "viewer",
            mute: false
        }
    },
    {
        message: "Which problem are we solving?",
        user: {
            name: "Sara",
            color: "#FBBF24",
            role: "owner",
            mute: false
        }
    },
    {
        message: "Let's try First Missing Positive.",
        user: {
            name: "Yacine",
            color: "#818CF8",
            role: "editor",
            mute: true
        }
    },
    {
        message: "Sounds good 👍",
        user: {
            name: "Mohamed",
            color: "#F87171",
            role: "owner",
            mute: true
        }
    },
    {
        message: "I think we should first discuss the O(n) solution.",
        user: {
            name: "Sara",
            color: "#FBBF24",
            role: "owner",
            mute: false
        }
    }
];
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) { }

  ngOnInit() {
    this.http.get<Problem[]>(`${API_BASE}/api/problems`).subscribe(ProblemData => {
      this.problems = ProblemData;
      this.SelectedProblem = this.problems[0];
    })
  }

  copie() {
    navigator.clipboard.writeText(this.key);
    this.isClicked = true;

    setTimeout(() => {
      this.isClicked = false;
      this.cdr.markForCheck();
    }, 300);
  }

  ShowProblem() {
    this.ActiveProblemTab = "description";
    this.cdr.markForCheck();
  }

  ShowList() {
    this.ActiveProblemTab = "problems";
    this.cdr.markForCheck();
  }

  SelectProblem(problem: Problem){
    this.SelectedProblem = problem;
    this.ActiveProblemTab = "description";
    this.cdr.markForCheck();
  }

  ToChat() {
    this.MemberTab = "Chat";
    this.cdr.markForCheck();
  }

  ToMember() {
    this.MemberTab = "Member";
    this.cdr.markForCheck();
  }

  RunCode(){

  }

  SubmitCode(){

  }

  SentMessage(){

  }

  toggleMute(user: User) {
    if (user === this.current_user) {
        user.mute = !user.mute;
    }
  }

  ShowSettings(user: User){
    this.selectedMember = user;
    this.showRoles = false;
  }

  MuteMember(SelectedMember: User){

  }

  KickMember(SelectedMember: User){

  }

  ChangeRole(SelectedMember: User, role: string){

  }

  CloseSettings(){
    this.selectedMember = null;
    this.showRoles = false;
  }

}
