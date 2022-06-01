import { ClientStore, register as registerClient } from 'dcr-client'
import pkceChallenge, { verifyChallenge } from 'pkce-challenge'
import jwt_decode from "jwt-decode";

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

export const standalone = async (initialClientId: string, softwareId: string, iss: string): Promise<string> => {
    const { authorize, register, token } = await getMetadata(iss, { 'Epic-Client-ID': initialClientId });
    const { code_verifier, code_challenge } = pkceChallenge();
    const { code_verifier: state_verifier, code_challenge: state } = pkceChallenge();
    // const { code_verifier: nonce_verifier, code_challenge: nonce } = pkceChallenge();

    const session = {
        token,
        register,
        initialClientId,
        softwareId,
        iss,
        code_verifier,
        state_verifier,
        // nonce_verifier
    }

    const queryString = new URLSearchParams({
        client_id: initialClientId,
        redirect_uri: getRedirect(),
        aud: iss,
        response_type: 'code',
        scope: 'openid fhirUser launch/patient',
        state,
        // nonce,
        code_challenge,
        code_challenge_method: 'S256'
    })

    window.sessionStorage.setItem('LAUNCH_SESSION', JSON.stringify(session))
    return `${authorize}?${queryString.toString()}`
}

export const token = async (): Promise<ClientStore.Client> => {
    const rawSession = window.sessionStorage.getItem('LAUNCH_SESSION');
    if (!rawSession) {
        return Promise.reject('No launch session found. Please launch again or enable session storage')
    }
    window.sessionStorage.removeItem('LAUNCH_SESSION');
    const {
        token,
        register,
        initialClientId,
        softwareId,
        iss,
        code_verifier,
        state_verifier,
        // nonce_verifier
    } = JSON.parse(rawSession);

    const params = new URLSearchParams(window.location.search);

    // State validation
    const state = params.get('state');
    if (!state) {
        return Promise.reject('Missing `state` response parameter')
    }
    if (!verifyChallenge(state_verifier, state)) {
        return Promise.reject('State verification failed')
    }

    if (params.has('error') || params.has('error_description')) {
        return Promise.reject(`Encountered ${params.get('error')} error [${params.get('error_description')}]`)
    }

    const code = params.get('code')
    if (!code) {
        return Promise.reject('Missing `code` response parameter')
    }
    const body = new URLSearchParams({
        redirect_uri: getRedirect(),
        client_id: initialClientId,
        grant_type: 'authorization_code',
        code_verifier,
        code
    })

    const resp = await fetch(token, { method: 'POST', body });

    // Use this immediately, and only store in memory!
    const { access_token: initialAccessToken, id_token, scope, expires_in, token_type, ...context } = await resp.json();

    if (!id_token) {
        return Promise.reject('Missing id_token. Scope ' + (scope.includes('openid') ? 'did' : 'did not') + 'include "openid"')
    }

    // Delivered over TLS + in app code, verification isn't necessary 
    const { sub, fhirUser
        // , nonce
    } = jwt_decode(id_token) as Record<string, string>;

    if (!sub) {
        return Promise.reject(`id_token missing sub parameter`)
    }
    if (!fhirUser) {
        return Promise.reject(`id_token missing fhirUser parameter`)
    }

    // if (!verifyChallenge(nonce_verifier, nonce)) {
    //     return Promise.reject('Nonce verification failed')
    // }

    const { client_id, kid, privateKey, publicKey
        // , metadata
    } = await registerClient(initialAccessToken, register, softwareId, 'RS384');

    const newClient = {
        client_id,
        kid,
        creationTime: new Date(),
        publicKey,
        privateKey,
        token_endpoint: token,
        extra: {
            iss,
            fhirUserRelative: fhirUser.split(iss + '/')[1],
            scope,
            context
        },
        sub
    }

    await ClientStore.set(newClient);
    return Promise.resolve(newClient);
}