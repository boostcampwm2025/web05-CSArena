// TODO: 파라미터는 데모 이후 제거
export default function Preparing({
  time,
  onClick,
  stopTimer,
}: {
  time: number;
  onClick: () => void;
  stopTimer: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <div
            className="animate-pulse bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-8xl font-black text-transparent"
            style={{ fontFamily: 'Press Start 2P' }}
          >
            {/* TODO: 데모용 파라미터 사용 로직, 추후 제거 필요 */}
            {time}
          </div>
        </div>
        <div
          className="animate-pulse text-2xl font-bold text-cyan-300"
          style={{ fontFamily: 'Orbitron' }}
        >
          GET READY!
        </div>
      </div>

      {/* TODO: 데모 이후 버튼 제거 */}
      {/* Buttons for demonstration */}
      <div className="absolute bottom-4 left-4 z-50 flex gap-2">
        <button
          className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
          onClick={onClick}
        />
        <button
          className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
          onClick={stopTimer}
        />
      </div>
    </div>
  );
}
