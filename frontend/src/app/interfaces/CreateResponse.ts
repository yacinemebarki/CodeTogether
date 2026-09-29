import { Room } from "../room/room";
import { User } from "./User";

export interface CreateResponse{
    success: boolean;
    message: string;
    key: string;
    room: Room;
    current_user: User;
}