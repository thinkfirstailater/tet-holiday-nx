import { Route, Routes } from 'react-router-dom';
import { GamePhaser } from './components/GamePhaser';
import { HomePage } from './pages/HomePage';
import { HorseRacingPage } from './pages/HorseRacingPage';
import { HostPage } from './pages/HostPage';
import { JoinPage } from './pages/JoinPage';
import { Navigation } from './components/Navigation';
import styles from './app.module.css';

import { ShakeGame } from './components/shake-game/ShakeGame';
import { ShootGame } from './components/shoot-game/ShootGame';
import { MoneyWheelGame } from './components/money-wheel/MoneyWheelGame';

export function App() {
  return (
    <div className={styles.app}>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dua-ngua" element={<HorseRacingPage />} />
        <Route path="/dua-ngua/offline" element={<GamePhaser />} />
        <Route path="/dua-ngua/host" element={<HostPage />} />
        <Route path="/dua-ngua/join" element={<JoinPage />} />
        <Route path="/rung-hoa" element={<ShakeGame />} />
        <Route path="/ban-xi" element={<ShootGame />} />
        <Route path="/xoay-tien" element={<MoneyWheelGame />} />
      </Routes>
    </div>
  );
}

export default App;
