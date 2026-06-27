import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { TerminalSquare, Download, Copy, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SqlTerminalPage() {
  const { token } = useAuth();
  
  // Terminal Session State
  const [sessionHistory, setSessionHistory] = useState([
    { type: 'info', text: 'Welcome to the QueryGen SQL Terminal.' },
    { type: 'info', text: 'Type your SQL commands and press Enter to execute (Shift+Enter for new line). Type "clear" to clear the screen.' },
  ]);
  
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  
  // Command History (Up/Down navigation)
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const terminalEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionHistory]);

  const appendToSession = (entry) => {
    setSessionHistory(prev => [...prev, entry]);
  };

  const handleClear = () => {
    setSessionHistory([
      { type: 'info', text: 'Terminal cleared.' }
    ]);
    setRequiresConfirmation(false);
    setCurrentInput('');
  };

  const executeQuery = async (queryToExecute, confirm = false) => {
    const q = queryToExecute.trim();
    if (!q) return;

    if (q.toLowerCase() === 'clear') {
      handleClear();
      return;
    }

    if (!confirm) {
      appendToSession({ type: 'command', text: q });
      setCommandHistory(prev => [...prev, q]);
      setHistoryIndex(-1); // Reset history navigation
    }

    setIsExecuting(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/terminal/execute", 
        { query: q, confirmDangerous: confirm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data;
      if (data.success) {
        setRequiresConfirmation(false);
        const meta = data.metadata;
        
        if (meta.commandType === 'SELECT' || meta.commandType === 'SHOW' || meta.commandType === 'DESCRIBE' || meta.commandType === 'EXPLAIN') {
          if (data.data && data.data.length > 0) {
            appendToSession({ 
              type: 'data', 
              data: data.data, 
              time: meta.executionTimeMs 
            });
          } else {
            appendToSession({ 
              type: 'success', 
              text: `Empty set (${(meta.executionTimeMs / 1000).toFixed(2)} sec)` 
            });
          }
        } else {
          appendToSession({ 
            type: 'success', 
            text: `Query OK, ${meta.affectedRows || 0} rows affected (${(meta.executionTimeMs / 1000).toFixed(2)} sec)` 
          });
        }
      }
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.requiresConfirmation) {
        setRequiresConfirmation(true);
        setPendingQuery(q);
        appendToSession({ 
          type: 'error', 
          text: `ERROR: ${resData.error}` 
        });
        appendToSession({
          type: 'warning',
          text: `Type 'CONFIRM' to execute, or anything else to cancel.`
        });
      } else {
        appendToSession({ 
          type: 'error', 
          text: `ERROR: ${resData?.error || err.message || "An unexpected error occurred"}` 
        });
      }
    } finally {
      setIsExecuting(false);
      setCurrentInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Execution shortcut (Enter without Shift)
    if (!e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      
      // Handle confirmation mode
      if (requiresConfirmation) {
        if (currentInput.trim().toUpperCase() === 'CONFIRM') {
          executeQuery(pendingQuery, true);
        } else {
          appendToSession({ type: 'command', text: currentInput });
          appendToSession({ type: 'info', text: 'Operation cancelled.' });
          setRequiresConfirmation(false);
          setCurrentInput('');
        }
      } else {
        executeQuery(currentInput);
      }
    }

    // Clear shortcut (Ctrl+K)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClear();
    }

    // History navigation (Arrow Up/Down)
    if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0) {
        e.preventDefault();
        const nextIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        if (nextIndex !== historyIndex) {
          setHistoryIndex(nextIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - nextIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex >= 0) {
        e.preventDefault();
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        if (prevIndex === -1) {
          setCurrentInput('');
        } else {
          setCurrentInput(commandHistory[commandHistory.length - 1 - prevIndex]);
        }
      }
    }
  };

  const handleDownloadCsv = (results) => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = (results) => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    toast.success("JSON copied to clipboard");
  };

  // Render Data Table nicely
  const renderDataTable = (entry, idx) => {
    const { data, time } = entry;
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);

    return (
      <div key={idx} className="my-3 group relative">
        <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 bg-zinc-900 rounded p-1 border border-zinc-700 shadow-lg z-10">
          <button onClick={() => handleCopyJson(data)} className="text-zinc-400 hover:text-white p-1" title="Copy JSON"><Copy className="w-4 h-4" /></button>
          <button onClick={() => handleDownloadCsv(data)} className="text-zinc-400 hover:text-white p-1" title="Download CSV"><Download className="w-4 h-4" /></button>
        </div>
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-900 text-zinc-300">
              <tr>
                {headers.map(h => (
                  <th key={h} className="px-4 py-2 border-b border-r border-zinc-800 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-900/50">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-4 py-2 border-b border-r border-zinc-800 whitespace-nowrap">
                      {val === null ? <span className="text-zinc-600 italic">NULL</span> : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-zinc-500 mt-2">
          {data.length} row(s) in set ({(time / 1000).toFixed(2)} sec)
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0f] rounded-xl border border-zinc-800 overflow-hidden shadow-2xl font-mono text-sm">
      {/* Terminal Header */}
      <div className="h-10 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <TerminalSquare className="w-4 h-4 text-zinc-400 mr-2" />
        <span className="text-zinc-400 font-semibold text-xs tracking-wider">SQL TERMINAL</span>
      </div>

      {/* Scrollable Console Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-zinc-300 cursor-text" onClick={() => document.querySelector('.cm-content')?.focus()}>
        
        {/* Render History */}
        {sessionHistory.map((entry, idx) => {
          switch (entry.type) {
            case 'info':
              return <div key={idx} className="text-zinc-500">{entry.text}</div>;
            case 'command':
              return (
                <div key={idx} className="flex">
                  <span className="text-blue-400 mr-2 select-none">mysql&gt;</span>
                  <span className="text-zinc-100 whitespace-pre-wrap">{entry.text}</span>
                </div>
              );
            case 'success':
              return <div key={idx} className="text-emerald-400">{entry.text}</div>;
            case 'error':
              return <div key={idx} className="text-red-400">{entry.text}</div>;
            case 'warning':
              return <div key={idx} className="text-amber-400 italic">{entry.text}</div>;
            case 'data':
              return renderDataTable(entry, idx);
            default:
              return null;
          }
        })}

        {/* Loading Indicator */}
        {isExecuting && (
          <div className="flex">
            <span className="text-blue-400 mr-2 select-none">mysql&gt;</span>
            <span className="text-zinc-500 animate-pulse">Executing...</span>
          </div>
        )}

        {/* Input Area */}
        <div className="flex pt-1 pb-4">
          <span className="text-blue-400 mr-2 select-none shrink-0 pt-[2px]">mysql&gt;</span>
          <div className="flex-1 relative" onKeyDown={handleKeyDown}>
            <CodeMirror
              value={currentInput}
              onChange={(val) => setCurrentInput(val)}
              extensions={[sql()]}
              theme="dark"
              className="text-[14px] bg-transparent"
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                highlightActiveLine: false,
                autocompletion: true,
              }}
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
        </div>
        
        {/* Invisible element to scroll to */}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
