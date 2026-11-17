import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, X } from 'lucide-react';
import { buildShortUrl, type LinkItem } from '../types/linkvault.ts';

interface QrCodeModalProps {
  link: LinkItem | null;
  onClose: () => void;
  onCopy: (url: string) => void;
  onDownloaded: (format: string) => void;
}

export function QrCodeModal({ link, onClose, onCopy, onDownloaded }: QrCodeModalProps) {
  const [previewPng, setPreviewPng] = useState<string>('');
  const [surfaceMode, setSurfaceMode] = useState<'light' | 'dark'>('light');

  const shortUrl = link ? buildShortUrl(link.slug) : '';

  useEffect(() => {
    if (!link) return;
    let cancelled = false;

    const colors =
      surfaceMode === 'light'
        ? { dark: '#090B10', light: '#FFFFFF' }
        : { dark: '#F8FAFC', light: '#090B10' };

    QRCode.toDataURL(shortUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: colors,
    })
      .then((url) => {
        if (!cancelled) setPreviewPng(url);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [link, shortUrl, surfaceMode]);

  if (!link) return null;

  const handleDownloadPng = async () => {
    const colors =
      surfaceMode === 'light'
        ? { dark: '#090B10', light: '#FFFFFF' }
        : { dark: '#F8FAFC', light: '#090B10' };

    const dataUrl = await QRCode.toDataURL(shortUrl, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: colors,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `linkvault-${link.slug}.png`;
    a.click();
    onDownloaded('PNG');
  };

  const handleDownloadSvg = async () => {
    const colors =
      surfaceMode === 'light'
        ? { dark: '#090B10', light: '#FFFFFF' }
        : { dark: '#F8FAFC', light: '#090B10' };

    const svgStr = await QRCode.toString(shortUrl, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'H',
      color: colors,
    });
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkvault-${link.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onDownloaded('SVG');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#11151E] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 id="qr-modal-title" className="font-display text-lg font-semibold text-white">
            QR Code
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {link.title || `/${link.slug}`}
              </p>
              <p className="font-mono text-xs text-indigo-400 truncate">{shortUrl}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090B10] border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSurfaceMode('light')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  surfaceMode === 'light' ? 'bg-[#192030] text-white' : 'text-slate-400'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setSurfaceMode('dark')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  surfaceMode === 'dark' ? 'bg-[#192030] text-white' : 'text-slate-400'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <div
              className={`p-4 rounded-xl border border-slate-800 ${
                surfaceMode === 'light' ? 'bg-white' : 'bg-[#090B10]'
              }`}
            >
              {previewPng ? (
                <img
                  src={previewPng}
                  alt={`QR code for ${shortUrl}`}
                  className="w-52 h-52 block"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-500">
                  Generating...
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onCopy(shortUrl)}
              className="h-10 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/70 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy URL</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="h-10 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/70 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>SVG</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
