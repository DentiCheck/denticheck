import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';

// Android Emulator localhost: 10.0.2.2
// iOS Simulator localhost: localhost
// Physical device: Your machine's LAN IP
const SERVER_URL = 'http://10.0.2.2:8080/graphql';

const client = new ApolloClient({
    link: new HttpLink({ uri: SERVER_URL }),
    cache: new InMemoryCache(),
});

export default client;
