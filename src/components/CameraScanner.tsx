import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Zap,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Sliders,
} from 'lucide-react';
import { SAMPLE_INGREDIENT_SCENARIOS, SampleItem } from '../utils/samples';

interface CameraScannerProps {
  onIngredientsDetected: (data: {
    ingredients: any[];
    suggestedCuisines?: string[];
    chefTip?: string;
    photoUrl?: string;
  }) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  onViewPantry: () => void;
  pantryCount: number;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onIngredientsDetected,
  isAnalyzing,
  setIsAnalyzing,
  onViewPantry,
  pantryCount,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Camera Zoom state (1.0x to 4.0x)
  const [zoom, setZoom] = useState<number>(1.0);
  const [minZoom, setMinZoom] = useState<number>(1.0);
  const [maxZoom, setMaxZoom] = useState<number>(4.0);
  const [hasHardwareZoom, setHasHardwareZoom] = useState<boolean>(false);
  const [showZoomSlider, setShowZoomSlider] = useState<boolean>(false);

  // Apply zoom to MediaStreamTrack (hardware) and state (digital fallback)
  const applyZoom = async (targetZoom: number, activeStream?: MediaStream | null) => {
    const clampedZoom = Math.min(Math.max(targetZoom, minZoom), maxZoom);
    setZoom(clampedZoom);

    const s = activeStream !== undefined ? activeStream : stream;
    if (s) {
      const track = s.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
          if (capabilities && 'zoom' in capabilities) {
            await (track as any).applyConstraints({
              advanced: [{ zoom: clampedZoom }],
            });
            setHasHardwareZoom(true);
          }
        } catch (e) {
          // Hardware zoom constraint failed, digital fallback handles it smoothly
        }
      }
    }
  };

  // Start video stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      // Inspect hardware zoom capability if supported by browser/device
      const track = mediaStream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities && capabilities.zoom) {
          setMinZoom(capabilities.zoom.min || 1.0);
          setMaxZoom(capabilities.zoom.max || 4.0);
          setHasHardwareZoom(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setFacingMode(mode);
      setZoom(1.0);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access was not granted or not available. You can upload a photo or use a sample.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setZoom(1.0);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Capture frame from video stream with active zoom applied
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasHardwareZoom) {
      // Hardware camera handled magnification natively
      ctx.drawImage(video, 0, 0, width, height);
    } else if (zoom > 1.0) {
      // Digital zoom: crop centered magnified frame into canvas
      const cropW = width / zoom;
      const cropH = height / zoom;
      const cropX = (width - cropW) / 2;
      const cropY = (height - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, width, height);
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    stopCamera();
    setPreviewImage(dataUrl);
    analyzeImage(dataUrl);
  };

  // Handle uploaded image file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);
      stopCamera();
      analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send photo to Gemini server endpoint
  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setStatusMessage('Gemini AI is examining ingredients, produce, and spices...');

    try {
      const response = await fetch('/api/gemini/identify-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze image with Gemini');
      }

      const data = await response.json();
      onIngredientsDetected({
        ingredients: data.ingredients || [],
        suggestedCuisines: data.suggestedCuisines,
        chefTip: data.chefTip,
        photoUrl: base64Image,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert(`Could not identify ingredients: ${err.message || 'Please try another photo'}`);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Instant Sample Testing
  const handleSelectSample = async (sample: SampleItem) => {
    setIsAnalyzing(true);
    setStatusMessage(`Loading ${sample.title}...`);
    try {
      const res = await fetch(sample.imageUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(blob);
    } catch {
      const mockItems = sample.mockIngredients.map((name, i) => ({
        id: `mock-${Date.now()}-${i}`,
        name,
        category: 'Produce',
        confidence: 'high' as const,
        state: 'Fresh',
        quantity: 'Available',
        checked: true,
      }));
      onIngredientsDetected({
        ingredients: mockItems,
        suggestedCuisines: ['Comfort Food', 'Mediterranean'],
        chefTip: 'Fresh ingredients deliver the brightest flavors.',
        photoUrl: sample.imageUrl,
      });
      setIsAnalyzing(false);
    }
  };

  const zoomPresets = [1.0, 1.5, 2.0, 3.0];

  return (
    <div className="w-full max-w-lg mx-auto pb-24">
      {/* Top Banner */}
      <div className="px-4 pt-3 pb-2 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Gemini AI Food Vision
        </span>
        <h1 className="text-2xl font-extrabold text-stone-900 mt-2 tracking-tight">
          Snap Your Ingredients
        </h1>
        <p className="text-stone-600 text-xs mt-1">
          Take a photo of your fridge, countertop, or pantry with zoom to auto-detect what you have.
        </p>
      </div>

      {/* Main Viewfinder Area */}
      <div className="px-4 mt-2">
        <div className="relative aspect-4/3 w-full bg-stone-900 rounded-3xl overflow-hidden shadow-xl border border-stone-800 flex flex-col items-center justify-center">
          {/* Live Camera View */}
          {cameraActive ? (
            <>
              {/* Scaled Video for Digital Zoom Preview */}
              <div className="w-full h-full overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    transform: !hasHardwareZoom && zoom > 1.0 ? `scale(${zoom})` : 'none',
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Viewfinder Overlay Targeting Rectangles */}
              <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-12 h-12 border-t-2 border-l-2 border-amber-400 absolute top-0 left-0 rounded-tl-lg" />
                <div className="w-12 h-12 border-t-2 border-r-2 border-amber-400 absolute top-0 right-0 rounded-tr-lg" />
                <div className="w-12 h-12 border-b-2 border-l-2 border-amber-400 absolute bottom-0 left-0 rounded-bl-lg" />
                <div className="w-12 h-12 border-b-2 border-r-2 border-amber-400 absolute bottom-0 right-0 rounded-br-lg" />

                {/* Active Zoom Badge Indicator */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ZoomIn className="w-3 h-3 text-amber-400" />
                  {zoom.toFixed(1)}x
                </div>
              </div>

              {/* Floating Camera Zoom Controls Bar (1x, 1.5x, 2x, 3x) */}
              <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-1.5 z-10">
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-lg">
                  {zoomPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyZoom(preset)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        Math.abs(zoom - preset) < 0.1
                          ? 'bg-amber-500 text-stone-950 scale-105 shadow-xs'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}

                  {/* Zoom Fine-Tuning Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowZoomSlider(!showZoomSlider)}
                    className={`p-1 rounded-full transition-colors ml-1 ${
                      showZoomSlider ? 'text-amber-400 bg-white/20' : 'text-white/70 hover:text-white'
                    }`}
                    title="Fine tune zoom"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Continuous Zoom Slider when toggled */}
              {showZoomSlider && (
                <div className="absolute bottom-14 inset-x-8 bg-black/75 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 flex items-center gap-2.5 z-10 animate-fade-in shadow-xl">
                  <ZoomOut className="w-3.5 h-3.5 text-white/70" />
                  <input
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-white/30 rounded-lg"
                  />
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-mono font-bold text-white min-w-[32px] text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
              )}

              {/* Flip camera button */}
              <button
                onClick={toggleCameraFacing}
                type="button"
                className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-all active:scale-95"
                title="Switch Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          ) : previewImage ? (
            /* Preview of captured image */
            <div className="relative w-full h-full">
              <img
                src={previewImage}
                alt="Captured ingredients"
                className="w-full h-full object-cover"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-white font-semibold text-sm mt-4">
                    Gemini AI Vision Analyzing...
                  </p>
                  <p className="text-amber-200/90 text-xs mt-1 max-w-xs leading-relaxed">
                    {statusMessage}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Idle Placeholder */
            <div className="p-6 text-center text-stone-400 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-stone-800/80 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold text-base">Camera Ready with Zoom</h3>
              <p className="text-stone-400 text-xs mt-1 max-w-xs">
                Tap "Open Camera" to use 1x–4x zoom, or upload a photo of your food ingredients.
              </p>
            </div>
          )}

          {/* Camera Error Notice */}
          {cameraError && (
            <div className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-start gap-2 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Capture Controls */}
      <div className="px-4 mt-4">
        {cameraActive ? (
          <div className="flex items-center justify-between gap-3 bg-stone-900/90 p-3 rounded-2xl border border-stone-800">
            <button
              onClick={stopCamera}
              type="button"
              className="px-4 py-2.5 rounded-xl text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              type="button"
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-1 shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
              title="Capture Photo"
            >
              <div className="w-13 h-13 rounded-full border-2 border-white flex items-center justify-center bg-white/20">
                <div className="w-9 h-9 rounded-full bg-white shadow-xs" />
              </div>
            </button>

            <button
              onClick={toggleCameraFacing}
              type="button"
              className="px-4 py-2.5 rounded-xl text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Flip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startCamera('environment')}
              disabled={isAnalyzing}
              type="button"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-amber-600/25 transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Open Camera
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              type="button"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              Choose Photo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Pantry Status Banner */}
      {pantryCount > 0 && (
        <div className="px-4 mt-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                {pantryCount}
              </div>
              <div>
                <p className="text-emerald-900 font-semibold text-xs">
                  {pantryCount} Ingredient{pantryCount > 1 ? 's' : ''} Collected
                </p>
                <p className="text-emerald-700 text-[11px]">
                  Snap more items or view pantry to get Gemini recipes.
                </p>
              </div>
            </div>
            <button
              onClick={onViewPantry}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              View List →
            </button>
          </div>
        </div>
      )}

      {/* Instant Demo Presets Section */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Quick Test Samples
          </h2>
          <span className="text-[11px] text-stone-600 font-medium">1-Tap Analyze</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SAMPLE_INGREDIENT_SCENARIOS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              disabled={isAnalyzing}
              type="button"
              className="group text-left p-2.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="aspect-16/10 w-full rounded-xl overflow-hidden mb-2 relative">
                <img
                  src={sample.imageUrl}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="text-[10px] text-white font-medium bg-amber-600/90 px-1.5 py-0.5 rounded-md">
                    Click to Scan
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-stone-800 text-xs leading-snug line-clamp-1">
                {sample.title}
              </h3>
              <p className="text-stone-600 text-[10px] line-clamp-1 mt-0.5">
                {sample.subtitle}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy and Camera Tip */}
      <div className="px-6 mt-6 flex items-center justify-center gap-2 text-stone-600 text-[11px] text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
        <span>Images are processed directly by Gemini AI for ingredient recognition.</span>
      </div>
    </div>
  );
};
