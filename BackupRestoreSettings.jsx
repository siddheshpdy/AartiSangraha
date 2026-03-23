import React, { useRef } from 'react';

export default function BackupRestoreSettings({ onRestoreSuccess, theme }) {
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

  const isDarkTheme = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.body.classList.contains('dark'));
  const bgColor = isDarkTheme ? '#1f2937' : '#f9fafb';
  const textColor = isDarkTheme ? '#f9fafb' : '#111827';
  const subTextColor = isDarkTheme ? '#9ca3af' : '#4b5563';
  const borderColor = isDarkTheme ? '#374151' : '#e5e7eb';

  return (
    <div style={{ padding: '15px', backgroundColor: bgColor, color: textColor, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '10px', border: `1px solid ${borderColor}` }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px', margin: 0 }}>Backup & Restore</h3>
      <p style={{ fontSize: '0.85rem', color: subTextColor, marginBottom: '15px', marginTop: 0 }}>
        Export your favorites, custom playlists, and app settings to a file, or restore them from a previous backup.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleExport} style={{ flex: 1, padding: '8px', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
          📥 Export
        </button>
        <button onClick={() => fileInputRef.current.click()} style={{ flex: 1, padding: '8px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
          📤 Import
        </button>
        <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
      </div>
    </div>
  );
}