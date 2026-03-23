import React, { useRef } from 'react';

export default function BackupRestoreSettings({ onRestoreSuccess }) {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    // Gather all relevant keys from localStorage
    const backupData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      backupData[key] = localStorage.getItem(key);
    }

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `aartisangraha_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (typeof importedData !== 'object' || importedData === null) {
          throw new Error("Invalid backup file format");
        }

        // Restore data to localStorage
        Object.keys(importedData).forEach(key => {
          localStorage.setItem(key, importedData[key]);
        });

        alert("Backup restored successfully! The app will now reload to apply changes.");
        
        if (onRestoreSuccess) {
          onRestoreSuccess();
        } else {
          window.location.reload(); // Reload to reflect restored state globally
        }
      } catch (error) {
        console.error("Failed to parse backup file:", error);
        alert("Error restoring backup. Please ensure the file is a valid AartiSangraha backup.");
      }
    };
    reader.readAsText(file);
    
    event.target.value = ''; // Reset input so the same file can be selected again if needed
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow mt-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-200">Backup & Restore</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Export your favorites, custom playlists, and app settings to a file, or restore them from a previous backup.
      </p>
      <div className="flex gap-4">
        <button onClick={handleExport} className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition">
          📥 Export Backup
        </button>
        <button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 bg-green-600 text-white font-semibold rounded shadow hover:bg-green-700 transition">
          📤 Import Backup
        </button>
        <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
      </div>
    </div>
  );
}