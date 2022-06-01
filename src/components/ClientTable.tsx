import React from 'react'
import {
  TableContainer,
  Table,
  TableCaption,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  Text,
  Button
} from '@chakra-ui/react'
import { ClientStore } from 'dcr-client'
import { useAsync } from 'react-async'

const ClientTable: React.FC<{
  chooseClient: (c: ClientStore.Client) => void
}> = ({ chooseClient }) => {
  const { data: clients, error, isPending, reload } = useAsync(
    ClientStore.getAll
  )
  if (isPending) return <Text>Loading clients...</Text>
  if (error)
    return <Text>Something went wrong fetching clients: {error.message}</Text>
  if (clients)
    return (
      <TableContainer>
        <Table variant='striped' colorScheme='teal' size='sm'>
          <TableCaption placement='top'>
            List of clients saved on this device.{' '}
            <Button size='sm' onClick={reload}>
              Refresh clients
            </Button>
          </TableCaption>
          <Thead>
            <Tr>
              <Th>Client ID</Th>
              <Th>Token Endpoint</Th>
              <Th>kid</Th>
              <Th>FhirUser</Th>
              <Th>Patient</Th>
              <Th>Creation Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {clients.map(c => {
              const { client_id, creationTime, kid, token_endpoint, extra } = c
              return (
                <Tr
                  key={`${client_id}|${token_endpoint}`}
                  _hover={{ fontWeight: 'semibold' }}
                  onClick={() => chooseClient(c)}
                >
                  <Td>{client_id}</Td>
                  <Td>{token_endpoint}</Td>
                  <Td>{kid}</Td>
                  <Td>{(extra.fhirUser as string) || 'Unknown'}</Td>
                  <Td>{(extra.patient as string) || 'Unknown'}</Td>
                  <Td>{creationTime.toDateString()}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </TableContainer>
    )
  return <Text>No return value for client fetch</Text>
}
export default ClientTable
