import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OtpInput from '../components/OtpInput';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Step 1: Credentials, Step 2: 2FA OTP
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
    if (!password) return setError("Password is required.");

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });

      if (res.data.requires2FA) {
        toast.success(res.data.message || "OTP sent to your email!");
        setStep(2);
        setResendTimer(60);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Login failed. Please check your credentials.";
      setError(errMsg);
      if (err.response?.data?.requiresVerification) {
        toast.error("You need to verify your email. Please sign up again to receive a new code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) return setError("Please enter a 6-digit OTP.");
    
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login-verify', {
        email,
        code: otp,
      });

      if (res.data.token) {
        toast.success('Successfully logged in!');
        login(res.data.user, res.data.token);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      if (res.data.requires2FA) {
        toast.success("A new OTP has been sent!");
        setResendTimer(60);
      }
    } catch (err) {
      setError("Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/google', { credential: credentialResponse.credential });
      login(res.data.user, res.data.token);
      toast.success('Successfully logged in!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error('Google Sign In failed.');
    }
  };



  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md space-y-8 p-8 bg-card rounded-2xl shadow-xl border border-border transition-all duration-300">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          {step === 1 ? 'Welcome Back' : 'Two-Factor Authentication'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === 1 ? 'Sign in to access your AI SQL assistant' : `Enter the code sent to ${email}`}
        </p>
      </div>

      <div className="w-full mt-8 space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 text-center animate-in fade-in">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in slide-in-from-left-4">
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-300">Password</label>
                <Link to="/auth/forgot-password" className="text-xs text-blue-500 hover:text-blue-400 font-medium">
                  Forgot password?
                </Link>
              </div>
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>

            <div className="text-center text-sm text-zinc-400 mt-4">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-blue-500 hover:text-blue-400 font-medium">
                Sign up
              </Link>
            </div>
            
            <div className="relative w-full flex items-center py-4">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase">Or</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div className="space-y-3">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google Sign In failed')}
                theme="filled_black"
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
              />

            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <OtpInput length={6} onComplete={(val) => { setOtp(val); }} />
            
            <button
              onClick={handleOtpSubmit}
              disabled={loading || otp.length !== 6}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
            </button>

            <div className="flex flex-col items-center justify-center space-y-4 text-sm mt-4">
              <button 
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || loading}
                className="text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
              </button>
              
              <button 
                onClick={() => { setStep(1); setOtp(''); setError(null); }}
                className="text-blue-500 hover:text-blue-400 flex items-center font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
