import fetch, { HeaderInit, Response } from 'node-fetch';
import { Agent } from 'https';
import { Client, ClientList, DeviceAction, GetClientListResponse } from './Models';

export * from './Models';

export class NodeMerlinWrtApi {
  private _authToken: string = '';
  private readonly _agent: Agent;
  private readonly _basicAuth: string;
  private _clientList: ClientList | undefined;

  public constructor(
    private _username: string,
    private _password: string,
    private _routerAddress: string,
    ignoreSSL: boolean = false,
  ) {
    this._agent = new Agent({ rejectUnauthorized: !ignoreSSL });
    this._basicAuth = Buffer.from(`${this._username}:${this._password}`).toString('base64');
  }

  public async getAuthToken(forceNew: boolean = false): Promise<string> {
    if (!forceNew && this._authToken !== '') {
      return this._authToken;
    }
    const loginData: { [name: string]: string } = {
      current_page: 'Main_Login.asp',
      login_authorization: this._basicAuth,
    };

    const response: Response = await fetch(`${this._routerAddress}/login.cgi`, {
      agent: this._agent,
      method: 'POST',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        referer: `${this._routerAddress}/Main_Login.asp`,
        connection: 'close',
      },
      body: NodeMerlinWrtApi.getFormData(loginData),
    });
    const cookieHeader: string = response.headers.get('Set-Cookie') ?? '';
    const behindAsusToken: string = cookieHeader.split('asus_token=')[1] ?? '';
    const asusToken: string = behindAsusToken.split(';')[0] ?? '';
    this._authToken = asusToken;
    return asusToken;
  }

  public async getClientList(): Promise<ClientList> {
    const requestData = {
      hook: 'get_clientlist()',
    };
    return new Promise<ClientList>(async (res, rej) => {
      const response: Response = await fetch(
        `${this._routerAddress}/appGet.cgi?${NodeMerlinWrtApi.getFormData(requestData)}`,
        {
          agent: this._agent,
          method: 'GET',
          headers: await this.getDefaultHeader(),
          body: undefined,
        },
      );
      if (response.status !== 200) {
        rej(`GetClientList failed with Status ${response.status}`);
        return;
      }
      let clientListResponse: GetClientListResponse;
      try {
        clientListResponse = (await response.json()) as GetClientListResponse;
      } catch (e) {
        rej(`GetClientList failed with non JSON Response`);
        return;
      }
      res(new ClientList(clientListResponse));
    });
  }

  /**
   * Retrieve the client information for a client identified by it's ip
   * @param {string} ip
   * @returns {Promise<Client | null>} Null means Client not found
   */
  public async getClientByIp(ip: string): Promise<Client | null> {
    return new Promise<Client | null>((res, rej) => {
      this.getClientList()
        .then((list) => {
          this._clientList = list;
          let target: Client | null = null;
          this._clientList.clients.forEach((client) => {
            if (client.rawData.ip === ip) {
              target = client;
              return false;
            }
          });
          res(target);
        })
        .catch((reason) => {
          rej(`Couldn't retrieve IP, reason: "${reason}"`);
        });
    });
  }

  public async performDeviceAction(client: Client, action: DeviceAction): Promise<boolean> {
    return await this.performDeviceActionByMac(client.rawData.mac, action);
  }

  public async performDeviceActionByMac(mac: string, action: DeviceAction): Promise<boolean> {
    const requestData = {
      device_list: mac,
      action_mode: action,
    };
    const response: Response = await fetch(
      `${this._routerAddress}/applyapp.cgi?${NodeMerlinWrtApi.getFormData(requestData)}`,
      {
        agent: this._agent,
        method: 'GET',
        headers: await this.getDefaultHeader('AiMesh.asp'),
        body: undefined,
      },
    );
    return response.status === 200;
  }

  public async logout(): Promise<void> {
    if (this._authToken === '') {
      return;
    }
    await fetch(`${this._routerAddress}/Logout.asp`, {
      agent: this._agent,
      method: 'GET',
      headers: await this.getDefaultHeader(),
      body: undefined,
    });
    this._authToken = '';
  }

  private async getDefaultHeader(referer: string = 'index.asp'): Promise<HeaderInit> {
    return {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      referer: `${this._routerAddress}/${referer}`,
      cookie: `asus_token=${await this.getAuthToken()}; HttpOnly;`,
      connection: 'close',
    };
  }

  private static getFormData(dict: { [name: string]: string }): string {
    const formParts: string[] = [];
    for (const property in dict) {
      const encodedKey: string = encodeURIComponent(property);
      const encodedValue: string = encodeURIComponent(dict[property]);
      formParts.push(encodedKey + '=' + encodedValue);
    }
    return formParts.join('&');
  }
}
