'use client';

import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatNet, formatRate } from '@/lib/exams/catalog';

const axisTick = { fill: 'var(--study-muted)', fontSize: 12 };
const gridStroke = 'var(--study-border)';

function niceCeiling(value) {
  if (value <= 10) return 10;
  const step = value <= 50 ? 10 : value <= 120 ? 20 : 40;
  return Math.ceil(value / step) * step;
}

function RateTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="exam-chart-tooltip">
      <span><i style={{ background: payload[0].color }} />{row.shortName}</span>
      <strong>{row.publisher}</strong>
      <small>{row.label}</small>
      <p>{formatNet(row.net)} / {row.questionTotal} net · <b>{formatRate(row[row.code])}</b></p>
    </div>
  );
}

export function RateOverviewChart({ rows, series }) {
  return (
    <div className="exam-chart" role="img" aria-label="Tüm sınavların başarı oranı gelişimi">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke={gridStroke} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={8} interval="preserveStartEnd" minTickGap={18} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(value) => `%${value}`} />
          <Tooltip content={<RateTooltip />} cursor={{ stroke: 'var(--study-border-strong)', strokeDasharray: '4 4' }} />
          {series.map((item) => (
            <Line
              key={item.code}
              type="monotone"
              dataKey={item.code}
              name={item.shortName}
              stroke={item.color}
              strokeWidth={3}
              connectNulls
              dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--study-surface)' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: item.color }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function NetTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="exam-chart-tooltip">
      <strong>{row.publisher}</strong>
      <small>{row.label}</small>
      <p><b>{formatNet(row.net)}</b> / {row.questionTotal} net · {formatRate(row.rate)}</p>
    </div>
  );
}

export function NetTrendChart({ points, maxValue, color, average, ariaLabel = 'Net gelişimi' }) {
  const top = niceCeiling(Math.max(maxValue || 0, ...points.map((point) => point.net), 1));
  return (
    <div className="exam-chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke={gridStroke} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={8} interval="preserveStartEnd" minTickGap={18} />
          <YAxis domain={[0, top]} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
          <Tooltip content={<NetTooltip />} cursor={{ stroke: 'var(--study-border-strong)', strokeDasharray: '4 4' }} />
          {average > 0 && points.length > 2 && (
            <ReferenceLine y={average} stroke="var(--study-muted)" strokeDasharray="5 5" label={{ value: `Ort. ${formatNet(average, 1)}`, position: 'insideTopRight', fill: 'var(--study-muted)', fontSize: 11 }} />
          )}
          <Line
            type="monotone"
            dataKey="net"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--study-surface)' }}
            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
