import { SingleClientData } from './singleClientData'

export interface GetClientListResponse {
  get_clientlist: {
    maclist: string[];
    ClientAPILevel: string;
    [key: string]: SingleClientData | undefined | string[] | string;
  };
}
