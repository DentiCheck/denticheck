import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';

// Android Emulator localhost: 10.0.2.2
// iOS Simulator localhost: localhost
// Physical device: Your machine's LAN IP
const SERVER_URL = 'http://10.0.2.2:8080/graphql';

const httpLink = createHttpLink({
    uri: SERVER_URL,
});

const authLink = setContext(async (_, { headers }) => {
    // get the authentication token from local storage if it exists
    const token = await SecureStore.getItemAsync('accessToken');
    // return the headers to the context so httpLink can read them
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        }
    }
});

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});

export default client;
