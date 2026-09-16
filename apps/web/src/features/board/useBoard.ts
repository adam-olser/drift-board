import { useQuery } from '@apollo/client';
import { BoardDocument } from '@/gql/graphql';

/** The canonical board for a slug. Mutations arrive in T2.7. */
export function useBoard(slug: string) {
  const { data, loading, error } = useQuery(BoardDocument, { variables: { slug } });
  return { board: data?.board ?? null, loading, error };
}
