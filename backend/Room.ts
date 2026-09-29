import { User } from './../frontend/src/app/interfaces/User';
export interface Room{
    key: string;
    owner: User;
    users: User[];
}