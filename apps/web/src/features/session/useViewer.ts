import { useApolloClient, useMutation, useQuery, type ApolloError } from '@apollo/client';
import { wsClient } from '@/apollo/split';
import {
  LogInDocument,
  LogOutDocument,
  MyBoardsDocument,
  SignUpDocument,
  StartGuestSessionDocument,
  ViewerDocument,
} from '@/gql/graphql';

/** Session mutations answer 4xx with the GraphQL error in the body; surface that message. */
const messageOf = (error: ApolloError | undefined): string | undefined => {
  const body = (error?.networkError as { result?: { errors?: { message: string }[] } } | null)
    ?.result;
  return body?.errors?.[0]?.message ?? error?.message;
};

/**
 * The current session (null until the name dialog is submitted) and the four HTTP session
 * mutations. Each one changes what the socket's context should say (a new cookie, or the same
 * session now carrying a user), so the socket is terminated and graphql-ws reconnects; the
 * offline queue lives in memory and survives, replaying on that reconnect.
 */
export function useViewer() {
  const client = useApolloClient();
  const { data, loading } = useQuery(ViewerDocument);
  const [start, { loading: starting, error }] = useMutation(StartGuestSessionDocument);
  const [signUp, { loading: signingUp, error: signUpError }] = useMutation(SignUpDocument);
  const [logIn, { loading: loggingIn, error: logInError }] = useMutation(LogInDocument);
  const [logOut] = useMutation(LogOutDocument);
  const reconnectAndRefetch = () => {
    wsClient.terminate();
    return client.refetchQueries({ include: [ViewerDocument, MyBoardsDocument] });
  };

  return {
    session: data?.viewer.session ?? null,
    loading,
    starting,
    error,
    busy: signingUp || loggingIn,
    authError: messageOf(signUpError ?? logInError),
    startGuestSession: async (displayName: string) => {
      const result = await start({ variables: { displayName } });
      await reconnectAndRefetch();
      return result;
    },
    signUp: async (email: string, password: string, name: string) => {
      await signUp({ variables: { email, password, name } });
      await reconnectAndRefetch();
    },
    logIn: async (email: string, password: string) => {
      await logIn({ variables: { email, password } });
      await reconnectAndRefetch();
    },
    logOut: async () => {
      await logOut();
      await reconnectAndRefetch();
    },
  };
}
