import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  ApolloLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const defaultGraphqlUrl = import.meta.env.VITE_GRAPHQL_URL
  ?? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/graphql'
    : '/graphql');

const httpLink = createHttpLink({
  uri: defaultGraphqlUrl,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Only redirect once — avoid loops on the login page
        if (!window.location.pathname.startsWith('/login')) {
          localStorage.removeItem('token');
          window.location.replace('/login');
        }
        return;
      }
      if (import.meta.env.DEV) {
        console.error(`[GraphQL error] op=${operation.operationName}: ${message}`);
      }
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Detect HTTPS → use wss://, HTTP → ws://
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const defaultWsUrl = import.meta.env.VITE_WS_URL
  ?? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:4000/graphql'
    : `${wsProtocol}://${window.location.host}/graphql`);
const wsUrl = defaultWsUrl;

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUrl,
    connectionParams: () => {
      const token = localStorage.getItem('token');
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    retryAttempts: 10,
    shouldRetry: () => true,
    on: {
      error: (err) => console.warn('[WS error]', err),
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

export const apolloCache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        feed: {
          keyArgs: false,
          merge(existing: any, incoming: any) {
            if (!existing) return incoming;
            // Deduplicate by __ref
            const existingSet = new Set((existing.posts ?? []).map((p: any) => p.__ref));
            const merged = [...(existing.posts ?? [])];
            (incoming.posts ?? []).forEach((p: any) => {
              if (!existingSet.has(p.__ref)) merged.push(p);
            });
            return { ...incoming, posts: merged };
          },
        },
        messages: {
          keyArgs: ['conversationId'],
          merge(existing: any[] = [], incoming: any[]) {
            const existingSet = new Set(existing.map((m: any) => m.__ref));
            const merged = [...existing];
            incoming.forEach((m: any) => {
              if (!existingSet.has(m.__ref)) merged.push(m);
            });
            return merged;
          },
        },
      },
    },
    Post: { keyFields: ['id'] },
    User: { keyFields: ['id'] },
    Message: { keyFields: ['id'] },
    Conversation: { keyFields: ['id'] },
    Notification: { keyFields: ['id'] },
    Story: { keyFields: ['id'] },
    Comment: { keyFields: ['id'] },
  },
});

export const client = new ApolloClient({
  link: splitLink,
  cache: apolloCache,
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network', errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
  connectToDevTools: import.meta.env.DEV,
});
