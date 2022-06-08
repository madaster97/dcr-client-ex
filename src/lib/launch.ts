import { ClientStore, register as registerClient } from 'dcr-client'
import FHIR from 'fhirclient'

export function setRedirect(redirect: string) {
    window.localStorage.setItem('REDIRECT_URI', redirect);
}

export function getSetRedirect(): string | null {
    return window.localStorage.getItem('REDIRECT_URI');
}

function getRedirect(): string {
    function backupRedirect(): string {
        const currentPath = window.location.pathname;
        const redirectPath = currentPath === '/'
            ? currentPath + 'index.html'
            : currentPath.endsWith('/index.html')
                ? currentPath
                : currentPath + '/index.html';
        return window.location.origin + redirectPath
    }
    return getSetRedirect() || backupRedirect()
}

async function getMetadata(iss: string, headers: Record<string, string | number>): Promise<{ authorize: string, token: string, register: string }> {
    const url = `${iss}/metadata`
    const resp = await fetch(url, {
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
            ...headers
        }
    });
    const json = await resp.json();
    // const securityExtensions = json.rest[0].security.extension as { uri: string, extension: unknown }[];
    // const oauthUris = securityExtensions.find(extension => extension.uri === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris');
    // if (!oauthUris) {
    //     return Promise.reject('Could not find OAuth 2.0 uris')
    // }
    const authUrls = json.rest[0].security.extension[0].extension as { valueUri: string, url: 'token' | 'register' | 'authorize' }[];
    const register = authUrls.filter(({ url }) => url === 'register')[0].valueUri;
    const authorize = authUrls.filter(({ url }) => url === 'authorize')[0].valueUri;
    const token = authUrls.filter(({ url }) => url === 'token')[0].valueUri;
    if (!register || !authorize || !token) {
        const messages: string[] = [];
        if (!register) { messages.push('register') }
        if (!authorize) { messages.push('authorize') }
        if (!token) { messages.push('token') }
        return Promise.reject('OAuth 2.0 URI(s) missing: ' + messages.join(',') + ' not found')
    }

    return Promise.resolve({ authorize, register, token });
}

export function hasLaunched(): boolean {
    return !!window.sessionStorage.getItem('LAUNCH_SESSION')
}

export const standalone = async (initialClientId: string, softwareId: string, iss: string): Promise<string | void> => {
    // const { register } = await getMetadata(iss, { 'Epic-Client-ID': initialClientId });
    // TODO, very broken!
    const register = iss.replace('/api/FHIR/R4', '/oauth2/register')
    
    const session = {
        register,
        softwareId
    };

    window.sessionStorage.setItem('LAUNCH_SESSION', JSON.stringify(session));
    return FHIR.oauth2.authorize({
        client_id: initialClientId,
        scope: "openid fhirUser system/DynamicClient.register launch/patient",
        redirectUri: getRedirect(),
        iss
    });
}

export const grant = async (): Promise<ClientStore.Client> => {
    const rawSession = window.sessionStorage.getItem('LAUNCH_SESSION');
    if (!rawSession) {
        return Promise.reject('No launch session found. Please launch again or enable session storage')
    }
    window.sessionStorage.removeItem('LAUNCH_SESSION');
    const {
        register,
        softwareId
    } = JSON.parse(rawSession);

    const client = await FHIR.oauth2.ready();

    const sub = client.getIdToken()?.sub

    const fhirUser = `${client.getUserType()}/${client.getUserId()}`

    if (!sub) {
        return Promise.reject(`id_token missing sub parameter`)
    }
    if (!fhirUser) {
        return Promise.reject(`id_token missing fhirUser parameter`)
    }

    const initialAccessToken = client.getAuthorizationHeader()?.substring(7) || ''

    const { client_id, kid, privateKey, publicKey
        // , metadata
    } = await registerClient(initialAccessToken, register, softwareId, 'RS384');

    const iss = client.state.serverUrl;
    const token = client.state.tokenUri || ''
    const scope = client.state.scope || ''
    const context = client.state.tokenResponse as Record<string, unknown>;

    const newClient = {
        client_id,
        kid,
        creationTime: new Date(),
        publicKey,
        privateKey,
        token_endpoint: token,
        extra: {
            iss,
            fhirUserRelative: fhirUser,
            scope,
            context
        },
        sub
    }

    await ClientStore.set(newClient);
    return Promise.resolve(newClient);
}