import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Building2, Eye, EyeOff, BarChart3, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    adminSecret: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminField, setShowAdminField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.department, form.adminSecret);
      toast.success('Account created! Welcome to QuickPoll 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined, general: undefined }));
  };

  // Password strength indicator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = getPasswordStrength(form.password);
  const strengthLabels = [null, 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [null, 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-accent-400'];

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-grid">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-primary-600/8 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-purple-600/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-xl shadow-primary-900/50 mb-4">
            <BarChart3 size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Create account</h1>
          <p className="text-white/50 mt-2">Start managing your team polls for free</p>
        </div>

        {/* Card */}
        <div className="glass-strong p-8">
          {errors.general && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
            {/* Name */}
            <div>
              <label className="label">Full Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={set('name')}
                  className={`input pl-10 ${errors.name ? 'border-red-500/50' : ''}`}
                  autoComplete="name"
                  id="reg-name"
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Work Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={set('email')}
                  className={`input pl-10 ${errors.email ? 'border-red-500/50' : ''}`}
                  autoComplete="email"
                  id="reg-email"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Department (optional) */}
            <div>
              <label className="label">Department <span className="text-white/30">(optional)</span></label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="e.g. Engineering, Design, Marketing"
                  value={form.department}
                  onChange={set('department')}
                  className="input pl-10"
                  id="reg-department"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  className={`input pl-10 pr-11 ${errors.password ? 'border-red-500/50' : ''}`}
                  autoComplete="new-password"
                  id="reg-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= (strength || 0) ? strengthColors[strength] : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/40">{strengthLabels[strength]} password</span>
                </div>
              )}
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  className={`input pl-10 ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                  autoComplete="new-password"
                  id="reg-confirm-password"
                />
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Admin secret toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdminField(!showAdminField)}
                className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                id="toggle-admin-secret"
              >
                <ShieldCheck size={13} />
                {showAdminField ? 'Hide' : 'Register as admin'}
              </button>
              {showAdminField && (
                <div className="mt-2">
                  <input
                    type="password"
                    placeholder="Enter admin secret key"
                    value={form.adminSecret}
                    onChange={set('adminSecret')}
                    className="input text-sm"
                    id="reg-admin-secret"
                  />
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base mt-2"
              id="register-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">already have one?</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Link
            to="/login"
            className="btn-ghost w-full justify-center py-3 text-sm"
            id="goto-login"
          >
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
