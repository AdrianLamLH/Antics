"use client"
import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry, Shape } from 'three';

interface DrawingBoardProps {
  onDrawingComplete: (geometry: THREE.ExtrudeGeometry, color: string, physicsProps: {
    mass: number;
    restitution: number;
    friction: number;
    linearDamping: number;
    angularDamping: number;
  }) => void;
  onClear: () => void;
}

const DrawingBoard = ({ onDrawingComplete, onClear }: DrawingBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [paths, setPaths] = useState<{ points: { x: number; y: number }[]; color: string }[]>([]);
  const [currentPath, setCurrentPath] = useState<{ points: { x: number; y: number }[]; color: string } | null>(null);
  const [showObjectList, setShowObjectList] = useState(false);

  const colors = [
    '#ff0000', // Red
    '#00ff00', // Green
    '#0000ff', // Blue
    '#ffff00', // Yellow
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ffa500', // Orange
    '#800080', // Purple
    '#008000', // Dark Green
    '#000000', // Black
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Set initial canvas style
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;

    // Draw all existing paths
    paths.forEach(path => {
      if (path.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
    });

    // Draw current path if exists
    if (currentPath && currentPath.points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = currentPath.color;
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      currentPath.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [paths, currentPath]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath({
      points: [{ x, y }],
      color: selectedColor
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentPath) return;

    setIsDrawing(false);
    setPaths(prev => [...prev, currentPath]);
    setCurrentPath(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPaths([]);
    setCurrentPath(null);
  };

  const convertTo3D = () => {
    if (paths.length === 0) return;

    // Create a shape from all paths
    const shape = new THREE.Shape();
    let isFirstPath = true;

    // Combine all paths into a single shape
    paths.forEach(path => {
      if (path.points.length > 0) {
        // Normalize points to be between -1 and 1
        const normalizedPoints = path.points.map(point => ({
          x: (point.x / 200) - 1,
          y: -((point.y / 200) - 1)
        }));

        if (isFirstPath) {
          shape.moveTo(normalizedPoints[0].x, normalizedPoints[0].y);
          isFirstPath = false;
        } else {
          shape.lineTo(normalizedPoints[0].x, normalizedPoints[0].y);
        }

        normalizedPoints.slice(1).forEach(point => {
          shape.lineTo(point.x, point.y);
        });
      }
    });

    // Create 3D geometry
    const extrudeSettings = {
      steps: 1,
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Define physics properties
    const physicsProps = {
      mass: 1.0,           // Mass of the object
      restitution: 0.0,    // No bounce
      friction: 0.7,       // High friction to prevent sliding
      linearDamping: 0.9,  // High damping to quickly stop movement
      angularDamping: 0.9  // High angular damping to prevent spinning
    };

    // Use the color of the first path for the entire object
    onDrawingComplete(geometry, paths[0].color, physicsProps);
    
    // Clear the canvas after converting to 3D
    clearCanvas();
  };

  const deletePath = (index: number) => {
    setPaths(prev => prev.filter((_, i) => i !== index));
  };

  const deleteAllPaths = () => {
    setPaths([]);
    setCurrentPath(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 flex-wrap justify-center">
        {colors.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded-full border-2 ${
              selectedColor === color ? 'border-white' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={clearCanvas}
          >
            Clear
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={convertTo3D}
          >
            Convert to 3D
          </button>
        </div>
        
        {/* Object List Section */}
        <div className="mt-4">
          <button
            className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded flex items-center justify-between"
            onClick={() => setShowObjectList(prev => !prev)}
          >
            <span className="font-semibold">Drawn Objects ({paths.length})</span>
            <span>{showObjectList ? '▼' : '▶'}</span>
          </button>
          
          {showObjectList && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white">
              {paths.map((path, index) => (
                <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: path.color }}
                    />
                    <span>Object {index + 1}</span>
                  </div>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                    onClick={() => deletePath(index)}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {paths.length > 0 && (
                <div className="border-t mt-2 pt-2 px-2">
                  <button
                    className="w-full px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                    onClick={deleteAllPaths}
                  >
                    Delete All Objects
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingBoard; 