import { useTopbar } from '../hooks/useTopbar';

export default function TopBar() {
  const { onClickBackBtn } = useTopbar();

  return (
    <div className="flex items-start border-b-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4">
      <div className="flex items-center justify-center">
        <button
          className="border-2 border-slate-400 bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2 font-bold text-white transition-all duration-200 hover:scale-105 hover:from-slate-500 hover:to-slate-600"
          style={{ fontFamily: 'Orbitron' }}
          onClick={onClickBackBtn}
        >
          <i className="ri-arrow-left-line mr-2" />
          BACK
        </button>
        <h1
          className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text px-4 py-2 text-3xl font-black text-transparent"
          style={{ fontFamily: 'Orbitron' }}
        >
          <i className="ri-book-open-line mr-3" />
          SELF STUDY MODE
        </h1>
      </div>
    </div>
  );
}
