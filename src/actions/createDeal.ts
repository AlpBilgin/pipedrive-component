import { isUndefined } from 'lodash';
import Axios from 'axios';
import * as util from "util";

exports.process = createDeal;

export interface CreateDealConfig {
    token: string;
    company_domain: string;
}

export interface CreateDealInMessage {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    role: string;
    company: string;
    company_size: string;
    message: string;
}

export interface CreateDealOutMessage {
    deal_id: number;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    role: string;
    company: string;
    company_size: string;
    message: string;
}

/**
 * createDeal creates a new deal. It will also create a contact person,
 * an organisation and a note.
 *
 * @param msg incoming messages which is empty for triggers
 * @param cfg object to retrieve triggers configuration values
 * @param snapshot the scratchpad for persitence between execution runs
 * 
 * @returns promise resolving a message to be emitted to the platform
 */
export async function createDeal(msg: elasticionode.Message, cfg: CreateDealConfig, snapshot: any): Promise<CreateDealOutMessage> {
    console.log('Msg content:');
    console.log(msg);
    console.log('Cfg content:');
    console.log(cfg);
    console.log('snapshot content:');
    console.log(snapshot);

    // Generate the config for https request
    if (isUndefined(cfg)) {
        throw new Error('cfg is undefined');
    }
    if (isUndefined(cfg.token)) {
        throw new Error('API token is undefined');
    }
    if (isUndefined(cfg.token)) {
        throw new Error('API token is undefined');
    }

    // Data
    let data = <CreateDealInMessage>msg.body;
    cfg.token = cfg.token.trim();
    cfg.company_domain = cfg.company_domain.trim();

    let axios = Axios.create({
        baseURL: 'https://' + cfg.company_domain + '.pipedrive.com/v1',
        params: { 'api_token': cfg.token }
    });

    // Create Organisation
    console.log('Creating organisation: ' + data.company);
    let organisation = {
        name: data.company,
    } as Organisation;

    let response = await axios.post('/organisations', organisation, { responseType: 'json' });
    let result = <APIResult>response.data;
    if (!result.success) {
        throw new Error('could not create company');
    }
    organisation = <Organisation>result.data;
    console.log('Created company: ' + organisation);

    // Create Person
    console.log('Creating person: ' + data.contact_name);
    let person = {
        name: data.contact_name,
        email: new Array<string>(data.contact_email),
        phone: new Array<string>(data.contact_phone),
        org_id: organisation.id,
    } as Person;

    response = await axios.post('/persons', person, { responseType: 'json' });
    result = <APIResult>response.data;
    if (!result.success) {
        throw new Error('could not create person');
    }
    person = <Person>result.data;
    console.log('Created person: ' + person);

    // Create Deal
    console.log('Creating deal: ');
    let deal = {
        title: 'Website: ' + data.company,
        person_id: person.id,
        org_id: organisation.id,
        status: Status.Open,
    } as Deal;

    response = await axios.post('/deals', deal, { responseType: 'json' });
    result = <APIResult>response.data;
    if (!result.success) {
        throw new Error('could not create deal');
    }
    deal = <Deal>result.data;
    console.log('Created deal: ' + deal);

    // Create Note
    console.log('Creating note: ');
    let note = {
        deal_id: deal.id,
        content: util.format(`
        Deal generated by the website:

        Lead's name: {0}
        Contact email: {1}
        Contact phone number: {2}
        Role: {3}
        Company: {4}
        Size of the company: {5}
        
        Submitted message:
        {6}
        `, data.contact_name, data.contact_email, data.contact_phone, data.role, data.company, data.company_size, data.message),
    } as Note;

    response = await axios.post('/notes', note, { responseType: 'json' });
    result = <APIResult>response.data;
    if (!result.success) {
        throw new Error('could not create note');
    }
    note = <Note>result.data;
    console.log('Created note: ' + note);

    // Return message
    let ret = <CreateDealOutMessage>data;
    ret.deal_id = deal.id;
    return ret;
}

export enum Visiblity { OwnerAndFollowers = 1, EntireCompany = 3 }
export enum Status { Open = 'Open', Won = 'Won', Lost = 'Lost' }

export interface Organisation {
    id: number;
    name: string;
    owner_id: number;
    org_id: number;
    email: Array<string>;
    phone: Array<string>;
    visible_to: Visiblity;
    add_time: string;
}

export interface Person {
    id: number;
    name: string;
    owner_id: number;
    org_id: number;
    email: Array<string>;
    phone: Array<string>;
    visible_to: Visiblity;
    add_time: string;
}

export interface Deal {
    id: number;
    title: string;
    value: number;
    currency: string;
    user_id: string;
    person_id: number;
    org_id: number;
    stage_id: number;
    status: Status;
    lost_reason: string;
    visible_to: Visiblity;
    add_time: string;
}

export interface Note {
    id: number;
    content: string;
    deal_id: number;
    person_id: number;
    org_id: number;
}

export interface APIResult {
    success: boolean;
    data: any;
    related_objects: any;
}