import { useEffect, useMemo, useState } from "react";
import "./App.css";

const QUIZ_SIZES = [25, 50, 100];

function App() {
  const [view, setView] = useState("home");
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cardIndex, setCardIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const [quizSize, setQuizSize] = useState(25);
  const [quizState, setQuizState] = useState("setup");
  const [quizWords, setQuizWords] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState([]);

  const loadWords = async () => {
    setLoading(true);
    setError("");
    try {
      if (!window.api?.loadWords) {
        throw new Error("Electron API unavailable. Run in the desktop app.");
      }
      const data = await window.api.loadWords();
      const cleaned = Array.isArray(data)
        ? data
            .map((entry) => ({
              en: String(entry.en || "").trim(),
              ko: String(entry.ko || "").trim(),
            }))
            .filter((entry) => entry.en || entry.ko)
        : [];
      setWords(cleaned);
    } catch (err) {
      setError(err.message || "Failed to load words.");
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    setCardIndex(0);
    setShowMeaning(false);
    setQuizState("setup");
    setQuizWords([]);
    setQuizIndex(0);
    setAnswer("");
    setResults([]);
  }, [view, words]);

  const usableQuizWords = useMemo(
    () => words.filter((word) => word.en && word.ko),
    [words],
  );

  const currentCard = words[cardIndex];
  const currentQuizWord = quizWords[quizIndex];

  const moveCard = (direction) => {
    if (!words.length) return;
    const nextIndex =
      direction === "next"
        ? (cardIndex + 1) % words.length
        : (cardIndex - 1 + words.length) % words.length;
    setCardIndex(nextIndex);
    setShowMeaning(false);
  };

  const startQuiz = () => {
    if (!usableQuizWords.length) return;
    const count = Math.min(quizSize, usableQuizWords.length);
    const shuffled = [...usableQuizWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    setQuizWords(selected);
    setQuizIndex(0);
    setResults([]);
    setAnswer("");
    setQuizState("in-progress");
  };

  const submitAnswer = (event) => {
    event.preventDefault();
    if (!currentQuizWord) return;
    const cleaned = answer.trim();
    if (!cleaned) return;
    const correct = currentQuizWord.en.trim();
    const isCorrect = cleaned.toLowerCase() === correct.toLowerCase();
    setResults((prev) => [
      ...prev,
      { ...currentQuizWord, userAnswer: cleaned, isCorrect },
    ]);
    const nextIndex = quizIndex + 1;
    if (nextIndex >= quizWords.length) {
      setQuizState("done");
    } else {
      setQuizIndex(nextIndex);
    }
    setAnswer("");
  };

  const score = results.filter((result) => result.isCorrect).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-title">English Practice</span>
          <span className="brand-subtitle">Flashcards & Quiz</span>
        </div>
        <nav className="nav">
          <button className="button ghost" onClick={() => setView("home")}>
            Home
          </button>
          <button className="button secondary" onClick={loadWords}>
            Reload Words
          </button>
        </nav>
      </header>

      <main className="content">
        {view === "home" && (
          <section className="panel">
            <h1 className="panel-title">Start your practice</h1>
            <p className="panel-subtitle">
              Load word lists from <code>input_file/words</code> as CSV or TXT.
            </p>
            <div className="status-bar">
              <span>
                Loaded words: <strong>{words.length}</strong>
              </span>
              {loading && <span className="status muted">Loading...</span>}
              {error && <span className="status error">{error}</span>}
            </div>
            <div className="home-grid">
              <button className="tile" onClick={() => setView("flashcard")}>
                <h2>Flashcards</h2>
                <p>Review English words and meanings.</p>
              </button>
              <button className="tile" onClick={() => setView("quiz")}>
                <h2>Word Quiz</h2>
                <p>Type the English word from a Korean meaning.</p>
              </button>
            </div>
            <div className="helper">
              <p>
                Format example: <code>apple,사과</code> or{" "}
                <code>apple\t사과</code>
              </p>
            </div>
          </section>
        )}

        {view === "flashcard" && (
          <section className="panel">
            <div className="panel-header">
              <h1 className="panel-title">Flashcards</h1>
              <div className="panel-actions">
                <button className="button ghost" onClick={() => setView("home")}>
                  Back
                </button>
              </div>
            </div>
            {!words.length ? (
              <div className="empty-state">
                <p>No words loaded yet.</p>
                <p>Add CSV/TXT files in <code>input_file/words</code>.</p>
              </div>
            ) : (
              <>
                <div className="flashcard">
                  <div className="flashcard-card">
                    <span className="flashcard-label">English</span>
                    <h2 className="flashcard-word">
                      {currentCard?.en || "-"}
                    </h2>
                    {showMeaning && (
                      <>
                        <span className="flashcard-label">Meaning</span>
                        <p className="flashcard-meaning">
                          {currentCard?.ko || "No meaning provided."}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flashcard-controls">
                  <button
                    className="button secondary"
                    onClick={() => moveCard("prev")}
                  >
                    Previous
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setShowMeaning((prev) => !prev)}
                  >
                    {showMeaning ? "Hide Meaning" : "Show Meaning"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => moveCard("next")}
                  >
                    Next
                  </button>
                </div>
                <div className="progress">
                  Card {cardIndex + 1} / {words.length}
                </div>
              </>
            )}
          </section>
        )}

        {view === "quiz" && (
          <section className="panel">
            <div className="panel-header">
              <h1 className="panel-title">Word Quiz</h1>
              <div className="panel-actions">
                <button className="button ghost" onClick={() => setView("home")}>
                  Back
                </button>
              </div>
            </div>

            {!usableQuizWords.length ? (
              <div className="empty-state">
                <p>No quiz-ready words found.</p>
                <p>Add words with both English and Korean meanings.</p>
              </div>
            ) : (
              <>
                {quizState === "setup" && (
                  <div className="quiz-setup">
                    <p className="muted">
                      Available pairs: {usableQuizWords.length}
                    </p>
                    <div className="chip-group">
                      {QUIZ_SIZES.map((size) => (
                        <button
                          key={size}
                          className={`chip ${
                            quizSize === size ? "active" : ""
                          }`}
                          onClick={() => setQuizSize(size)}
                        >
                          {size} words
                        </button>
                      ))}
                    </div>
                    <button className="button primary" onClick={startQuiz}>
                      Start Quiz
                    </button>
                  </div>
                )}

                {quizState === "in-progress" && currentQuizWord && (
                  <div className="quiz-body">
                    <div className="quiz-progress">
                      Question {quizIndex + 1} / {quizWords.length}
                    </div>
                    <div className="quiz-card">
                      <span className="flashcard-label">Meaning</span>
                      <h2>{currentQuizWord.ko}</h2>
                    </div>
                    <form className="quiz-form" onSubmit={submitAnswer}>
                      <input
                        type="text"
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        placeholder="Type the English word"
                        autoFocus
                      />
                      <button className="button primary" type="submit">
                        Submit
                      </button>
                    </form>
                  </div>
                )}

                {quizState === "done" && (
                  <div className="quiz-result">
                    <h2>
                      Score: {score} / {results.length}
                    </h2>
                    <div className="result-actions">
                      <button className="button secondary" onClick={startQuiz}>
                        Retry
                      </button>
                      <button
                        className="button ghost"
                        onClick={() => setQuizState("setup")}
                      >
                        Choose another size
                      </button>
                    </div>
                    <div className="result-list">
                      {results.map((result, index) => (
                        <div
                          key={`${result.en}-${index}`}
                          className={`result-item ${
                            result.isCorrect ? "correct" : "wrong"
                          }`}
                        >
                          <span className="result-word">{result.ko}</span>
                          <span className="result-answer">
                            Your answer: {result.userAnswer}
                          </span>
                          {!result.isCorrect && (
                            <span className="result-correct">
                              Correct: {result.en}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
