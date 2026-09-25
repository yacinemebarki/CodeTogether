import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-room',
  imports: [FormsModule],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room {
  time: number = 0;
  code = 'abcdeft';
  isClicked = false;
  selectedLanguage = '';

  constructor(private cdr: ChangeDetectorRef) {}


  copie(){
    navigator.clipboard.writeText(this.code);
    this.isClicked = true;

    setTimeout(() => {
        this.isClicked = false;
        this.cdr.markForCheck();
    }, 300);
  }

  ShowProblem(){

  }

  ShowList(){

  }

  ToChat(){

  }

  ToMember(){

  }
}
