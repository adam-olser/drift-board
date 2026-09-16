import type { ApolloCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { syncStore } from '@/features/sync/SyncStore';
import { CardFieldsFragmentDoc, type CardFieldsFragment } from '@/gql/graphql';

/** T5.3: the two conflict codes become toasts; the failed mutation's optimistic layer is dropped by Apollo. */
export const errorLink = onError(({ graphQLErrors, operation }) => {
  for (const error of graphQLErrors ?? []) {
    const code = error.extensions?.['code'];
    if (code === 'CARD_GONE') {
      syncStore.toast('That card was deleted by someone else — your change was dropped.', 'error');
    } else if (code === 'VERSION_MISMATCH') {
      const current = error.extensions?.['current'] as CardFieldsFragment | undefined;
      const who = current?.updatedBy?.name ?? 'someone else';
      // T6.1: the row resets to the winning title even if its CardUpdated event was missed.
      const cache = operation.getContext()['cache'] as ApolloCache<unknown> | undefined;
      if (current && cache) {
        cache.writeFragment({
          fragment: CardFieldsFragmentDoc,
          fragmentName: 'CardFields',
          data: {
            ...current,
            __typename: 'Card',
            updatedBy: { ...current.updatedBy, __typename: 'Peer' },
          },
        });
      }
      syncStore.toast(
        `“${current?.title ?? 'This card'}” was changed by ${who} — your edit was reverted.`,
        'queued'
      );
    }
  }
});
