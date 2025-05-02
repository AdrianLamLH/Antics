"use client"
import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ExtrudeGeometry, Shape, MeshStandardMaterial, Mesh, Group } from 'three';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface DrawingBoardProps {
  onDrawingComplete: (geometry: any) => void;
  onClear: () => void;
}

export default function DrawingBoard({ onDrawingComplete, onClear }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'drawing' | 'preview'>('drawing');
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
    setPreviewUrl(null);
    setModelUrl(null);
    onClear();
  };

  const handleMouseLeave = () => {
    endStroke();
  };

  const convertTo3D = async () => {
    try {
      setIsConverting(true);
      const canvas = canvasRef.current;
      
      // Get the drawing as base64
      const imageData = canvas.toDataURL('image/png');
      
      // Send to our conversion API
      const response = await fetch('/api/convert-drawing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPreviewUrl(data.previewUrl);
        setModelUrl(data.modelUrl);
        onDrawingComplete(data.modelUrl);
      } else {
        console.error('Conversion failed:', data.error);
      }
    } catch (error) {
      console.error('Error converting drawing:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const ModelViewer = ({ url }: { url: string }) => {
    const [model, setModel] = useState<Group | null>(null);
    const loader = new GLTFLoader();

    useEffect(() => {
      if (url) {
        const base64Data = url.split(',')[1];
        const binaryData = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binaryData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }

        loader.parse(arrayBuffer, '', (gltf) => {
          setModel(gltf.scene);
        });
      }
    }, [url]);

    if (!model) return null;

    return (
      <primitive object={model} scale={1} />
    );
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={() => setActiveTab('drawing')}
          className={`px-4 py-2 rounded ${
            activeTab === 'drawing'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Drawing
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 rounded ${
            activeTab === 'preview'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
          disabled={!modelUrl}
        >
          3D Preview
        </button>
      </div>

      <div className="relative w-[800px] h-[600px] border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        {activeTab === 'drawing' ? (
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
        ) : (
          modelUrl && (
            <div className="w-full h-full">
              <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <ModelViewer url={modelUrl} />
                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              </Canvas>
            </div>
          )
        )}
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
          disabled={isConverting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isConverting ? 'Converting...' : 'Convert to 3D'}
        </button>
      </div>
    </div>
  );
} 