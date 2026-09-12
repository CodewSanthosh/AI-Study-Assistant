import React, { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronRight, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';

export default function QuizView() {
  const { token } = useAuth();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const generateQuiz = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setQuizData(null);
    setIsFinished(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);

    try {
      const response = await fetch(`${API_BASE_URL}/quiz/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, count: 5 }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setQuizData(data);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      alert('Failed to generate quiz. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (option) => {
    if (selectedAnswer) return; // Prevent changing answer
    setSelectedAnswer(option);

    const currentQ = quizData.questions[currentQuestionIndex];
    if (option === currentQ.correct_answer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Smart Quizzes</h1>
        <p className="text-muted-foreground text-sm">Test your knowledge with AI-generated questions based on your notes.</p>
      </motion.div>

      {!quizData && !isFinished && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <form onSubmit={generateQuiz} className="flex flex-col gap-4">
            <label className="text-foreground font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What topic would you like to practice?
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Marketing strategies, Chapter 3..."
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

      {quizData && !isFinished && (
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">{quizData.quiz_title}</h2>
            <span className="bg-primary-light text-primary px-3 py-1 rounded-full text-xs font-semibold">
              {currentQuestionIndex + 1} / {quizData.questions.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-foreground leading-snug">
                {quizData.questions[currentQuestionIndex].question}
              </h3>

              <div className="space-y-3">
                {quizData.questions[currentQuestionIndex].options.map((option, idx) => {
                  const isCorrect = option === quizData.questions[currentQuestionIndex].correct_answer;
                  const isSelected = selectedAnswer === option;

                  let buttonClass = "bg-white border-border hover:border-primary/40 text-foreground";
                  if (selectedAnswer) {
                    if (isCorrect) buttonClass = "bg-success/10 border-success text-success-foreground";
                    else if (isSelected && !isCorrect) buttonClass = "bg-destructive/10 border-destructive text-destructive-foreground";
                    else buttonClass = "bg-muted border-border text-muted-foreground opacity-50";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(option)}
                      disabled={!!selectedAnswer}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex justify-between items-center ${buttonClass}`}
                    >
                      <span className="font-medium text-sm">{option}</span>
                      {selectedAnswer && isCorrect && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                      {selectedAnswer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-5 rounded-xl bg-primary-light border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2 text-sm">Explanation</h4>
                  <p className="text-foreground text-sm leading-relaxed">
                    {quizData.questions[currentQuestionIndex].explanation}
                  </p>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={nextQuestion}
                      className="px-5 py-2.5 bg-primary text-white font-medium text-sm rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      {currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {isFinished && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl p-10 shadow-sm text-center">
          <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-10 h-10 text-warning" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Completed!</h2>
          <p className="text-muted-foreground mb-8">
            You scored <span className="font-bold text-foreground">{score}</span> out of <span className="font-bold text-foreground">{quizData.questions.length}</span>
          </p>
          <button
            onClick={() => { setQuizData(null); setIsFinished(false); setTopic(''); }}
            className="px-6 py-3 bg-white border border-border text-foreground font-medium text-sm rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Take Another Quiz
          </button>
        </motion.div>
      )}
    </div>
  );
}
