"use client"
import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry, Shape } from 'three';

interface DrawingBoardProps {
  onDrawingComplete: (geometry: ExtrudeGeometry) => void;
  onClear: () => void;
}

export default function DrawingBoard({ onDrawingComplete, onClear }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPath(prev => [...prev, { x, y }]);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endStroke = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setPoints(prev => [...prev, ...currentPath]);
    setCurrentPath([]);
  };

  const convertTo3D = () => {
    if (points.length < 3) return;

    // Create a shape from the points
    const shape = new Shape();
    
    // Normalize points to be between -1 and 1
    const normalizedPoints = points.map(p => ({
      x: (p.x / canvasRef.current!.width) * 2 - 1,
      y: -((p.y / canvasRef.current!.height) * 2 - 1) // Flip Y coordinate
    }));

    // Move to first point
    shape.moveTo(normalizedPoints[0].x, normalizedPoints[0].y);
    
    // Draw lines to subsequent points
    for (let i = 1; i < normalizedPoints.length; i++) {
      shape.lineTo(normalizedPoints[i].x, normalizedPoints[i].y);
    }
    
    // Close the shape
    shape.closePath();

    // Create extrude settings
    const extrudeSettings = {
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    };

    // Create the geometry
    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    
    // Pass the geometry to the parent component
    onDrawingComplete(geometry);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
    setCurrentPath([]);
    onClear();
  };

  const handleMouseLeave = () => {
    endStroke();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-[800px] h-[600px] border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="absolute top-0 left-0 bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endStroke}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      <div className="flex space-x-4">
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear
        </button>
        <button
          onClick={convertTo3D}
          disabled={points.length < 3}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          Convert to 3D
        </button>
      </div>
    </div>
  );
} 