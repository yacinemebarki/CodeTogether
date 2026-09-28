import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_BASE } from '../config';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CreateResponse } from '../interfaces/CreateResponse';
import { response } from 'express';

@Component({
  selector: 'app-landing-page',
  imports: [FormsModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage {
  stats: number = 0;
  user_name = '';
  key = '';

  constructor(private http: HttpClient, private route: Router){}

  create(){
    if(this.user_name == ''){
      alert("you should enter a user name");
      return;
    }   

    const CreateData = {
      user_name: this.user_name
    }

    this.http.post<CreateResponse>(`${API_BASE}/api/createRoom`, CreateData).subscribe(response => {
      if(!response.success){
        alert(response.message);
        return;
      }
    })
  }
  
  join(){
    if(this.user_name == ''){
      alert("you should enter a user name");
      return;
    }
    if(this.key == ''){
      alert("you should paste a key");
      return;
    }
    const JoinData = {
      user_name: this.user_name,
      key: this.key
    }
    this.http.post<CreateResponse>(`${API_BASE}/api/joinRoom`, JoinData).subscribe(response => {
      if(!response.success){
        alert(response.message);
      }
    })
  }
  
}
