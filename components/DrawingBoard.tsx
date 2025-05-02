"use client"
import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ExtrudeGeometry, Shape, MeshStandardMaterial, Mesh } from 'three';

interface DrawingBoardProps {
  onDrawingComplete: (geometry: ExtrudeGeometry) => void;
}

const DrawingBoard: React.FC<DrawingBoardProps> = ({ onDrawingComplete }) => {
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

  const completeDrawing = () => {
    if (points.length > 2) {
      const shape = new Shape();
      shape.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
      }
      shape.closePath();

      const extrudeSettings = {
        depth: 1,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 1
      };

      const geometry = new ExtrudeGeometry(shape, extrudeSettings);
      onDrawingComplete(geometry);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
    setCurrentPath([]);
  };

  const handleMouseLeave = () => {
    endStroke();
  };

  return (
    <div className="drawing-board-container bg-black bg-opacity-70 text-white p-4 rounded-lg">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border-2 border-black rounded bg-gray-200"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endStroke}
        onMouseLeave={handleMouseLeave}
      />
      <div className="flex gap-2 mt-2">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          onClick={completeDrawing}
        >
          Complete Drawing
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={clearCanvas}
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default DrawingBoard; 