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
import { channel } from 'diagnostics_channel';

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
  current_user: User = { name: '', role: '', color: '', mute: false, mutedByOwner: false, socketId: ''};
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
      key: this.key,
      user_name: this.current_user.name
    })

    this.socket.on("roomUpdated", (users: User[]) => {
      this.users = users;
      const updatedUser = users.find(u => u.name === this.current_user.name);

      if (updatedUser) {
        this.current_user = updatedUser;
      }

      this.cdr.detectChanges();
    })

    this.socket.on("newMessage", (message: Message) => {
      this.messages.push(message);
      this.cdr.detectChanges();
    })

    this.socket.on("userMuteChange", (data: { user_name: string, MutedByOwner: boolean }) => {
      const ChangeUser = this.users.find( u => u.name === data.user_name);

      if(ChangeUser){
        ChangeUser.mute = ! ChangeUser.mute;
        ChangeUser.mutedByOwner = data.MutedByOwner;
        this.cdr.detectChanges();
      }
      if(ChangeUser?.name === this.current_user.name){
        this.current_user.mute = ChangeUser.mute;
        this.current_user.mutedByOwner = data.MutedByOwner;
        this.cdr.detectChanges();
      }
    })

    this.socket.on("selectProblem", (problem_id: number) => {
      const problem = this.problems.find( pro => pro.id === problem_id);
      console.log(problem);
      if(problem){
        this.SelectedProblem = problem;
        this.cdr.detectChanges();
      }   
    })

    this.socket.on("kicked", () => {
      this.route.navigate(['/']);
      alert("You have been kicked from the room.");
    })
    this.socket.on("kickedUser", ({ user_name }) => {
      this.users = this.users.filter( user => user.name !== user_name);     
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
    if(this.current_user.role != "owner"){
      alert("only admin can chose problem");
      return;
    }
    this.ActiveProblemTab = "description";
    this.SelectedProblem = problem;
    this.socket.emit("choseProblem", {
      key: this.key,
      problem_id: this.SelectedProblem.id
    });
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

    this.socket.emit("sendMessage", {
      key: this.key,
      message: message
    });
  }

  toggleMute(user: User) {
    if (! (user.name === this.current_user.name)) {
      return;
    }
    if(this.current_user.mutedByOwner && this.current_user.role !== "owner"){
      alert("the owner of this room mute you");
      return;
    }
    

    this.socket.emit("toggleMute", { 
      key: this.key,
      user_name: this.current_user.name,
      MutedByOwner: this.current_user.mutedByOwner
    })
  }

  ShowSettings(user: User){
    this.selectedMember = user;
    this.showRoles = false;
  }

  MuteMember(SelectedMember: User) {
    const MuteBtn = document.querySelector('.MuteBtn') as HTMLElement | null;
    if (!MuteBtn) {
        return;
    }

    let mutedByOwner: boolean;
    if (SelectedMember.mute === false) {
        MuteBtn.textContent = "Unmute";
        mutedByOwner = true;

    } else {
        if (!SelectedMember.mutedByOwner) {
            alert("The user muted himself");
            return;
        }
        MuteBtn.textContent = "Mute";
        mutedByOwner = false;
    }
    this.socket.emit("toggleMute", {
        key: this.key,
        user_name: SelectedMember.name,
        MutedByOwner: mutedByOwner
    });
}

  KickMember(SelectedMember: User){
    this.socket.emit("kickUser", {
      key: this.key,
      user_name: SelectedMember.name
    })
  }

  ChangeRole(SelectedMember: User, role: string){
    SelectedMember.role = role;
  }

  CloseSettings(){
    this.selectedMember = null;
    this.showRoles = false;
  }

}
