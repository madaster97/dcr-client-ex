import * as jose from "jose";
import { v4 } from "uuid";
import { ClientStore } from 'dcr-client';

export const createKeys = async () => jose.generateKeyPair('RS384', { extractable: false })
    .then(async ({ privateKey, publicKey }) => {
        const jwk = await jose.exportJWK(publicKey)
        const kid = await jose.calculateJwkThumbprint(jwk);
        return {
            privateKey,
            publicKey,
            kid
        }
    });
export const exportJWK = jose.exportJWK;

export const signJwt = async ({ token_endpoint, client_id, privateKey, kid }: ClientStore.Client) => {
    const jti = v4();
    const assertion = await new jose.SignJWT({
        aud: token_endpoint,
        iss: client_id,
        sub: client_id,
        jti
    })
        .setProtectedHeader({ alg: 'RS384', kid, typ: 'JWT' })
        .setExpirationTime('5m').sign(privateKey);
    return { assertion, jti }
}