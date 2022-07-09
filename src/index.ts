import fetch, { Response } from 'node-fetch';
import { Agent } from 'https';

export class NodeMerlinWrtApi {
  private _authToken: string = '';
  private readonly _agent: Agent;
  private readonly _basicAuth: string;
  public constructor(
    private _username: string,
    private _password: string,
    private _routerAddress: string,
    ignoreSSL: boolean = false,
  ) {
    this._agent = new Agent({ rejectUnauthorized: !ignoreSSL });
    this._basicAuth = Buffer.from(`${this._username}:${this._password}`).toString('base64');
  }
  public async getAuthToken(): Promise<string> {
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

  public async getClientList(): Promise<unknown> {
    if (this._authToken === '') {
      await this.getAuthToken();
    }
    const requestData = {
      hook: 'get_clientlist()',
    };
    const response: Response = await fetch(
      `${this._routerAddress}/appGet.cgi?${NodeMerlinWrtApi.getFormData(requestData)}`,
      {
        agent: this._agent,
        method: 'GET',
        headers: {
          accept: 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'cache-control': 'no-cache',
          referer: `${this._routerAddress}/index.asp`,
          cookie: `asus_token=${this._authToken}; HttpOnly;`,
          connection: 'close',
        },
        body: undefined,
      },
    );
    return response.json();
  }

  public async logout(): Promise<void> {
    if (this._authToken === '') {
      return;
    }
    await fetch(`${this._routerAddress}/Logout.asp`, {
      agent: this._agent,
      method: 'GET',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        referer: `${this._routerAddress}/index.asp`,
        cookie: `asus_token=${this._authToken}; HttpOnly;`,
        connection: 'close',
      },
      body: undefined,
    });
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
