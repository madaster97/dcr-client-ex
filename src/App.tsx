import * as React from 'react'
import {
  ChakraProvider,
  Box,
  Text,
  theme,
  Heading,
  Spacer,
  Flex,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  RadioGroup,
  Radio,
  IconButton,
  Button
} from '@chakra-ui/react'
import { Tag, TagLabel, TagCloseButton, Icon } from '@chakra-ui/react'
import { FaGithub, FaCog, FaUser, FaSearch } from 'react-icons/fa'
import { ColorModeSwitcher } from './ColorModeSwitcher'
import ClientTable from './components/ClientTable'
import ClientForm from './components/ClientForm'
import ClientAccess from './components/ClientAccess'
import ClientLaunch from './components/ClientLaunch'
import { ClientStore } from 'dcr-client'

export const App: React.FC<{ newClient?: ClientStore.Client }> = ({
  newClient
}) => {
  const [tabIndex, setTabIndex] = React.useState<number | number[]>(0)
  const [client, setClientInternal] = React.useState<
    ClientStore.Client | undefined
  >(newClient)
  const [regMode, setRegMode] = React.useState<string>('launch')

  const unsetClient = () => {
    setClientInternal(undefined)
    setTabIndex([])
  }

  const setClient = (c: ClientStore.Client) => {
    setTabIndex(2)
    setClientInternal(c)
  }

  return (
    <ChakraProvider theme={theme}>
      <Box>
        <Flex>
          <Box as='header' mx={'4px'} mt={'4px'}>
            SMART Dynamic Client App
          </Box>
          <Spacer />
          <IconButton
            aria-label='View on Github'
            size='md'
            fontSize='lg'
            variant='ghost'
            color='current'
            marginLeft='2'
            icon={<Icon size='md' as={FaGithub} />}
            onClick={() =>
              window.open('https://github.com/madaster97/dcr-client', '_blank')
            }
          />
          <ColorModeSwitcher />
        </Flex>

        <Accordion allowToggle index={tabIndex} onChange={e => setTabIndex(e)}>
          <AccordionItem>
            <Heading>
              <AccordionButton>
                <Box flex='1' textAlign='left'>
                  Search Existing Clients
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </Heading>
            <AccordionPanel pb={4}>
              <ClientTable chooseClient={setClient} />
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <Heading>
              <AccordionButton>
                <Box flex='1' textAlign='left'>
                  Register a New Client
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </Heading>
            <AccordionPanel pb={4}>
              <RadioGroup onChange={setRegMode} value={regMode}>
                <Radio value='manual'>Manually Register</Radio>
                <Radio value='launch'>Register with Launch</Radio>
              </RadioGroup>
              {regMode === 'launch' ? (
                <ClientLaunch />
              ) : (
                <ClientForm chooseClient={setClient} />
              )}
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem isDisabled={!client}>
            <Heading>
              <AccordionButton>
                <Box flex='1' textAlign='left'>
                  Get Access with Current Client
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </Heading>
            <AccordionPanel pb={4}>
              {!client ? (
                <Text>No client found. Please choose or register a client</Text>
              ) : (
                <>
                  <Tag
                    size={'md'}
                    borderRadius='full'
                    variant='solid'
                    colorScheme='green'
                  >
                    <TagLabel>{client.client_id}</TagLabel>
                    <TagCloseButton onClick={unsetClient} />
                  </Tag>
                  <ClientAccess client={client} />
                </>
              )}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
    </ChakraProvider>
  )
}
