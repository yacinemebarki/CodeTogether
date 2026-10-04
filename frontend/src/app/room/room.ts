import { Message } from './../interfaces/Message';
import { Component, OnInit } from '@angular/core';
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
import { eventNames, off } from 'process';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { Language } from '../interfaces/Problem';

@Component({
  selector: 'app-room',
  imports: [FormsModule, CommonModule, EditorComponent],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room{
  time: number = 0;
  key = '';
  isClicked = false;
  selectedLanguage: Language = 'cpp';
  ActiveProblemTab = 'problems';
  MemberTab = 'Chat';
  problems: Problem[] = [];
  SelectedProblem: Problem | null = null;
  code = '';
  RunMessage = 'you didnt run your code yet'
  stats: TestStats = {RunTime: 0, memory: 0};
  current_user: User = { name: '', role: '', color: '', mute: false, mutedByOwner: false, socketId: ''};
  selectedMember: User | null = null;
  showRoles = false;
  private peer!: RTCPeerConnection;
  private localStreem!: MediaStream;
  private applyingRemoteChanges = false;
  users: User[] = [];
  editor: any;
  remoteAUdio = new Audio();
  editorOptions = {
    them: 'vs-dark',
    language: this.selectedLanguage,
    insertSpaces: true,
    fontSize: 14,
    tabSize: 4,
    wordWarp: 'on',
    scrollBeyondLastLine: false,
    automaticLayou: true,
    minimap: {
      enabled: true
    }
  };
  updateEditorPermission() {
    this.editor.updateOptions({
      readOnly: this.current_user.role === 'viewer'
    });
  }

  updateCode(){
    if(! this.SelectedProblem){
      alert("you should choise problem");
      return;
    }
    this.code = this.SelectedProblem.starterCode[this.selectedLanguage];
    this.editorOptions = {
      ...this.editorOptions,
      language: this.selectedLanguage
    };
  }

  onEditorInit(editor: any){
    this.editor = editor;

    this.updateEditorPermission();
    editor.onDidChangeModelContent((event: any) => {
      if (this.applyingRemoteChanges) {
        return;
      }

      this.socket.emit("changeCode", {
        key: this.key,
        changes: event.changes,
        code: editor.getValue()
      });
    })
  }

  messages: Message[] = [];
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private route: Router, private socket: SocketService) {
    const navigation = this.route.getCurrentNavigation();    
    const room = navigation?.extras.state?.['room'];
    const current_user = navigation?.extras.state?.['current_user'];
    this.current_user = current_user;
    this.key = room.key;
    this.users = room.users;
   }

  async ngOnInit() {
    this.http.get<Problem[]>(`${API_BASE}/api/problems`).subscribe(ProblemData => {
      this.problems = ProblemData;
      this.SelectedProblem = this.problems[0];
    })
    await this.startVoice();
    await this.createOffer();

    this.socket.emit("joinRoom", {
      key: this.key,
      user_name: this.current_user.name,
    })

    this.socket.on("roomUpdated", (data: {code: string, users: User[]}) => {
      this.users = data.users;
      const updatedUser = data.users.find(u => u.name === this.current_user.name);
      this.code = data.code

      if (updatedUser) {
        this.current_user = updatedUser;
        this.updateEditorPermission();
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
    this.socket.on("roleChanged", (data: { user_name: string, role: string }) => {
      const targetUser = this.users.find(user => user.name === data.user_name);
      if(!targetUser){
        return;
      }
      targetUser.role = data.role;
      this.updateEditorPermission();
      this.cdr.detectChanges();
    })
    this.socket.on('webrtc-offer',async (offer) => {
      await this.peer.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this.peer.createAnswer();

      this.socket.emit('webrtc-answer', {
        key: this.key,
        answer: answer
      })
    })
    this.socket.on('webrtc-answer', async (answer) => {
      await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
    })
    this.socket.on('ice-candidate', async (candidate) => {
      await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
    })
    this.socket.on("codeChanged", ({ changes, code }: { changes: any[]; code: string }) => {
      if (!this.editor) {
        this.code = code;
        return;
      }

      this.applyingRemoteChanges = true;
      try {
        this.editor.executeEdits("remote-change", changes.map((change: any) => ({
          range: change.range,
          text: change.text
        })));
        if (this.editor.getValue() !== code) {
          this.editor.setValue(code);
        }
      } finally {
        this.applyingRemoteChanges = false;
      }
    })
    this.socket.on("initialCode", ({ code }) => {
      this.code = code;
    });
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
    this.updateCode();
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
    this.socket.emit("changeRole", {
      key: this.key,
      user_name: SelectedMember.name,
      role: role
    })
  }

  CloseSettings(){
    this.selectedMember = null;
    this.showRoles = false;
  }

  async startVoice(){
    this.localStreem = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    if(this.current_user.mute === true){
      this.localStreem.getAudioTracks()[0].enabled = false;
    }

    this.peer = new RTCPeerConnection();

    this.localStreem.getTracks().forEach(track => {
      this.peer.addTrack(track, this.localStreem);
    });

    this.peer.ontrack = (event) => {
      console.log("REMOTE TRACK:", event.streams[0]);
      const audio = document.getElementById('remoteAudio') as HTMLAudioElement;
      const remoteStream = event.streams[0];
      audio.srcObject = remoteStream;
      audio.autoplay = true;

      audio.play()
        .then(() => {
          console.log("Remote audio playing");
        })
        .catch(err => {
          console.error("Audio playback failed:", err);
        });

    };

    this.peer.onicecandidate = (event) => {
      if(event.candidate){
        console.log("candidate", event.candidate);
        this.socket.emit("ice-candidate", {
          key: this.key,
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          }
        })
      }
    }
  }

  async createOffer(){
    const offer = await this.peer.createOffer();

    await this.peer.setLocalDescription(offer);

    this.socket.emit('webrtc-offer', {
      key: this.key,
      offer: offer
    })
  }

}
