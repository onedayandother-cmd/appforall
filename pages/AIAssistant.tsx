import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Sparkles, ImagePlus, Video, Image as ImageIcon, Search, MapPin, Mic, FileVideo, Brain, Speaker, Upload, Loader2, Play } from 'lucide-react';

type ToolType = 'EDIT_IMG' | 'VEO' | 'GEN_IMG' | 'SEARCH' | 'MAPS' | 'LIVE' | 'VIDEO_ANALYSIS' | 'THINKING' | 'TTS';

// Local interface for type safety when casting window.aistudio
interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

export const AIAssistant: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('EDIT_IMG');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  
  // Inputs
  const [inputText, setInputText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  
  // Configs
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);

  // Live API State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const resetState = () => {
    setLoading(false);
    setResponse('');
    setMediaUrl('');
    setInputText('');
    setUploadedFile(null);
    setFileBase64('');
    setGroundingChunks([]);
    setLiveLog([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setFileBase64(res.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const getClient = async (requiresPaidKey = false) => {
    const aistudio = (window as any).aistudio as AIStudioClient | undefined;
    // Only prompt for key selection if specifically required by the model (Veo, Imagen 3 Pro)
    if (requiresPaidKey && aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await aistudio.openSelectKey();
        }
    }
    // Always use process.env.API_KEY to get the currently injected key
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  };

  const executeAction = async () => {
    const aistudio = (window as any).aistudio as AIStudioClient | undefined;
    if (!process.env.API_KEY && !aistudio) {
        alert("API Key missing");
        return;
    }
    setLoading(true);
    setResponse('');
    setMediaUrl('');
    setGroundingChunks([]);

    try {
        if (activeTool === 'EDIT_IMG') {
            const ai = await getClient();
            if (!fileBase64) return alert('Please upload an image');
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: uploadedFile?.type || 'image/jpeg', data: fileBase64 } },
                        { text: inputText || 'Edit this image' }
                    ]
                }
            });
            for (const part of result.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    setMediaUrl(`data:image/png;base64,${part.inlineData.data}`);
                } else if (part.text) {
                    setResponse(prev => prev + part.text);
                }
            }

        } else if (activeTool === 'VEO') {
            const ai = await getClient(true); // Requires paid key
            if (!fileBase64) return alert('Please upload an image');
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                image: { imageBytes: fileBase64, mimeType: uploadedFile?.type || 'image/jpeg' },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '9:16' // Portrait for mobile app
                }
            });

            setResponse('Generating video... (this may take a minute)');
            
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({operation: operation});
            }
            
            const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (uri) {
                // Fetch using the URI + API Key
                const vidRes = await fetch(`${uri}&key=${process.env.API_KEY}`);
                const blob = await vidRes.blob();
                setMediaUrl(URL.createObjectURL(blob));
                setResponse('Video generated successfully!');
            }

        } else if (activeTool === 'GEN_IMG') {
            const ai = await getClient(true); // High quality image gen requires paid key usually if using pro model
            if (!inputText) return alert('Enter a prompt');
            const result = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview', // High quality model
                contents: { parts: [{ text: inputText }] },
                config: { imageConfig: { imageSize: imgSize, aspectRatio: '1:1' } }
            });
            
            for (const part of result.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    setMediaUrl(`data:image/png;base64,${part.inlineData.data}`);
                }
            }

        } else if (activeTool === 'SEARCH') {
            const ai = await getClient();
            if (!inputText) return alert('Enter a query');
            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: inputText,
                config: { tools: [{ googleSearch: {} }] }
            });
            setResponse(result.text || 'No text response');
            setGroundingChunks(result.candidates?.[0]?.groundingMetadata?.groundingChunks || []);

        } else if (activeTool === 'MAPS') {
            const ai = await getClient();
            if (!inputText) return alert('Enter a query');
            // Maps grounding is only supported in Gemini 2.5 series
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: inputText,
                config: { 
                    tools: [{ googleMaps: {} }],
                    // Default location to Cairo for relevance
                    toolConfig: { retrievalConfig: { latLng: { latitude: 30.0444, longitude: 31.2357 } } }
                }
            });
            setResponse(result.text || 'No text response');
            setGroundingChunks(result.candidates?.[0]?.groundingMetadata?.groundingChunks || []);

        } else if (activeTool === 'VIDEO_ANALYSIS') {
            const ai = await getClient();
            if (!fileBase64) return alert('Please upload a video');
            // Using inlineData for small clips
            const result = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: uploadedFile?.type || 'video/mp4', data: fileBase64 } },
                        { text: inputText || 'Describe this video' }
                    ]
                }
            });
            setResponse(result.text || '');

        } else if (activeTool === 'THINKING') {
            const ai = await getClient();
            if (!inputText) return alert('Enter a complex query');
            const result = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: inputText,
                config: {
                    thinkingConfig: { thinkingBudget: 16000 }, // Enable thinking
                    maxOutputTokens: undefined // Prevent blocking thinking
                }
            });
            setResponse(result.text || '');

        } else if (activeTool === 'TTS') {
            const ai = await getClient();
            if (!inputText) return alert('Enter text');
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text: inputText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                }
            });
            const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                playBase64Audio(audioData);
            }
        }

    } catch (e: any) {
        console.error(e);
        if (e.message?.includes('API key')) {
            setResponse('Error: Invalid API Key. Please verify your settings.');
        } else {
            setResponse('Error: ' + e.message);
        }
    } finally {
        setLoading(false);
    }
  };

  // --- Live API Logic ---
  const toggleLive = async () => {
    if (isLiveConnected) {
        // Simple reload to stop/reset audio contexts cleanly in this demo environment
        window.location.reload(); 
        return;
    }

    try {
        setIsLiveConnected(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = ac;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => setLiveLog(p => [...p, 'Connected']),
                onmessage: async (msg: LiveServerMessage) => {
                    const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audio) {
                         const buffer = await decodeAudioData(decode(audio), ac);
                         playAudioBuffer(buffer, ac);
                    }
                    if (msg.serverContent?.turnComplete) {
                        setLiveLog(p => [...p, 'Turn Complete']);
                    }
                },
                onclose: () => {
                    setLiveLog(p => [...p, 'Closed']);
                    setIsLiveConnected(false);
                },
                onerror: (e) => {
                    console.error(e);
                    setLiveLog(p => [...p, 'Error occurred']);
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
            }
        });

        // Input Audio Stream
        const source = ac.createMediaStreamSource(stream);
        const processor = ac.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = inputData[i] * 32768;
            }
            const b64 = encode(new Uint8Array(pcmData.buffer));
            
            // NOTE: Only call session methods after promise resolves
            sessionPromise.then(session => session.sendRealtimeInput({ 
                media: { mimeType: 'audio/pcm;rate=16000', data: b64 } 
            }));
        };
        source.connect(processor);
        processor.connect(ac.destination);

    } catch (e) {
        console.error(e);
        setIsLiveConnected(false);
        setLiveLog(p => [...p, 'Connection Failed (Check Mic Permissions)']);
    }
  };

  // Audio Helpers
  function decode(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  async function decodeAudioData(data: Uint8Array, ctx: AudioContext) {
      const float32 = new Float32Array(data.length / 2);
      const dataView = new DataView(data.buffer);
      for(let i=0; i < float32.length; i++) float32[i] = dataView.getInt16(i*2, true) / 32768.0;
      
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);
      return buffer;
  }
  function playAudioBuffer(buffer: AudioBuffer, ctx: AudioContext) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
  }
  function playBase64Audio(b64: string) {
      const audio = new Audio("data:audio/mp3;base64," + b64);
      audio.play().catch(e => console.error("Playback error", e));
  }


  const tools = [
    { id: 'EDIT_IMG', label: 'تعديل صور', icon: ImagePlus },
    { id: 'VEO', label: 'تحريك (Veo)', icon: Video },
    { id: 'GEN_IMG', label: 'توليد صور', icon: ImageIcon },
    { id: 'SEARCH', label: 'بحث', icon: Search },
    { id: 'MAPS', label: 'خرائط', icon: MapPin },
    { id: 'LIVE', label: 'محادثة', icon: Mic },
    { id: 'VIDEO_ANALYSIS', label: 'تحليل فيديو', icon: FileVideo },
    { id: 'THINKING', label: 'تفكير عميق', icon: Brain },
    { id: 'TTS', label: 'قراءة نص', icon: Speaker },
  ] as const;

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto w-full flex flex-col h-screen">
      <h1 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
        <Sparkles className="text-amber-500" /> المساعد الذكي
      </h1>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {tools.map(t => (
            <button
                key={t.id}
                onClick={() => { setActiveTool(t.id); resetState(); }}
                className={`flex flex-col items-center min-w-[4.5rem] p-3 rounded-xl transition-all ${activeTool === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
            >
                <t.icon size={24} className="mb-1" />
                <span className="text-[10px] font-bold whitespace-nowrap">{t.label}</span>
            </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-y-auto">
        {/* Tool Specific UI */}
        
        {/* File Uploads for Image/Video Tools */}
        {(activeTool === 'EDIT_IMG' || activeTool === 'VEO' || activeTool === 'VIDEO_ANALYSIS') && (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {activeTool === 'VIDEO_ANALYSIS' ? 'رفع فيديو' : 'رفع صورة'}
                </label>
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="text-xs text-gray-500">{uploadedFile ? uploadedFile.name : 'اضغط للرفع'}</p>
                        </div>
                        <input type="file" className="hidden" accept={activeTool === 'VIDEO_ANALYSIS' ? "video/*" : "image/*"} onChange={handleFileChange} />
                    </label>
                </div>
            </div>
        )}

        {/* Text Input */}
        {activeTool !== 'LIVE' && activeTool !== 'VEO' && (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {activeTool === 'EDIT_IMG' ? 'وصف التعديل' : activeTool === 'SEARCH' || activeTool === 'MAPS' || activeTool === 'THINKING' ? 'سؤالك' : activeTool === 'TTS' ? 'النص للقراءة' : 'الوصف'}
                </label>
                <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    rows={3}
                    placeholder="اكتب هنا..."
                />
            </div>
        )}

        {/* Configs */}
        {activeTool === 'GEN_IMG' && (
             <div className="flex gap-2 mb-4">
                {(['1K', '2K', '4K'] as const).map(s => (
                    <button key={s} onClick={() => setImgSize(s)} className={`px-4 py-2 rounded-lg text-xs font-bold ${imgSize === s ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-50'}`}>
                        {s}
                    </button>
                ))}
             </div>
        )}

        {/* Action Button */}
        {activeTool !== 'LIVE' && (
            <button 
                onClick={executeAction}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-bold mb-4 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                تنفيذ
            </button>
        )}

        {/* Live UI */}
        {activeTool === 'LIVE' && (
            <div className="text-center py-8">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isLiveConnected ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-indigo-100'}`}>
                    <Mic size={48} className={isLiveConnected ? 'text-white' : 'text-indigo-600'} />
                </div>
                <button 
                    onClick={toggleLive}
                    className={`px-8 py-3 rounded-full font-bold text-white shadow-lg transition ${isLiveConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isLiveConnected ? 'إنهاء المحادثة' : 'بدء المحادثة الصوتية'}
                </button>
                <div className="mt-6 text-xs text-gray-400 h-24 overflow-y-auto border-t border-gray-100 pt-2">
                    {liveLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
        )}

        {/* Output Display */}
        {response && activeTool !== 'LIVE' && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm whitespace-pre-wrap">
                {response}
            </div>
        )}

        {mediaUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                {activeTool === 'VEO' ? (
                    <video src={mediaUrl} controls className="w-full" />
                ) : (
                    <img src={mediaUrl} alt="Generated" className="w-full" />
                )}
            </div>
        )}

        {/* Grounding Chips */}
        {groundingChunks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
                {groundingChunks.map((chunk, idx) => {
                    const uri = chunk.web?.uri || chunk.maps?.uri;
                    const title = chunk.web?.title || chunk.maps?.title || 'Source';
                    if (!uri) return null;
                    return (
                        <a key={idx} href={uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs hover:bg-blue-100 border border-blue-200">
                             {activeTool === 'MAPS' ? <MapPin size={10}/> : <Search size={10}/>}
                             {title}
                        </a>
                    )
                })}
            </div>
        )}

      </div>
    </div>
  );
};