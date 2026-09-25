import { Routes } from '@angular/router';
import { Room } from './room/room';
import { LandingPage } from './landing-page/landing-page';

export const routes: Routes = [
    {path: '', component: LandingPage},
    {path: 'room', component: Room}
];
