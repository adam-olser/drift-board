import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { wsClient } from '@/apollo/split';
import { StartGuestSessionDocument, ViewerDocument } from '@/gql/graphql';

/** The current session (null until the name dialog is submitted) and how to start one. */
export function useViewer() {
  const client = useApolloClient();
  const { data, loading } = useQuery(ViewerDocument);
  const [start, { loading: starting, error }] = useMutation(StartGuestSessionDocument);
  return {
    session: data?.viewer.session ?? null,
    loading,
    starting,
    error,
    startGuestSession: async (displayName: string) => {
      const result = await start({ variables: { displayName } });
      // why: the socket authenticated from the cookie on its upgrade request, which predates the
      // session. Terminate so graphql-ws reconnects with the new cookie, then refetch the viewer
      // over that new connection.
      wsClient.terminate();
      await client.refetchQueries({ include: [ViewerDocument] });
      return result;
    },
  };
}
