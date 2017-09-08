import { isUndefined, isFinite, toNumber } from "lodash";

import { Deal } from "../models/deal";
import { Status } from "../models/enums";
import { PipedriveMessage } from "../models/pipedriveMessage";

import { ComponentConfig } from "../models/componentConfig";

import { APIClient } from "../apiclient";

exports.process = createDeal;

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
export async function createDeal(msg: elasticionode.Message, cfg: ComponentConfig, snapshot: any): Promise<PipedriveMessage> {
    console.log("Msg content:");
    console.log(msg);
    console.log("Cfg content:");
    console.log(cfg);
    console.log("snapshot content:");
    console.log(snapshot);

    // Get the input data
    let data = <PipedriveMessage>msg.body;

    if (data.deal_id) {
        console.log("Deal_id " + data.deal_id + " already exists");
        return data;
    }

    // Generate the config for https request
    if (isUndefined(cfg)) {
        throw new Error("cfg is undefined");
    }
    if (isUndefined(cfg.token)) {
        throw new Error("API token is undefined");
    }
    if (isUndefined(cfg.company_domain)) {
        throw new Error("Company domain is undefined");
    }

    // Client init
    cfg.token = cfg.token.trim();
    cfg.company_domain = cfg.company_domain.trim();
    let client = new APIClient(cfg.company_domain, cfg.token);

    let ownerId = toNumber(cfg.owner_id);
    let ownerIdFlag = isFinite(ownerId);

    // Create Deal
    console.log("Creating deal: ");
    let deal = {
        title: data.deal_title,
        currency: data.deal_currency,
        person_id: data.person_id,
        org_id: data.org_id,
        status: Status.Open,
    } as Deal;

    // Check availability of other owner_id definitions
    if (data.owner_id) {
        deal.user_id = data.owner_id;
    } else if (ownerIdFlag) {
        deal.user_id = ownerId;
    }

    deal = await client.createDeal(deal);
    console.log("Created deal: " + deal.title);

    // Return message
    let ret = <PipedriveMessage>data;
    ret.deal_id = deal.id;
    return ret;
}
