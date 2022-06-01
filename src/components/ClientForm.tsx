import * as React from 'react'
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Button,
  useClipboard,
  Text,
  Divider
} from '@chakra-ui/react'
import { ClientStore } from 'dcr-client'
import { useAsync } from 'react-async'

import { createKeys, exportJWK } from '../lib/keys'

const createNewKeys = async () => {
  const { kid, privateKey, publicKey } = await createKeys()
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid
  }
  return {
    publicKey,
    privateKey,
    kid,
    jwksString: JSON.stringify({ keys: [jwk] }, null, 2)
  }
}

const InputComponent: React.FC<{
  required: boolean
  name: string
  callback: (s: string) => void
  value: string | undefined
}> = ({ callback, name, required, value, children }) => (
  <FormControl>
    <FormLabel>{name}</FormLabel>
    <Input
      value={value}
      onChange={e => callback(e.target.value)}
      placeholder={'Enter your ' + name}
      required={required}
    />
    {children}
  </FormControl>
)

const ClientForm: React.FC<{
  chooseClient: (c: ClientStore.Client) => void
}> = ({ chooseClient }) => {
  const { data, error, isPending, run } = useAsync({
    deferFn: createNewKeys
  })
  const { hasCopied, onCopy } = useClipboard(data?.jwksString || '')
  const [clientId, setClientId] = React.useState<string>()
  const [tokenEndpoint, setTokenEndpoint] = React.useState<string>()
  const [fhirUser, setFhirUser] = React.useState<string>()
  const [patient, setPatient] = React.useState<string>()
  const [iss, setIss] = React.useState<string>()
  const [sub, setSub] = React.useState<string>()

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (!!data && !!clientId && !!tokenEndpoint) {
          const client_id = clientId
          const token_endpoint = tokenEndpoint
          const { kid, privateKey, publicKey } = data
          const newClient = {
            client_id,
            token_endpoint,
            creationTime: new Date(),
            extra: {
              iss,
              patient
            },
            kid,
            privateKey,
            publicKey,
            sub: sub || 'Unknown'
          }
          ClientStore.set(newClient)
            .then(() => {
              chooseClient(newClient)
            })
            .catch(e => {
              window.alert(e.message)
            })
        }
      }}
    >
      <FormControl isInvalid={!!error} isRequired>
        <FormLabel htmlFor='kid'>Public-Private Key Pair</FormLabel>
        <Input
          id='kid'
          placeholder='Generate a new key'
          isReadOnly
          value={data?.kid}
        />
        <Button onClick={run} isLoading={isPending} loadingText='Generating...'>
          Generate new key
        </Button>
        {!error ? (
          <>
            <Button isDisabled={!data} onClick={onCopy}>
              {hasCopied ? 'Copied' : 'Copy JWKS'}
            </Button>
            <FormHelperText>
              Copy the public key and manually register a client. The private
              key will be stored in your browser for later use.
            </FormHelperText>
          </>
        ) : (
          <FormErrorMessage>
            Error generating keys: {error.message}
          </FormErrorMessage>
        )}
      </FormControl>
      <InputComponent
        callback={setClientId}
        name='clientId'
        required={true}
        value={clientId}
      />
      <InputComponent
        callback={setTokenEndpoint}
        name='tokenEndpoint'
        required={true}
        value={tokenEndpoint}
      >
        <FormHelperText>
          Below fields are <Text as='em'>optional</Text>
        </FormHelperText>
      </InputComponent>
      <Button type='submit' isDisabled={!data || !clientId || !tokenEndpoint}>
        Submit
      </Button>
      <Divider my={'4px'} />
      <InputComponent
        callback={setFhirUser}
        name='fhirUser'
        required={false}
        value={fhirUser}
      />
      <InputComponent
        callback={setPatient}
        name='patient'
        required={false}
        value={patient}
      />
      <InputComponent
        callback={setIss}
        name='iss'
        required={false}
        value={iss}
      />
      <InputComponent
        callback={setSub}
        name='sub'
        required={false}
        value={sub}
      />
    </form>
  )
}
export default ClientForm
