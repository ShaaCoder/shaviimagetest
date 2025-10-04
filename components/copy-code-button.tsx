'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyCodeButtonProps {
  code: string;
  className?: string;
}

export function CopyCodeButton({ code, className = '' }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy code:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors group disabled:opacity-75 ${className}`}
      disabled={copied}
    >
      <span className="font-mono font-semibold">{code}</span>
      {copied ? (
        <Check className="w-4 h-4 text-green-200" />
      ) : (
        <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
      )}
    </button>
  );
}