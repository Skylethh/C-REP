"use client";

import { useEffect, useRef } from 'react';

interface EmissionData {
  type: string;
  value: number;
}

interface EmissionsChartProps {
  data: EmissionData[];
  total: number;
}

export function EmissionsChart({ data, total }: EmissionsChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);
    
    // Configuration
    const width = chartRef.current.width;
    const height = chartRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    // Colors for different emission types
    const colors = [
      'rgba(16, 185, 129, 0.8)',  // green
      'rgba(14, 165, 233, 0.8)',  // blue
      'rgba(249, 115, 22, 0.8)',  // orange
      'rgba(139, 92, 246, 0.8)',  // purple
      'rgba(236, 72, 153, 0.8)',  // pink
    ];
    
    // Calculate total for percentages
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    
    // Draw pie chart
    let startAngle = -0.5 * Math.PI; // Start at top
    
    data.forEach((item, index) => {
      const sliceAngle = (item.value / totalValue) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Fill with color
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      
      // Draw slice border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Calculate label position
      const labelAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;
      
      // Draw percentage if slice is big enough
      if (sliceAngle > 0.2) {
        const percentage = Math.round((item.value / totalValue) * 100);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage}%`, labelX, labelY);
      }
      
      startAngle = endAngle;
    });
    
    // Draw center circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    
    // Draw total in center
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total.toFixed(1)}`, centerX, centerY - 10);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('kg CO₂e', centerX, centerY + 10);
    
  }, [data, total]);
  
  // Generate legend items (clickable to /entries with filters)
  const legendItems = data.map((item, index) => {
    const colors = [
      'bg-emerald-500',
      'bg-sky-500',
      'bg-orange-500',
      'bg-purple-500',
      'bg-pink-500',
    ];
    
    return (
      <a
        key={index}
        href={`/entries?type=${encodeURIComponent(item.type)}`}
        className="flex items-center gap-2 hover:text-white"
      >
        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
        <span className="text-xs text-white/70">{item.type}</span>
        <span className="text-xs font-medium">{item.value.toFixed(1)} kg</span>
      </a>
    );
  });
  
  return (
    <div className="w-full">
      <div className="flex justify-center mb-4">
        <canvas 
          ref={chartRef} 
          width={240} 
          height={240}
          className="max-w-full"
        ></canvas>
      </div>
      
      <div ref={legendRef} className="grid grid-cols-2 gap-2 mt-4">
        {legendItems}
      </div>
    </div>
  );
}
