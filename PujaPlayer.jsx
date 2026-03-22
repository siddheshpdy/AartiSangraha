import React, { useState } from 'react';

export default function PujaPlayer({ playlist, allAartya, onExit, AartiDetailComponent }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentAartiId = playlist.aartiIds[currentIndex];
  // Locate the specific Aarti data from your main JSON array
  const currentAarti = allAartya.find(a => a.id === currentAartiId || a.slug === currentAartiId);

  const handleNext = () => {
    if (currentIndex < playlist.aartiIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0); // Reset scroll position for next Aarti
    } else {
      onExit(); // Finish puja sequence
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  if (!playlist.aartiIds || playlist.aartiIds.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-4">
        <p className="text-xl text-center mb-4">This sequence is empty.</p>
        <button onClick={onExit} className="px-4 py-2 bg-orange-500 text-white rounded shadow">Go Back</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto flex flex-col">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 bg-orange-100 dark:bg-gray-800 p-4 flex justify-between items-center shadow-md z-10">
        <div>
          <h2 className="text-lg font-bold text-orange-800 dark:text-orange-300">{playlist.name}</h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Aarti {currentIndex + 1} of {playlist.aartiIds.length}
          </span>
        </div>
        <button onClick={onExit} className="text-red-500 font-bold p-2">✖ Exit</button>
      </div>

      {/* Dynamic Aarti Content Rendering */}
      <div className="flex-grow p-4 pb-24">
        {currentAarti ? <AartiDetailComponent aarti={currentAarti} /> : <p>Aarti not found.</p>}
      </div>

      {/* Bottom Sequential Controls */}
      <div className="fixed bottom-0 w-full bg-gray-100 dark:bg-gray-800 p-4 flex justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        <button onClick={handlePrev} disabled={currentIndex === 0} 
          className={`px-6 py-3 rounded font-bold ${currentIndex === 0 ? 'bg-gray-300 text-gray-500 opacity-50' : 'bg-orange-200 text-orange-800'}`}>
          ◀ Previous
        </button>
        <button onClick={handleNext} className="px-6 py-3 rounded font-bold bg-orange-600 text-white shadow-md">
          {currentIndex === playlist.aartiIds.length - 1 ? 'Finish Puja 🕉️' : 'Next Aarti ▶'}
        </button>
      </div>
    </div>
  );
}