import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';

// Android Emulator localhost: 10.0.2.2
// iOS Simulator localhost: localhost
// Physical device: Your machine's LAN IP
const SERVER_URL = 'http://10.0.2.2:8080/graphql';

const authLink = setContext(async (_operation, { headers }) => {
  const token = await SecureStore.getItemAsync('accessToken');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const client = new ApolloClient({
  link: from([authLink, new HttpLink({ uri: SERVER_URL })]),
  cache: new InMemoryCache(),
});

export default client;
