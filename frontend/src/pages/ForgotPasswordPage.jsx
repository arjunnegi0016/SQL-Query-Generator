import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import OtpInput from '../components/OtpInput';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  // Step 1: Email, Step 2: OTP, Step 3: New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
    
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      if (res.data.success) {
        toast.success("If an account exists, a reset code was sent!");
        setStep(2);
        setResendTimer(60);
      }
    } catch (err) {
      setError("Failed to request reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = (val) => {
    const code = val || otp;
    if (code.length !== 6) return setError("Please enter a 6-digit OTP.");
    setOtp(code);
    setStep(3);
    setError(null);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', {
        email,
        code: otp,
        newPassword: password
      });

      if (res.data.success) {
        toast.success('Password reset successfully! You can now log in.');
        navigate('/auth/login', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password. The OTP might be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md space-y-8 p-8 bg-card rounded-2xl shadow-xl border border-border transition-all duration-300">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          {step === 1 && 'Reset Password'}
          {step === 2 && 'Verify Email'}
          {step === 3 && 'New Password'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === 1 && 'Enter your email to receive a reset code'}
          {step === 2 && `We sent a reset code to ${email}`}
          {step === 3 && 'Create a new strong password'}
        </p>
      </div>

      <div className="w-full mt-8 space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 text-center animate-in fade-in">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 animate-in slide-in-from-left-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="john@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
            </button>

            <div className="text-center text-sm text-zinc-400 mt-4">
              Remember your password?{' '}
              <Link to="/auth/login" className="text-blue-500 hover:text-blue-400 font-medium">
                Back to Login
              </Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <OtpInput length={6} onComplete={handleOtpSubmit} />
            
            <button
              onClick={() => handleOtpSubmit(otp)}
              disabled={otp.length !== 6}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Verify Code
            </button>

            <div className="flex flex-col items-center justify-center space-y-4 text-sm mt-4">
              <button 
                onClick={handleRequestOtp}
                disabled={resendTimer > 0 || loading}
                className="text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
              </button>
              
              <button 
                onClick={() => { setStep(1); setOtp(''); setError(null); }}
                className="text-blue-500 hover:text-blue-400 flex items-center font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Change Email
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in slide-in-from-right-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && <PasswordStrengthIndicator password={password} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                className={`w-full px-4 py-2 bg-zinc-900 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-zinc-700'
                }`}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
