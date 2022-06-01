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
import { standalone } from '../lib/launch'

function getDefaultIssOptions (): string[] {
  const config = process.env.REACT_APP_ISS_OPTIONS || ''
  return config.split(',')
}

const ClientLaunch: React.FC = () => {
  const [softwareId, setSoftwareId] = React.useState<string>(
    process.env.REACT_APP_SOFTWARE_ID || ''
  )
  const [initialClientId, setInitialClientId] = React.useState<string>(
    process.env.REACT_APP_INIT_CLIENT_ID || ''
  )
  const [iss, setIss] = React.useState<string>(getDefaultIssOptions()[0])
  return (
    <form
      onSubmit={() => {
        if (!!softwareId && !!initialClientId && !!iss) {
          standalone(initialClientId, softwareId, iss)
            .then(url => (window.location.href = url))
            .catch(e => window.alert(e))
        }
      }}
    >
      <FormControl isRequired>
        <FormLabel htmlFor='init-client'>Initial Client ID</FormLabel>
        <Input
          id='init-client'
          type='text'
          value={initialClientId}
          onChange={e => setInitialClientId(e.target.value)}
        />
        <FormHelperText>
          The client ID used for your initial OAuth 2.0 flow
        </FormHelperText>

        <FormLabel htmlFor='software-id'>Software ID</FormLabel>
        <Input
          id='software-id'
          type='text'
          value={softwareId}
          onChange={e => setSoftwareId(e.target.value)}
        />
        <FormHelperText>
          The software template ID to use when registering your dynamic client
        </FormHelperText>

        <FormLabel htmlFor='iss'>Iss</FormLabel>
        <Input
          id='iss'
          type='text'
          value={iss}
          onChange={e => setIss(e.target.value)}
        />
        <FormHelperText>The `iss` of the FHIR server to launch</FormHelperText>
      </FormControl>
      <Button type='submit'>Launch</Button>
    </form>
  )
}
export default ClientLaunch
