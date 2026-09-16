import { observer } from 'mobx-react-lite';
import { syncStore } from './SyncStore';
import styles from './Avatars.module.css';

/** Plain avatar chips for everyone connected to the board (T4.5); card-level presence is M9. */
export const Avatars = observer(function Avatars() {
  return (
    <div className={styles.row} aria-label="Connected peers">
      {syncStore.peers.map(peer => (
        <span
          key={peer.sessionId}
          className={styles.chip}
          style={{ background: peer.color }}
          title={peer.name}
        >
          {peer.name}
        </span>
      ))}
    </div>
  );
});
