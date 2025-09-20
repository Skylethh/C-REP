"use client";

import { useMemo } from 'react';
import { formatCo2eTons } from '@/lib/units';

export interface BarDatum { 
  label: string; 
  value: number;
  color?: string;
}

interface ModernBarChartProps {
  data: BarDatum[];
  title?: string;
  height?: number;
}

export default function ModernBarChart({ data, title = "Karşılaştırma", height = 320 }: ModernBarChartProps) {
  const { maxValue, chartData } = useMemo(() => {
    if (!data || data.length === 0) return { maxValue: 1, chartData: [] };
    
    const max = Math.max(...data.map(d => d.value));
    const maxVal = Math.max(max, 1);
    
    const colors = [
      'bg-gradient-to-t from-emerald-600/80 to-emerald-400/90',
      'bg-gradient-to-t from-sky-600/80 to-sky-400/90', 
      'bg-gradient-to-t from-purple-600/80 to-purple-400/90',
      'bg-gradient-to-t from-orange-600/80 to-orange-400/90',
      'bg-gradient-to-t from-pink-600/80 to-pink-400/90',
      'bg-gradient-to-t from-indigo-600/80 to-indigo-400/90',
      'bg-gradient-to-t from-teal-600/80 to-teal-400/90',
      'bg-gradient-to-t from-rose-600/80 to-rose-400/90',
    ];
    
    const enhanced = data.map((item, index) => ({
      ...item,
      color: item.color || colors[index % colors.length],
      percentage: (item.value / maxVal) * 100,
      formattedValue: formatCo2eTons(item.value, 2),
    }));
    
    return { maxValue: maxVal, chartData: enhanced };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/70 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-white/50">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2" />
              </svg>
            </div>
            <p className="text-sm">Henüz veri bulunmuyor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-white/70">{title}</h3>
        <div className="text-xs text-white/50">Y ekseni: tCO2e</div>
      </div>
      
      <div className="space-y-4" style={{ height: height - 80 }}>
        {chartData.map((item, index) => (
          <div key={index} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                  {item.label}
                </h4>
              </div>
              <div className="ml-3 text-right">
                <div className="text-sm font-semibold text-white">
                  {item.formattedValue.value}
                </div>
                <div className="text-xs text-white/60">
                  {item.formattedValue.unit}
                </div>
              </div>
            </div>
            
            <div className="relative">
              {/* Background track */}
              <div className="w-full h-8 bg-white/5 rounded-lg overflow-hidden shadow-inner">
                {/* Progress bar */}
                <div 
                  className={`h-full ${item.color} transition-all duration-700 ease-out group-hover:brightness-110 shadow-sm`}
                  style={{ 
                    width: `${Math.max(item.percentage, 2)}%`,
                    background: item.percentage < 5 ? 'linear-gradient(90deg, rgba(16,185,129,0.8) 0%, rgba(16,185,129,0.6) 100%)' : undefined
                  }}
                />
              </div>
              
              {/* Percentage indicator */}
              {item.percentage >= 15 && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 text-xs font-medium text-white/90 px-2"
                  style={{ left: `${Math.min(item.percentage - 8, 85)}%` }}
                >
                  {item.percentage.toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Scale indicators */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex justify-between text-xs text-white/40">
          <span>0</span>
          <span>{formatCo2eTons(maxValue * 0.5, 1).value}</span>
          <span>{formatCo2eTons(maxValue, 1).value} {formatCo2eTons(maxValue, 1).unit}</span>
        </div>
      </div>
    </div>
  );
}