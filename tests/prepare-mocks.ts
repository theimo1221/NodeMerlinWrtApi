import { MockAgent, setGlobalDispatcher, Agent } from 'undici'

function getMockPool(url: string, agent: Agent) {
	// @ts-expect-error https://github.com/nodejs/undici/issues/3887
	agent.isMockActive = true

	const mockAgent = new MockAgent({ agent })
	mockAgent.disableNetConnect()
	setGlobalDispatcher(mockAgent)
	return mockAgent.get(url)
}

function getReqHeaders(url: string) {
	return {
		accept: 'application/json, text/javascript, */*; q=0.01',
		'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
		'cache-control': 'no-cache',
		'content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		referer: new URL('/Main_Login.asp', url).toString(),
		connection: 'close',
	}
}

function getReqBody(user: string, pass: string) {
	return new URLSearchParams({
		'current_page': 'Main_Login.asp',
		'login_authorization': Buffer.from(`${user}:${pass}`).toString('base64')
	}).toString()
}

function getResHeadersOk(token: string) {
	return {
		'Set-Cookie': `foo=bar;asus_s_token=${token};foobar=baz;`
	}
}

function getResHeadersInvalid() {
	return {
		'Set-Cookie': `foo=bar;foobar=baz;`
	}
}

export const Authtoken = {
	prepareOk: (user: string, pass: string, url: string, agent: Agent, token: string) => {
		return getMockPool(url, agent).intercept({
			path: '/login.cgi',
			method: 'POST',
			body: getReqBody(user, pass),
			headers: getReqHeaders(url),
		}).reply(200, {}, {
			headers: getResHeadersOk(token)
		})
	},

	prepareNoCookie: (user: string, pass: string, url: string, agent: Agent) => {
		return getMockPool(url, agent).intercept({
			path: '/login.cgi',
			method: 'POST',
			body: getReqBody(user, pass),
			headers: getReqHeaders(url),
		}).reply(200)
	},

	prepareInvalidCookie: (user: string, pass: string, url: string, agent: Agent) => {
		return getMockPool(url, agent).intercept({
			path: '/login.cgi',
			method: 'POST',
			body: getReqBody(user, pass),
			headers: getReqHeaders(url),
		}).reply(200, {}, {
			headers: getResHeadersInvalid()
		})
	},

	prepareErrorResponse: (user: string, pass: string, url: string, agent: Agent) => {
		return getMockPool(url, agent).intercept({
			path: '/login.cgi',
			method: 'POST',
			body: getReqBody(user, pass),
			headers: getReqHeaders(url),
		}).replyWithError(Error("something went wrong"))
	}
}
