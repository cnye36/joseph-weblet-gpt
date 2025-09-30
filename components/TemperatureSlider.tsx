'use client';

import { useEffect, useRef } from 'react';

interface TemperatureSliderProps {
  defaultValue: number;
}

export default function TemperatureSlider({ defaultValue }: TemperatureSliderProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    const hiddenInput = hiddenInputRef.current;
    
    if (slider && hiddenInput) {
      function updateSlider() {
        if (!slider || !hiddenInput) return;
        const value = parseFloat(slider.value);
        const percentage = value * 100;
        slider.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
        hiddenInput.value = value.toString();
      }
      
      slider.addEventListener('input', updateSlider);
      updateSlider(); // Initialize
      
      return () => {
        slider.removeEventListener('input', updateSlider);
      };
    }
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Precise & Consistent (0.0)</span>
        <span>Balanced (0.5)</span>
        <span>Creative & Varied (1.0)</span>
      </div>
      <input
        ref={sliderRef}
        name="temperature"
        type="range"
        min={0}
        max={1}
        step={0.1}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        defaultValue={defaultValue}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
            defaultValue * 100
          }%, #e5e7eb ${defaultValue * 100}%, #e5e7eb 100%)`,
        }}
      />
      <div className="text-xs text-gray-500">
        Lower values (0.0-0.3) produce more consistent, predictable
        responses. Higher values (0.7-1.0) generate more creative and
        varied outputs.
      </div>
      <input
        ref={hiddenInputRef}
        type="hidden"
        name="temperature"
        value={defaultValue}
        id="temperature-value"
      />
    </div>
  );
}
