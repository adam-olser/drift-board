import { onError } from '@apollo/client/link/error';
import { syncStore } from '@/features/sync/SyncStore';

/** T5.3: the two conflict codes become toasts; the failed mutation's optimistic layer is dropped by Apollo. */
export const errorLink = onError(({ graphQLErrors }) => {
  for (const error of graphQLErrors ?? []) {
    const code = error.extensions?.['code'];
    if (code === 'CARD_GONE') {
      syncStore.toast('That card was deleted by someone else — your change was dropped.', 'error');
    } else if (code === 'VERSION_MISMATCH') {
      const current = error.extensions?.['current'] as
        { title?: string; updatedBy?: { name?: string } } | undefined;
      const who = current?.updatedBy?.name ?? 'someone else';
      syncStore.toast(
        `“${current?.title ?? 'This card'}” was changed by ${who} — your edit was reverted.`,
        'queued'
      );
    }
  }
});
