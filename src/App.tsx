import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, Plus, X, Shuffle, ChevronDown, Film, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GradientType = 'mesh' | 'linear' | 'radial' | 'pattern';
type BackgroundType = 'Gradient' | 'Solid';

interface VariantConfig {
  id: string;
  type: GradientType;
  colors: string[];
  blobs?: { x: number; y: number; size: number; color: string }[];
  angle?: number;
  centerX?: number;
  centerY?: number;
  patternStyle?: string;
}

const INITIAL_COLORS = ['#f6b765', '#849bcf', '#4a8259', '#fbc2eb', '#fcd5ce'];
const NOISE_URL = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export default function App() {
  const [bgType, setBgType] = useState<BackgroundType>('Gradient');
  const [colors, setColors] = useState<string[]>(INITIAL_COLORS);
  const [type, setType] = useState<GradientType>('mesh');
  const [noise, setNoise] = useState(50);
  const [animate, setAnimate] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  
  const exportRef = useRef<HTMLDivElement>(null);

  // Generate 9 variants whenever colors or type changes
  const variants = useMemo(() => {
    const PATTERNS = ['lines', 'grid', 'dots', 'frost', 'horizontal', 'diagonal', 'crosshatch', 'blueprint', 'checkerboard'];

    return Array.from({ length: 9 }).map((_, i) => {
      // Inject white/light colors for a professional look
      const variantColors = [...colors];
      if (!variantColors.includes('#ffffff') && !variantColors.includes('#f8fafc')) {
        if (i % 3 === 0) variantColors.push('#ffffff');
        else if (i % 3 === 1) variantColors.unshift('#f8fafc');
        else variantColors[Math.floor(Math.random() * variantColors.length)] = '#ffffff';
      }

      const config: VariantConfig = {
        id: `${type}-${i}-${colors.join('-')}`,
        type,
        colors: variantColors,
      };

      if (type === 'mesh') {
        config.blobs = variantColors.map((color) => ({
          color,
          x: Math.floor(Math.random() * 100),
          y: Math.floor(Math.random() * 100),
          size: Math.floor(Math.random() * 60) + 40,
        }));
      } else if (type === 'linear') {
        config.angle = Math.floor(Math.random() * 360);
      } else if (type === 'radial') {
        config.centerX = Math.floor(Math.random() * 100);
        config.centerY = Math.floor(Math.random() * 100);
      } else if (type === 'pattern') {
        config.patternStyle = PATTERNS[i];
      }

      return config;
    });
  }, [colors, type]);

  useEffect(() => {
    setSelectedVariantIndex(0);
  }, [variants]);

  const handleAddColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (colors.length < 8) {
      setColors([...colors, e.target.value]);
    }
  };

  const handleRemoveColor = (indexToRemove: number) => {
    if (colors.length > 1) {
      setColors(colors.filter((_, i) => i !== indexToRemove));
    }
  };

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    setColors(newColors);
  };

  const handleRandomizeColors = () => {
    const count = Math.floor(Math.random() * 2) + 4; // 4 or 5 colors
    const newColors = Array.from({ length: count }).map(() => 
      '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    );
    setColors(newColors);
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(exportRef.current, {
        width: 1024,
        height: 1024,
        pixelRatio: 1,
      });
      const link = document.createElement('a');
      link.download = `background-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };

  const handleDownloadVideo = async () => {
    if (bgType !== 'Gradient') return;
    setIsExportingVideo(true);
    try {
      const style = getGradientStyle(activeVariant);

      // Create a 200% size container to capture the full gradient extent
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '2048px';
      tempDiv.style.height = '2048px';
      tempDiv.style.backgroundImage = style.backgroundImage as string;
      tempDiv.style.backgroundColor = style.backgroundColor as string;
      
      const hiddenContainer = exportRef.current?.parentElement;
      if (hiddenContainer) {
        hiddenContainer.appendChild(tempDiv);
      }

      const dataUrl = await htmlToImage.toPng(tempDiv, { width: 2048, height: 2048, pixelRatio: 1 });
      
      if (hiddenContainer) {
        hiddenContainer.removeChild(tempDiv);
      }

      const bgImg = new Image();
      bgImg.src = dataUrl;
      await new Promise((resolve, reject) => {
        bgImg.onload = resolve;
        bgImg.onerror = reject;
      });

      let patternImg: HTMLImageElement | null = null;
      if (activeVariant.type === 'pattern' && activeVariant.patternStyle) {
        const patDiv = document.createElement('div');
        patDiv.style.width = '1024px';
        patDiv.style.height = '1024px';
        Object.assign(patDiv.style, getPatternOverlayStyle(activeVariant.patternStyle));
        
        const hiddenContainer = exportRef.current?.parentElement;
        if (hiddenContainer) hiddenContainer.appendChild(patDiv);
        
        const patDataUrl = await htmlToImage.toPng(patDiv, { width: 1024, height: 1024, pixelRatio: 1 });
        if (hiddenContainer) hiddenContainer.removeChild(patDiv);
        
        patternImg = new Image();
        patternImg.src = patDataUrl;
        await new Promise((resolve, reject) => {
          patternImg!.onload = resolve;
          patternImg!.onerror = reject;
        });
      }

      const noiseImg = new Image();
      noiseImg.src = NOISE_URL.replace(/^url\("|"\)$/g, '');
      await new Promise((resolve, reject) => {
        noiseImg.onload = resolve;
        noiseImg.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      let mimeType = 'video/webm';
      let extension = 'webm';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        extension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      }

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const recordingPromise = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => {
          try {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gradient-animated-${Date.now()}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        recorder.onerror = reject;
      });

      recorder.start();

      const duration = 8000; // 8 seconds to match the CSS animation
      const startTime = performance.now();

      const drawFrame = (now: number) => {
        const elapsed = now - startTime;
        
        const progress = Math.min(elapsed / duration, 1);
        let shift = 0;
        // Replicate the CSS alternate animation (0% to 100% to 0%)
        if (progress <= 0.5) {
          shift = progress * 2;
        } else {
          shift = 2 - (progress * 2);
        }

        const x = -1024 * shift;
        const y = -512;

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(bgImg, x, y, 2048, 2048);

        if (patternImg) {
          if (activeVariant.patternStyle === 'frost') {
             ctx.globalCompositeOperation = 'overlay';
          } else {
             ctx.globalCompositeOperation = 'source-over';
          }
          ctx.drawImage(patternImg, 0, 0, 1024, 1024);
        }

        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = noise / 100;
        
        const pattern = ctx.createPattern(noiseImg, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, 1024, 1024);
        }
        ctx.globalAlpha = 1.0;

        if (elapsed < duration) {
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };

      requestAnimationFrame(drawFrame);
      await recordingPromise;

    } catch (err) {
      console.error('Failed to export video', err);
      alert('Failed to export video. Please try again.');
    } finally {
      setIsExportingVideo(false);
    }
  };

  const getGradientStyle = (config: VariantConfig) => {
    if (!config) return {};
    
    if (config.type === 'pattern') {
      if (config.colors.length === 1) return { backgroundColor: config.colors[0] };
      return { backgroundImage: `linear-gradient(135deg, ${config.colors.join(', ')})` };
    }
    
    if (config.type === 'mesh' && config.blobs) {
      const gradients = config.blobs.map(
        (b) => `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color} 0%, transparent ${b.size}%)`
      );
      return {
        backgroundImage: gradients.join(', '),
        backgroundColor: config.colors[0] || '#ffffff',
      };
    }
    
    if (config.type === 'linear') {
      return {
        backgroundImage: `linear-gradient(${config.angle}deg, ${config.colors.join(', ')})`,
      };
    }
    
    if (config.type === 'radial') {
      return {
        backgroundImage: `radial-gradient(circle at ${config.centerX}% ${config.centerY}%, ${config.colors.join(', ')})`,
      };
    }
    
    return {};
  };

  const getPatternOverlayStyle = (p: string): React.CSSProperties => {
    const color = 'rgba(0, 0, 0, 0.06)';
    const lightColor = 'rgba(255, 255, 255, 0.3)';
    switch (p) {
      case 'lines': return { backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px)`, backgroundSize: '40px 100%' };
      case 'grid': return { backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`, backgroundSize: '40px 40px' };
      case 'dots': return { backgroundImage: `radial-gradient(circle, ${color} 1.5px, transparent 1.5px)`, backgroundSize: '20px 20px' };
      case 'frost': return { backgroundImage: `linear-gradient(45deg, ${lightColor} 25%, transparent 25%, transparent 75%, ${lightColor} 75%, ${lightColor}), linear-gradient(45deg, ${lightColor} 25%, transparent 25%, transparent 75%, ${lightColor} 75%, ${lightColor})`, backgroundSize: '60px 60px', backgroundPosition: '0 0, 30px 30px', mixBlendMode: 'overlay' };
      case 'horizontal': return { backgroundImage: `linear-gradient(to bottom, ${color} 1px, transparent 1px)`, backgroundSize: '100% 40px' };
      case 'diagonal': return { backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 20px)` };
      case 'crosshatch': return { backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 20px), repeating-linear-gradient(-45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 20px)` };
      case 'blueprint': return { backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px), linear-gradient(to right, rgba(0,0,0,0.03) 2px, transparent 2px), linear-gradient(to bottom, rgba(0,0,0,0.03) 2px, transparent 2px)`, backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px' };
      case 'checkerboard': return { backgroundImage: `conic-gradient(${color} 90deg, transparent 90deg 180deg, ${color} 180deg 270deg, transparent 270deg)`, backgroundSize: '40px 40px' };
      default: return {};
    }
  };

  const activeVariant = variants[selectedVariantIndex];

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans text-gray-800">
      
      {/* Hidden 1024x1024 export container */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
        <div 
          ref={exportRef}
          style={{
            width: '1024px',
            height: '1024px',
            ...(bgType === 'Gradient' ? getGradientStyle(activeVariant) : { backgroundColor: colors[0] })
          }}
          className="relative overflow-hidden"
        >
          {bgType === 'Gradient' && activeVariant.type === 'pattern' && activeVariant.patternStyle && (
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={getPatternOverlayStyle(activeVariant.patternStyle)}
            />
          )}
          {bgType === 'Gradient' && (
            <div
              className="absolute inset-0 w-full h-full mix-blend-overlay"
              style={{ 
                opacity: noise / 100,
                backgroundImage: NOISE_URL,
                backgroundRepeat: 'repeat'
              }}
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 w-full max-w-[500px]">
        
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-[15px] font-medium text-gray-800 mb-3">Background</h2>
          <div className="relative">
            <select 
              value={bgType}
              onChange={(e) => setBgType(e.target.value as BackgroundType)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
            >
              <option value="Gradient">Gradient</option>
              <option value="Solid">Solid</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {bgType === 'Gradient' && (
          <div className="flex bg-gray-100/80 p-1 rounded-xl mb-5">
            {(['mesh', 'linear', 'radial', 'pattern'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-all duration-200",
                  type === t 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Main Preview */}
        <div className="w-full aspect-[1.8] rounded-2xl relative overflow-hidden mb-6 group shadow-inner">
          {bgType === 'Gradient' ? (
            <>
              <div 
                className={cn(
                  "absolute inset-0 w-full h-full transition-all duration-700 ease-in-out",
                  animate && "animate-gradient-shift"
                )}
                style={{
                  ...getGradientStyle(activeVariant),
                  backgroundSize: animate ? '200% 200%' : '100% 100%'
                }}
              />
              <div
                className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay"
                style={{ 
                  opacity: noise / 100,
                  backgroundImage: NOISE_URL,
                  backgroundRepeat: 'repeat'
                }}
              />
            </>
          ) : (
            <div 
              className="absolute inset-0 w-full h-full transition-colors duration-300"
              style={{ backgroundColor: colors[0] }}
            />
          )}

          {/* Pattern Layer */}
          {bgType === 'Gradient' && activeVariant.type === 'pattern' && activeVariant.patternStyle && (
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={getPatternOverlayStyle(activeVariant.patternStyle)}
            />
          )}

          {/* Download Buttons */}
          <div className="absolute bottom-3 right-3 flex gap-2">
            {animate && bgType === 'Gradient' && (
              <button 
                onClick={handleDownloadVideo}
                disabled={isExportingVideo}
                className="bg-white/80 hover:bg-white backdrop-blur-md p-2 rounded-lg text-gray-600 hover:text-gray-900 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Animated Video (MP4/WebM)"
              >
                {isExportingVideo ? <Loader2 size={18} className="animate-spin" /> : <Film size={18} />}
              </button>
            )}
            <button 
              onClick={handleDownload}
              className="bg-white/80 hover:bg-white backdrop-blur-md p-2 rounded-lg text-gray-600 hover:text-gray-900 transition-all shadow-sm"
              title="Download 1024x1024 Image"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6 mb-6">
          {/* Colors */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Colors</span>
            <div className="flex items-center gap-2">
              {colors.map((color, i) => (
                <div key={i} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(i, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div 
                    className="w-6 h-6 rounded-md shadow-sm border border-black/5"
                    style={{ backgroundColor: color }}
                  />
                  {colors.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveColor(i);
                      }}
                      className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-50"
                    >
                      <X size={10} className="text-gray-500 hover:text-red-500" />
                    </button>
                  )}
                </div>
              ))}
              
              {colors.length < 8 && (
                <div className="relative">
                  <input
                    type="color"
                    onChange={handleAddColor}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    title="Add color"
                  />
                  <button className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors bg-gray-50">
                    <Plus size={14} />
                  </button>
                </div>
              )}

              {/* Randomize Button */}
              <button 
                onClick={handleRandomizeColors}
                className="w-6 h-6 ml-1 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-colors bg-gray-50"
                title="Randomize Colors"
              >
                <Shuffle size={12} />
              </button>
            </div>
          </div>

          {bgType === 'Gradient' && (
            <>
              {/* Noise */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400 w-16">Noise</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={noise}
                  onChange={(e) => setNoise(Number(e.target.value))}
                  className="slider-custom flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Animate */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Animate</span>
                <button 
                  onClick={() => setAnimate(!animate)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative",
                    animate ? "bg-blue-500" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm",
                    animate ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Variants Grid */}
        {bgType === 'Gradient' && (
          <div className="grid grid-cols-3 gap-3">
            {variants.map((variant, i) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantIndex(i)}
                className={cn(
                  "aspect-[1.4] rounded-xl relative overflow-hidden transition-all",
                  selectedVariantIndex === i 
                    ? "ring-2 ring-blue-500 ring-offset-2" 
                    : "hover:ring-2 hover:ring-gray-200 hover:ring-offset-1"
                )}
              >
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={getGradientStyle(variant)}
                />
                {variant.type === 'pattern' && variant.patternStyle && (
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={getPatternOverlayStyle(variant.patternStyle)}
                  />
                )}
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay opacity-30"
                  style={{ 
                    backgroundImage: NOISE_URL,
                    backgroundRepeat: 'repeat'
                  }}
                />
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
