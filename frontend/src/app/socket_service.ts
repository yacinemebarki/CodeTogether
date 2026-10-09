import { Injectable } from '@angular/core';
import { io, Socket} from 'socket.io-client';
import { API_BASE } from './config';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor(){
    this.socket = io(API_BASE);
  }

  emit(event: string, data: any){
    this.socket.emit(event, data);
  }

  on(event: string, callBack: (data: any) => void) {
    this.socket.on(event, callBack);
  }
}
