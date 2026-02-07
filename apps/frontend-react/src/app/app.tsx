import { GamePhaser } from './components/GamePhaser';
import styles from './app.module.css';

export function App() {
  return (
    <div className={styles.app}>
      <GamePhaser />
    </div>
  );
}

export default App;
