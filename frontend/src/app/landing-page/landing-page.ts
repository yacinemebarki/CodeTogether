import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_BASE } from '../config';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CreateResponse } from '../interfaces/CreateResponse';

@Component({
  selector: 'app-landing-page',
  imports: [FormsModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage {
  stats: number = 0;
  user_name_create = '';
  user_name_join = ''
  key = '';

  constructor(private http: HttpClient, private route: Router){}

  create(){
    if(this.user_name_create == ''){
      alert("you should enter a user name");
      return;
    }   

    const CreateData = {
      user_name: this.user_name_create
    }

    this.http.post<CreateResponse>(`${API_BASE}/api/createRoom`, CreateData).subscribe(response => {
      if(!response.success){
        alert(response.message);
        return;
      }
      this.route.navigate(['/Room'], {
        state: {
          room: response.room,
          current_user: response.current_user
        }
        
      })
    })
  }
  
  join(){
    if(this.user_name_join == ''){
      alert("you should enter a user name");
      return;
    }
    if(this.key == ''){
      alert("you should paste a key");
      return;
    }
    const JoinData = {
      user_name: this.user_name_join,
      key: this.key
    }
    this.http.post<CreateResponse>(`${API_BASE}/api/joinRoom`, JoinData).subscribe(response => {
      if(!response.success){
        alert(response.message);
      }
      this.route.navigate(['/Room'], {
        state: {
          room: response.room,
          current_user: response.current_user
        }
      })    
    })
  }
  
}
