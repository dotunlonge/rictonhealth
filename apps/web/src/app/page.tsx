import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="max-w-7xl mx-auto px-6 py-6 w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-teal-600 rounded-2xl text-xl shadow-lg shadow-teal-900/50">🏥</span>
          <span className="text-2xl font-black tracking-tight text-white">Ricton Health</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-900/40 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-800 text-teal-400 text-xs font-semibold uppercase tracking-wider">
            ✨ Next-Gen Healthcare Ecosystem
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Integrated Digital Health & Telemedicine
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl">
            Book virtual consultations with verified medical specialists, access digitally signed e-prescriptions, manage your in-app health wallet, and order doorstep pharmacy deliveries.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-teal-950 transition-all text-sm"
            >
              Start Consultation →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all text-sm"
            >
              Doctor / Hospital Portal
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-slate-800/60 rounded-3xl border border-slate-700/60 backdrop-blur-md space-y-3">
            <span className="text-3xl">🩺</span>
            <h3 className="font-bold text-base text-slate-100">Certified Specialists</h3>
            <p className="text-xs text-slate-400">Search and consult top licensed doctors across specialties.</p>
          </div>
          <div className="p-6 bg-slate-800/60 rounded-3xl border border-slate-700/60 backdrop-blur-md space-y-3">
            <span className="text-3xl">💊</span>
            <h3 className="font-bold text-base text-slate-100">Digital Pharmacy</h3>
            <p className="text-xs text-slate-400">Genuine medications fulfilled directly to your address.</p>
          </div>
          <div className="p-6 bg-slate-800/60 rounded-3xl border border-slate-700/60 backdrop-blur-md space-y-3">
            <span className="text-3xl">💳</span>
            <h3 className="font-bold text-base text-slate-100">Health Wallet</h3>
            <p className="text-xs text-slate-400">Seamless Paystack gateway deposits & automated settlements.</p>
          </div>
          <div className="p-6 bg-slate-800/60 rounded-3xl border border-slate-700/60 backdrop-blur-md space-y-3">
            <span className="text-3xl">🔒</span>
            <h3 className="font-bold text-base text-slate-100">HIPAA Compliant</h3>
            <p className="text-xs text-slate-400">Encrypted WebRTC consultation rooms & signed Rx records.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        © 2026 Ricton Healthcare Platform. All rights reserved.
      </footer>
    </div>
  );
}
