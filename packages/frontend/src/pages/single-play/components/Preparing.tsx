import { usePreparing } from '../hooks/usePreparing';

export default function Preparing() {
  const { categories, isLoading } = usePreparing();

  return (
    <div className="relative z-10 flex h-full w-full flex-col items-center p-4">
      <div className="flex h-full w-full max-w-7xl flex-col items-center justify-center gap-10 p-4">
        {/* Header Text */}
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-4xl font-bold text-purple-300" style={{ fontFamily: 'Orbitron' }}>
            SELECT A CATEGORY
          </h2>
          <p className="text-2xl text-slate-400" style={{ fontFamily: 'Orbitron' }}>
            Choose a topic to practice and improve your skills
          </p>
        </div>

        {/* Category Area */}
        <div className="flex w-full flex-col items-stretch border-4 border-slate-600 bg-slate-700/50 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-10 shadow-purple-500/30">
          {isLoading ? (
            <div className="flex h-[416px] w-full items-center justify-center">
              {/* Rotating Animation */}
              <div className="relative h-48 w-48">
                {/* Outer Rotating circles */}
                <svg
                  className="absolute inset-0 animate-spin"
                  viewBox="0 0 100 100"
                  style={{ animationDuration: '3s' }}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    className="stroke-white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="197.92 65.97"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <div className="h-[416px] w-full overflow-y-auto pr-4 [scrollbar-gutter:stable]">
              {/* Category Grid */}
              <div className="grid w-full auto-rows-[180px] grid-cols-4 gap-6 overflow-visible py-4 pl-4">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    className="border-4 border-purple-400 bg-gradient-to-r from-slate-800/90 to-slate-900/90 p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:border-pink-400 hover:shadow-purple-500/50"
                  >
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center border-4 border-white bg-gradient-to-r from-cyan-500 to-blue-500">
                      <i className="ri-layout-grid-line text-4xl text-white" />
                    </div>
                    <h3
                      className="text-3xl font-bold text-white"
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {category.name}
                    </h3>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex w-full justify-end">
          <button
            className="border-2 border-slate-400 bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-3 text-2xl font-bold text-white transition-all duration-200 hover:scale-105 hover:from-slate-500 hover:to-slate-600"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-play-fill mr-2" />
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
