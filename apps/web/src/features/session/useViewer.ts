import { useMutation, useQuery } from '@apollo/client';
import { StartGuestSessionDocument, ViewerDocument } from '@/gql/graphql';

/** The current session (null until the name dialog is submitted) and how to start one. */
export function useViewer() {
  const { data, loading } = useQuery(ViewerDocument);
  const [start, { loading: starting, error }] = useMutation(StartGuestSessionDocument, {
    refetchQueries: [ViewerDocument],
    awaitRefetchQueries: true,
  });
  return {
    session: data?.viewer.session ?? null,
    loading,
    starting,
    error,
    startGuestSession: (displayName: string) => start({ variables: { displayName } }),
  };
}
