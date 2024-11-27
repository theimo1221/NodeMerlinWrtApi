import { beforeEach, describe, expect, test } from '@jest/globals'
import { NodeMerlinWrtApi } from '../src'
import { Authtoken } from './prepare-mocks'
import { LoginException } from '../src/Exceptions/LoginException'

beforeEach(() => {
})

describe('retrieve token', () => {
	test('with valid credentials', async () => {
		const user = 'admin',
			pass = 'changeMe',
			url = 'https://api.example.com',
			token = "foobar"

		const client = new NodeMerlinWrtApi(user, pass, url, false)
		Authtoken.prepareOk(user, pass, url, client.getAgent(), token)
		const res = await client.getAuthToken()
		expect(res).toEqual(token)
	})

	test('with invalid cookie header', async () => {
		const user = 'admin',
			pass = 'changeMe',
			url = 'https://api.example.com'

		const client = new NodeMerlinWrtApi(user, pass, url, false)
		Authtoken.prepareNoCookie(user, pass, url, client.getAgent())
		await expect(client.getAuthToken()).rejects.toBeInstanceOf(LoginException)
	})

	test('with no cookie header', async () => {
		const user = 'admin',
			pass = 'changeMe',
			url = 'https://api.example.com'

		const client = new NodeMerlinWrtApi(user, pass, url, false)
		Authtoken.prepareNoCookie(user, pass, url, client.getAgent())
		await expect(client.getAuthToken()).rejects.toBeInstanceOf(LoginException)
	})

	test('with error response', async () => {
		const user = 'admin',
			pass = 'changeMe',
			url = 'https://api.example.com'

		const client = new NodeMerlinWrtApi(user, pass, url, false)
		Authtoken.prepareErrorResponse(user, pass, url, client.getAgent())
		await expect(client.getAuthToken()).rejects.toBeInstanceOf(LoginException)
	})
})
