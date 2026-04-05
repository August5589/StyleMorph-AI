/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Palette, 
  Maximize2,
  Key,
  CheckCircle2
} from 'lucide-react';
import { cn } from './lib/utils';

// Types
type ImageSize = "1K" | "2K" | "4K";

interface StylePreset {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon lights, futuristic city vibes, high contrast', preview: 'https://picsum.photos/seed/cyberpunk/400/400' },
  { id: 'oil-painting', name: 'Oil Painting', description: 'Classic textured brushstrokes, rich colors', preview: 'https://picsum.photos/seed/oilpainting/400/400' },
  { id: 'studio-ghibli', name: 'Studio Ghibli', description: 'Whimsical anime style, soft lighting, nature-focused', preview: 'https://picsum.photos/seed/ghibli/400/400' },
  { id: 'vaporwave', name: 'Vaporwave', description: '80s aesthetic, pastel pinks and purples, retro-futurism', preview: 'https://picsum.photos/seed/vaporwave/400/400' },
  { id: 'sketch', name: 'Pencil Sketch', description: 'Hand-drawn graphite look, detailed shading', preview: 'https://picsum.photos/seed/sketch/400/400' },
];

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_PRESETS[0].id);
  const [customStyle, setCustomStyle] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per guidelines
      setHasApiKey(true);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSourceImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    multiple: false
  } as any);

  const generateImage = async () => {
    if (!sourceImage) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      // Re-verify API key selection right before call
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await handleOpenKeyDialog();
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-pro-image-preview";

      const styleDescription = selectedStyle === 'custom' 
        ? customStyle 
        : STYLE_PRESETS.find(p => p.id === selectedStyle)?.description;

      const base64Data = sourceImage.split(',')[1];

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/png",
              },
            },
            {
              text: `Transform this image into the following style: ${styleDescription}. Maintain the core composition and subjects but completely re-imagine them in the specified artistic style.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("No image was generated in the response.");
      }

    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key issue. Please select your key again.");
        setHasApiKey(false);
      } else {
        setError(err.message || "An unexpected error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `stylemorph-${selectedStyle}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              StyleMorph AI
            </h1>
          </div>
          
          {!hasApiKey ? (
            <button 
              onClick={handleOpenKeyDialog}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm font-medium"
            >
              <Key className="w-4 h-4" />
              Select API Key
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              API Key Ready
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-5 space-y-8">
            {/* Step 1: Upload */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-lg font-semibold">Upload Source Image</h2>
              </div>
              
              <div 
                {...getRootProps()} 
                className={cn(
                  "relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group",
                  isDragActive ? "border-purple-500 bg-purple-500/5" : "border-white/10 hover:border-white/20 bg-white/5",
                  sourceImage ? "border-solid" : ""
                )}
              >
                <input {...getInputProps()} />
                {sourceImage ? (
                  <>
                    <img 
                      src={sourceImage} 
                      alt="Source" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-sm font-medium">Click to change image</p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-white/40" />
                    </div>
                    <p className="text-sm text-white/60">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      Supports JPG, PNG, WEBP
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Style */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-lg font-semibold">Choose Artistic Style</h2>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all group",
                      selectedStyle === style.id ? "border-purple-500 ring-2 ring-purple-500/20" : "border-transparent grayscale hover:grayscale-0"
                    )}
                  >
                    <img 
                      src={style.preview} 
                      alt={style.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] font-bold uppercase tracking-wider">{style.name}</p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setSelectedStyle('custom')}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center gap-2 bg-white/5",
                    selectedStyle === 'custom' ? "border-purple-500 ring-2 ring-purple-500/20" : "border-white/10 hover:bg-white/10"
                  )}
                >
                  <Palette className="w-6 h-6 text-white/40" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Custom</p>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {selectedStyle === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      placeholder="Describe your custom style (e.g., 'A dark gothic watercolor with gold leaf accents...')"
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px] resize-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Step 3: Size */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="text-lg font-semibold">Output Quality</h2>
              </div>
              <div className="flex gap-2">
                {(["1K", "2K", "4K"] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setImageSize(size)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2",
                      imageSize === size 
                        ? "bg-white text-black border-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Maximize2 className="w-4 h-4" />
                    {size}
                  </button>
                ))}
              </div>
            </section>

            {/* Generate Button */}
            <button
              onClick={generateImage}
              disabled={!sourceImage || isGenerating || (selectedStyle === 'custom' && !customStyle)}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden group",
                !sourceImage || isGenerating || (selectedStyle === 'custom' && !customStyle)
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20"
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Transform Image
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-7">
            <div className="sticky top-28">
              <div className="relative aspect-square rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center group">
                <AnimatePresence mode="wait">
                  {generatedImage ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full relative"
                    >
                      <img 
                        src={generatedImage} 
                        alt="Generated Result" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-6 right-6 flex gap-2">
                        <button 
                          onClick={downloadImage}
                          className="p-3 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-colors"
                          title="Download Image"
                        >
                          <Download className="w-6 h-6" />
                        </button>
                      </div>
                    </motion.div>
                  ) : isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6"
                    >
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                        <Sparkles className="w-8 h-8 text-purple-500 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xl font-bold text-white/80">Applying {selectedStyle} style...</p>
                        <p className="text-sm text-white/40">This usually takes about 10-20 seconds</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 text-white/20"
                    >
                      <ImageIcon className="w-24 h-24" />
                      <p className="text-lg font-medium">Your masterpiece will appear here</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comparison Hint */}
              {generatedImage && (
                <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/60">Style Applied</p>
                    <p className="text-lg font-bold text-purple-400 capitalize">{selectedStyle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white/60">Resolution</p>
                    <p className="text-lg font-bold text-white">{imageSize}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-white/40">
            Powered by Gemini 3 Pro Image & Google AI Studio
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Billing Docs
            </a>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <p>© 2026 StyleMorph AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
