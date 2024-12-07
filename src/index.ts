import { ClientListException } from './Exceptions/ClientListException';
import { LoginException } from './Exceptions/LoginException';
import { Client, ClientList, DeviceAction, GetClientListResponse, IpTraffic } from './Models';
import { fetch, Agent, Response } from 'undici';
export * from './Models';

export class NodeMerlinWrtApi {
	private readonly _agent: Agent;
	private readonly _basicAuth: string;
	private readonly _url: URL;

	private clientListPromise: Promise<GetClientListResponse> | null = null;
	private clientPromise: Promise<Response> | null = null;

	/**
	 * creates a new API object
	 *
	 * @param username username
	 * @param password password
	 * @param url url
	 * @param ignoreSSL
	 */
	public constructor(
		username: string,
		password: string,
		url: string,
		ignoreSSL: boolean = false
	) {
		this._url = new URL(url);
		this._agent = new Agent({ connect: { rejectUnauthorized: !ignoreSSL } });
		this._basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
	}

	/**
	 * Returns the clients agent
	 * (the agent is needed by undicis MockAgent in order to mock tests)
	 *
	 * @returns Agent
	 */
	getAgent() {
		return this._agent;
	}

	/**
	 * logs in based on the set credentials
	 */
	private login(): void {
		this.clientPromise = fetch(new URL('/login.cgi', this._url), {
			dispatcher: this._agent,
			method: 'POST',
			headers: {
				accept: 'application/json, text/javascript, */*; q=0.01',
				'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
				'cache-control': 'no-cache',
				'content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				referer: new URL('/Main_Login.asp', this._url).toString(),
				connection: 'close',
			},
			body: new URLSearchParams({
				'current_page': 'Main_Login.asp',
				'login_authorization': this._basicAuth
			}).toString()
		});
	}

	/**
	 * Retrieves the access token after successful login
	 *
	 * @param force if set to true a new login request is performed and the token reparsed
	 * @returns the parsed access token from the Set-Cookie header
	 */
	public async getAuthToken(force = false): Promise<string> {
		if (!this.clientPromise || force) this.login();

		try {
			const response = await this.clientPromise;
			if (!response) throw Error('no login response available');

			const cookieHeader = response.headers.get('Set-Cookie');
			if (!cookieHeader) throw Error('no "Set-Cookie" header in response. Login probably did not succeed', {
				cause: { httpStatus: response.status }
			});

			const behindAsusToken = cookieHeader.match(/asus_s_token=([^;]+)/);
			if (!behindAsusToken) throw new Error('could not find access token in cookie', {
				cause: {
					cookie: cookieHeader,
					httpStatus: response.status
				}
			});

			return behindAsusToken[1];

		} catch (cause) {
			throw new LoginException("an error occurd while retrieving auth token", { cause });
		}
	}

	/**
	 * Retrieves a client list
	 *
	 * @param force if set to true the clientlist is retrieved despite is has been retrieved earlier
	 * @returns client list
	 */
	public async getClientList(force = false): Promise<ClientList> {
		try {
			const url = new URL('/appGet.cgi', this._url);
			url.search = new URLSearchParams({ 'hook': 'get_clientlist()' }).toString();

			if (!this.clientListPromise || force) {
				await fetch(url, {
					dispatcher: this._agent,
					method: 'GET',
					headers: await this.getDefaultHeader(),
				}).then(response => {
					if (response.status !== 200) throw Error(`GetClientList failed with Status ${response.status}`);
					this.clientListPromise = response.json() as Promise<GetClientListResponse>;
					return;
				}
				);
			}

			const clientListResponse = await this.clientListPromise;
			if (!clientListResponse) throw Error('client list is unset');

			return new ClientList(clientListResponse);
		} catch (cause) {
			throw new ClientListException("something went wrong while retrieving a client list", { cause });
		}
	}

	/**
	 * Retrieve the client information for a client identified by it's ip
	 * @param {string} value ip of the client
	 * @returns {Promise<Client | null>} Null means Client not found
	 */
	public async getClientByIp(value: string): Promise<Client | null> {
		const clientList = await this.getClientList();

		for (const [_, client] of clientList.clients) {
			if (client.rawData.ip === value) return client;
		}

		return null;
	}

	/**
	 * Retrieves the client information for a client identified by its mac address
	 *
	 * @param value the mac of the client to return
	 * @returns client or null if none found
	 */
	public async getClientByMac(value: string): Promise<Client | null> {
		const clientList = await this.getClientList();

		for (const [mac, client] of clientList.clients) {
			if (mac === value) return client;
		}

		return null;
	}

	/**
	 * Retrieves a list of network traffic metrics per mac address
	 *
	 * @returns list of traffic metrics per mac
	 */
	public async getIpTraffic(): Promise<IpTraffic> {
		const response = await fetch(new URL('/getTraffic.asp', this._url), {
			dispatcher: this._agent,
			method: 'GET',
			headers: await this.getDefaultHeader(),
		}
		);
		if (response.status !== 200) throw Error(`GetClientList failed with Status ${response.status}`);

		const data = await response.text();
		return NodeMerlinWrtApi.parseIpTraffic(data);
	}

	/**
	 * Performs an action for a client
	 *
	 * @param client to perform the action upon
	 * @param action to perform on the client
	 * @returns boolean true or false
	 */
	public async performDeviceAction(client: Client, action: DeviceAction): Promise<boolean> {
		return await this.performDeviceActionByMac(client.rawData.mac, action);
	}

	/**
	 * performs an action for a client identified by its mac address
	 *
	 * @param mac address of the client
	 * @param action the action to perform
	 * @returns true if status equals 200 or false otherwise
	 */
	public async performDeviceActionByMac(mac: string, action: DeviceAction): Promise<boolean> {
		const url = new URL('/applyapp.cgi', this._url);
		url.search = new URLSearchParams({
			device_list: mac,
			action_mode: action
		}).toString();

		const response = await fetch(url, {
			dispatcher: this._agent,
			method: 'GET',
			headers: await this.getDefaultHeader('AiMesh.asp'),
		},
		);
		return response.status === 200;
	}

	/**
	 * Logs out the client
	 */
	public async logout(): Promise<void> {
		await fetch(new URL('/Logout.asp', this._url), {
			dispatcher: this._agent,
			method: 'GET',
			headers: await this.getDefaultHeader(),
		});
		this.clientPromise = null;
	}

	/**
	 * Returns an object of default headers to set
	 *
	 * @param referer referrer page
	 * @returns object of headers
	 */
	private async getDefaultHeader(referer: string = 'index.asp'): Promise<HeadersInit> {
		return {
			accept: 'application/json, text/javascript, */*; q=0.01',
			'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
			'cache-control': 'no-cache',
			referer: new URL(referer, this._url).toString(),
			cookie: `asus_token=${await this.getAuthToken()}; HttpOnly;`,
			connection: 'close',
		};
	}

	/**
	 * parses javscript as eval in a safe context
	 *
	 * @param evil javscript string to evaluate
	 * @returns evaluated result
	 */
	private static parseIpTraffic(evil: string): IpTraffic {
		const obj = eval?.(`"use strict";${evil};var obj = { router_traffic: router_traffic, array_traffic: array_traffic }; obj`);

		return {
			clients: obj.array_traffic.map((item: string[]) => {
				return {
					mac: item[0],
					tx: item[1],
					rx: item[2]
				};
			}),
			router: {
				tx: obj.router_traffic[0],
				rx: obj.router_traffic[1]
			}
		};
	}
}
