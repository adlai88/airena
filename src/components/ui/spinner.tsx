import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export const Spinner = ({ size = 20, color = "#8f8f8f" }: SpinnerProps) => {
  return (
    <div 
      className="inline-block animate-spin"
      style={{ 
        width: size, 
        height: size,
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%'
      }}
    />
  );
};