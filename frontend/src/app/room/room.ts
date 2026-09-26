import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Problem, TestCase } from '../interfaces/Problem';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../config';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-room',
  imports: [FormsModule, CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room {
  time: number = 0;
  code = 'abcdeft';
  isClicked = false;
  selectedLanguage = 'cpp';
  ActiveProblemTab = 'problems';
  MemberTab = 'Chat';
  problems: Problem[] = [];
  SelectedProblem: Problem | null = null;

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

  ngOnInit(){
    this.http.get<Problem[]>(`${API_BASE}/api/problems`).subscribe(ProblemData => {
      this.problems = ProblemData;
      this.SelectedProblem = this.problems[0];
    })
  }

  copie(){
    navigator.clipboard.writeText(this.code);
    this.isClicked = true;

    setTimeout(() => {
        this.isClicked = false;
        this.cdr.markForCheck();
    }, 300);
  }

  ShowProblem(){
    this.ActiveProblemTab = "description";
    this.cdr.markForCheck();
  }

  ShowList(){
    this.ActiveProblemTab = "problems";
    this.cdr.markForCheck();
  }

  ToChat(){
    this.MemberTab = "Chat";
    this.cdr.markForCheck();
  }

  ToMember(){
    this.MemberTab = "Member";
    this.cdr.markForCheck();
  }
}
