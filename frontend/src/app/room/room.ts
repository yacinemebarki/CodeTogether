import { Message } from './../interfaces/Message';
import { afterNextRender, Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Problem, RunResult, TestCase } from '../interfaces/Problem';
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
  editorReady = false;
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
  languageSupportNotice = '';
  current_user: User = { name: '', role: '', color: '', socketId: ''};
  selectedMember: User | null = null;
  showRoles = false;
  private applyingRemoteChanges = false;
  users: User[] = [];
  editor: any;
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
    this.languageSupportNotice = '';
    if(! this.SelectedProblem){
      alert("you should choise problem");
      return;
    }
    this.code = this.SelectedProblem.starterCode[this.selectedLanguage];
    this.editorOptions = {
      ...this.editorOptions,
      language: this.selectedLanguage
    };
    this.socket.emit("changeLanguage", {
      key: this.key,
      language: this.selectedLanguage
    });
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
    afterNextRender(() => {
      this.editorReady = true;
    });

    const navigation = this.route.getCurrentNavigation();    
    const room = navigation?.extras.state?.['room'];
    const current_user = navigation?.extras.state?.['current_user'];
    if (room && current_user) {
      this.current_user = current_user;
      this.key = room.key;
      this.users = room.users ?? [];
    } else {
      if (typeof window !== 'undefined') {
        this.route.navigate(['/']);
      }
    }
  }
  async ngOnInit() {
    if (typeof window === 'undefined') {
      return;
    }
    this.http.get<Problem[]>(`${API_BASE}/api/problems`).subscribe(ProblemData => {
      this.problems = ProblemData;
      this.SelectedProblem = this.problems[0];
    })
    this.socket.emit("joinRoom", {
      key: this.key,
      user_name: this.current_user.name,
    })

    this.socket.on("roomUpdated", (data: {code: string, users: User[]}) => {
      console.log("Updated users:", data.users);
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
    this.socket.on("codeRunned", (Data: {language: Language, code: string}) => {
      console.log("the data sent in the codeRunned", Data);
      this.selectedLanguage = Data.language;
      this.code = Data.code;
      this.editor.updateOptions({
        readOnly: true
      })
    })
    this.socket.on("runResult", (result: RunResult) => {
      console.log("the result", result);
      this.editor.updateOptions({
        readOnly: this.current_user.role === 'viewer'
      });

      this.RunMessage = result.stdout;
      if (result.timeMs !== undefined) {
        this.stats.RunTime = result.timeMs;
      }

      if (this.SelectedProblem?.test_cases && result.cases) {

        this.SelectedProblem.test_cases.forEach((test: any, i: number) => {
          const testResult = result.cases[i];

          if (testResult) {
            test.user_output = testResult.actual;
            test.passed = testResult.passed;
          }
        });
      }
      this.cdr.detectChanges();
      
    });
    this.socket.on("languageChanged", ( language: { language: Language }) => {
      this.selectedLanguage = language.language;

      if (this.SelectedProblem) {
        this.code = this.SelectedProblem.starterCode[language.language];
      }

      this.editorOptions = {
        ...this.editorOptions,
        language: language.language
      };
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
    if (this.selectedLanguage !== 'c') {
      this.languageSupportNotice = 'Only C code can be run in this project. Please select C and try again.';
      this.cdr.detectChanges();
      return;
    }

    this.languageSupportNotice = '';
    if(!this.SelectedProblem){
      alert("you should chose first a problem");
      return;
    }
    if(this.current_user.role === "viewer"){
      alert("you cant run or submit code");
      return;
    }

    console.log(`role user ${this.current_user.role} the code sent ${this.code}`);
    this.socket.emit("runCode", {
      key: this.key,
      code: this.code,
      language: this.selectedLanguage,
      problemId: this.SelectedProblem.id
    })
  }

  SubmitCode(){

  }

  SentMessage(){
    const input = document.querySelector('.message-field') as HTMLInputElement;
    const text = input.value;
    if(text.trim() === "") {
      return;
    }

    const message: Message = {message: text, user: this.current_user};
    input.value = '';

    this.socket.emit("sendMessage", {
      key: this.key,
      message: message
    });
  }

  ShowSettings(user: User){
    this.selectedMember = user;
    this.showRoles = false;
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


}