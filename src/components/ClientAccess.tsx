import * as React from 'react'
import { ClientStore } from 'dcr-client'
import { useAsync } from 'react-async'
import { exportJWK, signJwt } from '../lib/keys'
import {
  Button,
  useClipboard,
  Box,
  Heading,
  Text,
  Link
} from '@chakra-ui/react'

const JwksButton: React.FC<{ client: ClientStore.Client }> = ({ client }) => {
  const getJwks = React.useCallback(async () => {
    const jwk = await exportJWK(client.publicKey)
    return JSON.stringify(
      {
        keys: [
          {
            ...jwk,
            kid: client.kid
          }
        ]
      },
      null,
      2
    )
  }, [client])
  const { data, error, isLoading } = useAsync(getJwks)
  const { hasCopied, onCopy } = useClipboard(data || '')
  if (error) {
    return <Text>Error loading JWKS: {error.message}</Text>
  } else {
    return (
      <Button
        isLoading={isLoading}
        loadingText='Loading JWKS...'
        onClick={onCopy}
      >
        {hasCopied ? 'Copied' : 'Copy JWKS'}
      </Button>
    )
  }
}

const SignJwt: React.FC<{ client: ClientStore.Client }> = ({ client }) => {
  const getJwt = React.useCallback(async () => {
    return signJwt(client)
  }, [client])
  const { data, error, isLoading, reload } = useAsync(getJwt)
  const { hasCopied, onCopy } = useClipboard(data?.assertion || '')
  if (error) {
    return <Text>Error signing JWT: {error.message}</Text>
  } else {
    return (
      <>
        <Text>Current jti: {data?.jti}</Text>
        <Button
          isLoading={isLoading}
          loadingText='Loading JWT...'
          onClick={onCopy}
        >
          {hasCopied ? 'Copied' : 'Copy JWT'}
        </Button>
        <Button onClick={reload} isDisabled={isLoading}>
          Make new JWT
        </Button>
        {isLoading ? (
          <></>
        ) : (
          <Link
            href={`https://jwt.io/#debugger-io?token=${data?.assertion}`}
            isExternal
          >
            See on jwt.io
          </Link>
        )}
      </>
    )
  }
}

const ClientAccess: React.FC<{ client: ClientStore.Client }> = ({ client }) => {
  return (
    <Box>
      <Heading>Stored Client Object</Heading>
      <pre>{JSON.stringify(client, null, 2)}</pre>
      <Heading>Client Public Key</Heading>
      <JwksButton client={client} />
      <Heading>Sign a JWT Assertion</Heading>
      <SignJwt client={client} />
    </Box>
  )
}
export default ClientAccess
