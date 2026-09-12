import React, { useState } from 'react';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function FlashcardsView() {
  const { token } = useAuth();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardsData, setFlashcardsData] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateCards = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setFlashcardsData(null);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      const response = await fetch('http://localhost:8000/flashcards/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, count: 8 }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setFlashcardsData(data);
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      alert('Failed to generate flashcards. Check console.');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < flashcardsData.flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 flex flex-col items-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">Study Flashcards</h1>
        <p className="text-muted-foreground text-sm">Master concepts quickly with AI-generated flashcards based on your notes.</p>
      </motion.div>

      {!flashcardsData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-card border border-border rounded-2xl p-8 shadow-sm">
          <form onSubmit={generateCards} className="flex flex-col gap-4">
            <label className="text-foreground font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What do you want to memorize?
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. AWS Services, Marketing, Biology..."
                className="flex-1 bg-muted border border-border rounded-xl px-5 py-3.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="submit"
                disabled={!topic.trim() || isGenerating}
                className="px-6 py-3.5 bg-primary text-white font-medium text-sm rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generate
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {flashcardsData && (
        <div className="w-full max-w-2xl flex flex-col items-center mt-4">
          <div className="flex justify-between w-full items-center mb-6 px-2">
            <button onClick={() => setFlashcardsData(null)} className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> New Topic
            </button>
            <span className="bg-primary-light text-primary px-3 py-1 rounded-full text-xs font-semibold">
              Card {currentIndex + 1} of {flashcardsData.flashcards.length}
            </span>
          </div>

          <div
            className="w-full aspect-[4/3] perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              className="w-full h-full relative preserve-3d"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              {/* Front of Card */}
              <div className="absolute w-full h-full backface-hidden bg-primary rounded-3xl shadow-md p-10 flex flex-col items-center justify-center text-center">
                <span className="absolute top-6 left-6 text-white/60 font-bold uppercase tracking-widest text-[10px]">Term</span>
                <h2 className="text-3xl font-bold text-white leading-tight">
                  {flashcardsData.flashcards[currentIndex].front}
                </h2>
                <span className="absolute bottom-6 text-white/60 text-xs font-medium">Click to reveal</span>
              </div>

              {/* Back of Card */}
              <div
                className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-md border border-border p-10 flex flex-col items-center justify-center text-center overflow-y-auto"
                style={{ transform: "rotateY(180deg)" }}
              >
                <span className="absolute top-6 left-6 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Definition</span>
                <p className="text-xl font-medium text-foreground leading-relaxed">
                  {flashcardsData.flashcards[currentIndex].back}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="w-12 h-12 rounded-full bg-white border border-border hover:bg-muted disabled:opacity-50 flex items-center justify-center text-foreground transition-all shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextCard}
              disabled={currentIndex === flashcardsData.flashcards.length - 1}
              className="w-12 h-12 rounded-full bg-white border border-border hover:bg-muted disabled:opacity-50 flex items-center justify-center text-foreground transition-all shadow-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
