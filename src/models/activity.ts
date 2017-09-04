import { Done } from './enums';

export class Activity {
    subject: string;
    done: Done;
    type: string;
    deal_id: number;
    person_id: number;
    org_id: number;
    user_id: number;
}