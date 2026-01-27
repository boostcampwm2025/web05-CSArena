import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TierHistoryItem } from '@/shared/type';

type TierHistoryChartProps = {
  data: TierHistoryItem[];
};

export function TierHistoryChart({ data }: TierHistoryChartProps) {
  // 빈 데이터 체크
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full flex-col border-2 border-purple-400 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-3">
        <h3 className="mb-2 text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
          <i className="ri-line-chart-line mr-2 text-purple-400" />
          Tier History
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400" style={{ fontFamily: 'Orbitron' }}>
            No tier history data
          </p>
        </div>
      </div>
    );
  }

  // 날짜순으로 정렬 (오래된 것부터 = 왼쪽부터 우상향)
  const sortedData = [...data].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );

  const formattedData = sortedData.map((point) => ({
    ...point,
    displayDate: new Date(point.changedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  // Calculate Y-axis domain based on user's tierPoint range
  const tierPoints = sortedData.map((point) => point.tierPoint);
  const minTierPoint = Math.min(...tierPoints);
  const maxTierPoint = Math.max(...tierPoints);

  // Determine Y-axis range with tier boundaries
  const yAxisMin = Math.floor(minTierPoint / 500) * 500;
  const yAxisMax = Math.ceil(maxTierPoint / 500) * 500;

  // Generate ticks at tier boundaries within the range
  const tierBoundaries = [0, 1000, 1500, 2000, 2500, 3000];
  const yAxisTicks = tierBoundaries.filter((tick) => tick >= yAxisMin && tick <= yAxisMax);

  return (
    <div className="flex h-full flex-col border-2 border-purple-400 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-3">
      <h3 className="mb-2 text-sm font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
        <i className="ri-line-chart-line mr-2 text-purple-400" />
        Tier History
      </h3>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
            <defs>
              <linearGradient id="tierGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

            <XAxis
              dataKey="displayDate"
              stroke="#67e8f9"
              style={{ fontFamily: 'Orbitron', fontSize: '10px' }}
            />

            <YAxis
              domain={[yAxisMin, yAxisMax]}
              ticks={yAxisTicks}
              stroke="#67e8f9"
              style={{ fontFamily: 'Orbitron', fontSize: '9px' }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '2px solid #06b6d4',
                borderRadius: '4px',
                fontFamily: 'Orbitron',
                fontSize: '10px',
              }}
              labelStyle={{ color: '#67e8f9' }}
              itemStyle={{ color: '#a855f7' }}
              formatter={(value, _name, props) => {
                const tier = props.payload?.tier || '';

                return [`${value} (${tier})`, 'Tier Point'];
              }}
            />

            <Line
              type="monotone"
              dataKey="tierPoint"
              stroke="url(#tierGradient)"
              strokeWidth={2}
              dot={{ fill: '#a855f7', r: 4, stroke: '#06b6d4', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
