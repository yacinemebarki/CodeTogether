import { Message } from './../interfaces/Message';
import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Problem, TestCase } from '../interfaces/Problem';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../config';
import { CommonModule } from '@angular/common';
import { TestStats } from '../interfaces/TestStats';
import { User } from '../interfaces/User';
import { CreateResponse } from '../interfaces/CreateResponse';
import { Router } from '@angular/router';
import { SocketService } from '../socket_service';

@Component({
  selector: 'app-room',
  imports: [FormsModule, CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room {
  time: number = 0;
  key = '';
  isClicked = false;
  selectedLanguage = 'cpp';
  ActiveProblemTab = 'problems';
  MemberTab = 'Chat';
  problems: Problem[] = [];
  SelectedProblem: Problem | null = null;
  code = '';
  RunMessage = '2/3 passed'
  stats: TestStats = {RunTime: 0, memory: 0};
  current_user: User = { name: '', role: '', color: '', mute: false, mutedByOwner: false};
  selectedMember: User | null = null;
  showRoles = false;

  users: User[] = [];

  messages: Message[] = [];
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private route: Router, private socket: SocketService) {
    const navigation = this.route.getCurrentNavigation();    
    const room = navigation?.extras.state?.['room'];
    const current_user = navigation?.extras.state?.['current_user'];
    this.current_user = current_user;
    this.key = room.key;
    this.users = room.users;
   }

  ngOnInit() {
    this.http.get<Problem[]>(`${API_BASE}/api/problems`).subscribe(ProblemData => {
      this.problems = ProblemData;
      this.SelectedProblem = this.problems[0];
    })

    this.socket.emit("joinRoom", {
      key: this.key
    })

    this.socket.on("roomUpdated", (users: User[]) => {
      this.users = users;
      this.cdr.detectChanges();
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
    const input = document.querySelector('.message-field') as HTMLInputElement;
    const text = input.value;

    const message: Message = {message: text, user: this.current_user};
    input.value = '';

    this.http.post<CreateResponse>(`${API_BASE}/api/message_sent`, message).subscribe({ next: response => {
      if(!response.success){
        console.log(response.message);
      }
    }}) 
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
    SelectedMember.role = role;
  }

  CloseSettings(){
    this.selectedMember = null;
    this.showRoles = false;
  }

}
