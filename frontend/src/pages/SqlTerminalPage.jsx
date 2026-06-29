import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { TerminalSquare, Download, Copy, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SqlTerminalPage() {
  const { token, isTerminalUnlocked, setTerminalUnlocked, user, login } = useAuth();

  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newTerminalPassword, setNewTerminalPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  // Authentication State
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const terminalEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionHistory]);

  useEffect(() => {
    if (isTerminalUnlocked) {
      // Check if user needs to change terminal password
      axios.get('http://localhost:5000/api/user/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data.success && res.data.data.isTerminalPasswordChanged === false) {
             setShowPasswordChangeModal(true);
          }
        })
        .catch(err => console.error("Failed to fetch user profile:", err));
    }
  }, [isTerminalUnlocked, token]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newTerminalPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await axios.put(
        'http://localhost:5000/api/user/terminal-password',
        { newPassword: newTerminalPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success("Terminal password changed successfully!");
        setShowPasswordChangeModal(false);
        setNewTerminalPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

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

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsUnlocking(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/terminal/unlock",
        { password: passwordInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setTerminalUnlocked(true);
        toast.success("Terminal unlocked");
        setPasswordInput('');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to unlock terminal");
    } finally {
      setIsUnlocking(false);
    }
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
        const timeStr = (meta.executionTimeMs / 1000).toFixed(2);

        if (meta.commandType === 'USE') {
          appendToSession({
            type: 'success',
            text: 'Database changed'
          });
        } else if (meta.commandType === 'SELECT' || meta.commandType === 'SHOW' || meta.commandType === 'DESCRIBE' || meta.commandType === 'EXPLAIN') {
          if (data.data && data.data.length > 0) {
            appendToSession({
              type: 'data',
              data: data.data,
              time: meta.executionTimeMs
            });
          } else {
            appendToSession({
              type: 'success',
              text: `Empty set (${timeStr} sec)`
            });
          }
        } else {
          const rowStr = meta.affectedRows === 1 ? 'row' : 'rows';
          appendToSession({
            type: 'success',
            text: `Query OK, ${meta.affectedRows || 0} ${rowStr} affected (${timeStr} sec)`
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
          {data.length} {data.length === 1 ? 'row' : 'rows'} in set ({(time / 1000).toFixed(2)} sec)
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0f] overflow-hidden font-mono text-sm relative">
      {showPasswordChangeModal && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Change Terminal Password</h2>
            <p className="text-zinc-400 mb-6 text-sm">
              For security, you must change your randomly generated terminal password before continuing. You can only do this once.
            </p>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-zinc-400 text-sm mb-2">New Password (min 8 chars)</label>
                <input
                  type="password"
                  value={newTerminalPassword}
                  onChange={(e) => setNewTerminalPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter new terminal password"
                  autoFocus
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition-colors"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Terminal Header */}
      <div className="h-10 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <TerminalSquare className="w-4 h-4 text-zinc-400 mr-2" />
        <span className="text-zinc-400 font-semibold text-xs tracking-wider">SQL TERMINAL</span>
      </div>

      {!isTerminalUnlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-zinc-200 text-lg font-semibold mb-2">Terminal Locked</h2>
          <p className="text-zinc-400 mb-6 text-center max-w-md">
            For security reasons, please enter your account password to unlock the SQL terminal.
          </p>
          <form onSubmit={handleUnlock} className="flex gap-2 w-full max-w-xs">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Password"
              autoFocus
            />
            <button
              type="submit"
              disabled={isUnlocking}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              {isUnlocking ? '...' : 'Unlock'}
            </button>
          </form>
        </div>
      ) : (
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
      )}
    </div>
  );
}
