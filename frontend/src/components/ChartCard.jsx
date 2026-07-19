import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-insight-dark border border-insight-border px-3 py-2 rounded-lg shadow">
        <p className="text-gray-300 text-xs mb-1">{label}</p>
        <p className="text-white font-semibold text-sm">
          {payload[0].value.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function ChartCard({ data }) {

  // Convert your existing ['5Y','3Y','1Y'] into proper timeline labels
  const formattedData = [
    {
      label: `${new Date().getFullYear() - 5}`,
      value: data[0]?.value || 0,
    },
    {
      label: `${new Date().getFullYear() - 3}`,
      value: data[1]?.value || 0,
    },
    {
      label: `${new Date().getFullYear() - 1}`,
      value: data[2]?.value || 0,
    },
  ];

  return (
    <div className="bg-insight-dark border border-insight-border rounded-2xl p-5">
      
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>

            {/* subtle grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1f2937"
              vertical={false}
            />

            {/* X Axis with proper year labels */}
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            {/* Y Axis */}
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* smooth line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}