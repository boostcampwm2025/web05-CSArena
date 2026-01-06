import TopBar from './in-game/TopBar';
import Preparing from './in-game/Preparing';
// import Playing from './in-game/Playing';
// import RoundResult from './in-game/RoundResult';

export default function InGame() {
  return (
    <div className="relative z-10 flex h-full w-full flex-col">
      <TopBar />

      {/* Main Content */}
      {/* TODO: need to connect the screens according to the game flow */}
      <Preparing />
      {/* <Playing /> */}
      {/* <RoundResult /> */}
    </div>
  );
}
