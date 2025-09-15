"use client";

import { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  change, 
  trend = 'neutral',
  trendText,
  className = '' 
}: StatsCardProps) {
  return (
    <div className={`stats-card ${className}`}>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm text-white/80 mb-1.5 font-medium">{title}</p>
          <p className="text-2xl font-semibold highlight-text">{value}</p>
          
          {(typeof change !== 'undefined' || trendText) && (
            <div className="flex items-center mt-2.5 text-xs">
              {trend === 'up' && (
                <span className="flex items-center text-green-400 font-medium">
                  <ArrowUp size={14} className="mr-1.5" />
                  {change ? `${change}%` : ''}
                </span>
              )}
              {trend === 'down' && (
                <span className="flex items-center text-red-400 font-medium">
                  <ArrowDown size={14} className="mr-1.5" />
                  {change ? `${change}%` : ''}
                </span>
              )}
              <span className="text-white/70 ml-1">{trendText}</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="p-3 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10 rounded-xl shadow-inner">
            <div className="text-leaf-400">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
