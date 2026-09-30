import { Injectable } from '@angular/core';
import { io, Socket} from 'socket.io-client';
@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor(){
    this.socket = io('http://localhost:3000');
  }

  emit(event: string, data: any){
    this.socket.emit(event, data);
  }

  on(event: string, callBack: (data: any) => void) {
    this.socket.on(event, callBack);
  }
}
