export default function TopBar() {
  return (
    <div className="border-b-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95">
      <div className="item-center flex w-full justify-between gap-4 px-8 py-4">
        {/* Player 1 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500">
            <i className="ri-user-star-line text-2xl text-white" />
          </div>
          <div className="flex flex-col text-left">
            <div
              className="text-sm font-bold text-cyan-300"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              CodeMaster
            </div>
            <div
              className="text-lg font-bold text-emerald-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              0
            </div>
          </div>
        </div>

        {/* Round Info */}
        <div className="text-center">
          <div className="text-xl font-bold text-pink-400" style={{ fontFamily: 'Orbitron' }}>
            ROUND 1 / 5
          </div>
          <div className="text-base font-bold text-amber-400" style={{ fontFamily: 'Orbitron' }}>
            TIME: 0s
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col text-right">
            <div
              className="text-sm font-bold text-pink-300"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              ByteNinja
            </div>
            <div
              className="text-lg font-bold text-emerald-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              0
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white bg-gradient-to-br from-pink-400 to-rose-500">
            <i className="ri-user-star-line text-2xl text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
