'use client';

import React from 'react';
import { X, Download, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName: string;
}

export default function DocumentPreviewModal({ isOpen, onClose, fileUrl, fileName }: DocumentPreviewModalProps) {
    const [zoom, setZoom] = React.useState(100);
    const [isFullScreen, setIsFullScreen] = React.useState(false);

    if (!isOpen) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl) || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    const isPdf = /\.pdf$/i.test(fileUrl) || /\.pdf$/i.test(fileName);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
                <div className="flex flex-col">
                    <h3 className="text-sm font-medium truncate max-w-md">{fileName}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {isImage ? 'Resim Önizleme' : isPdf ? 'PDF Önizleme' : 'Dosya Önizleme'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isImage && (
                        <div className="flex items-center gap-1 mr-4 border-r border-slate-700 pr-4">
                            <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-mono w-12 text-center text-slate-300">{zoom}%</span>
                            <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                                <ZoomIn className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <a
                        href={fileUrl}
                        download={fileName}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 text-xs"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">İndir</span>
                    </a>

                    <button
                        onClick={onClose}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/50">
                {isImage ? (
                    <div
                        className="transition-all duration-200 ease-out"
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
                    >
                        <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-w-full max-h-full rounded shadow-2xl bg-white"
                        />
                    </div>
                ) : isPdf ? (
                    <iframe
                        src={`${fileUrl}#toolbar=0`}
                        className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl"
                        title={fileName}
                    />
                ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-md">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <X className="w-8 h-8 text-slate-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-white mb-2">Önizleme Desteklenmiyor</h4>
                        <p className="text-slate-400 text-sm mb-8">
                            Bu dosya türü için tarayıcı üzerinden doğrudan önizleme yapılamıyor. Lütfen dosyayı indirerek görüntüleyin.
                        </p>
                        <a
                            href={fileUrl}
                            download={fileName}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                        >
                            <Download className="w-5 h-5" />
                            Dosyayı İndir
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
