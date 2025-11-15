"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles } from 'lucide-react';

interface PromptInputProps {
  onPromptSubmit?: (prompt: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PromptInput({ 
  onPromptSubmit, 
  placeholder = "Enter your prompt for the race simulation...",
  disabled = false 
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && onPromptSubmit) {
      onPromptSubmit(prompt.trim());
      setPrompt('');
    }
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-purple-500/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="font-bold text-sm">AI Race Control</h3>
          <p className="text-xs text-muted-foreground">Control the simulation with AI prompts</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-background/50 border-purple-500/20 focus:border-purple-500/40"
        />
        <Button 
          type="submit" 
          disabled={!prompt.trim() || disabled}
          size="sm"
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
