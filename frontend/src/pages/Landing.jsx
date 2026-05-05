import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Zap, Globe, MessageSquare, 
  BarChart, ArrowRight, CheckCircle, 
  Layers, Users, Star, TrendingUp, Sparkles
} from 'lucide-react';

const Landing = () => {
  return (
    <div className="bg-white min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
      {/* Dynamic Navbar for Landing */}
      <nav className="fixed top-0 left-0 right-0 z-[100] py-6 px-10">
        <div className="container mx-auto flex justify-between items-center bg-white/70 backdrop-blur-2xl px-10 py-4 rounded-[2rem] border border-white/50 shadow-2xl shadow-indigo-100/20">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">SmartMS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-bold text-slate-500 text-sm">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Enterprise</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="font-bold text-slate-600 hover:text-indigo-600 px-4">Sign In</Link>
            <Link to="/register" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
              Access Model
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-50/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>

        <div className="container mx-auto px-10 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-slate-100 shadow-xl shadow-indigo-50/50 text-indigo-600 text-xs font-black uppercase tracking-widest mb-12 animate-in">
            <Sparkles className="w-4 h-4" />
            <span>Redefining Incident Response</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.95] tracking-tight mb-10 max-w-5xl mx-auto animate-in">
            Multi-Tenant Service Ops <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Built for Real Organizations.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-500 mb-14 max-w-3xl mx-auto leading-relaxed font-medium animate-in">
            Private workspace isolation, custom permissions, and live complaint coordination. <br className="hidden md:block" />
            Every organization sees only its own data.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center animate-in">
            <Link to="/login" className="btn-primary px-12 py-5 text-lg group">
              Enter Platform
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <div className="flex -space-x-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                  {i}
                </div>
              ))}
              <div className="pl-6 text-left flex flex-col justify-center">
                <div className="flex text-amber-400"><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">4.9/5 from 2k+ reviews</span>
              </div>
            </div>
          </div>

          <div className="mt-32 relative animate-in">
            <div className="bg-slate-900 p-2 md:p-6 rounded-[3rem] shadow-2xl shadow-indigo-200 overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200" 
                alt="SmartMS Dashboard" 
                className="rounded-[2rem] opacity-90 grayscale hover:grayscale-0 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
            </div>
            {/* Floating cards over image */}
            <div className="absolute -left-10 top-1/4 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 animate-bounce hidden lg:block">
              <TrendingUp className="w-8 h-8 text-emerald-500" />
              <p className="mt-2 font-black text-2xl text-slate-900">+84%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Resolution Speed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-10">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
              <h2 className="text-5xl font-black text-slate-900 mb-8 leading-tight">
                Enterprise-Ready <br />
                From Day One.
              </h2>
              <div className="space-y-10">
                {[
                  { title: "Tenant Isolation", desc: "Each organization owns its users, roles, incidents, and realtime event stream.", icon: Shield },
                  { title: "Live Sync", desc: "Native WebSocket delivery keeps reporters, responders, and admins aligned instantly.", icon: Zap },
                  { title: "Permission Blueprints", desc: "Design custom role packs per organization while preserving core system controls.", icon: Layers }
                ].map((f, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="bg-white p-4 rounded-2xl shadow-xl group-hover:bg-indigo-600 transition-colors">
                      <f.icon className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h4>
                      <p className="text-slate-500 leading-relaxed max-w-sm">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6">
              <div className="space-y-6 pt-12">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                  <BarChart className="w-10 h-10 text-indigo-600 mb-6" />
                  <p className="text-lg font-bold text-slate-900">Predictive Analytics</p>
                </div>
                <div className="bg-indigo-600 p-10 rounded-[3rem] shadow-xl text-white">
                  <Users className="w-10 h-10 mb-6" />
                  <p className="text-lg font-bold">Role Isolation</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl text-white">
                  <Globe className="w-10 h-10 mb-6" />
                  <p className="text-lg font-bold">Global Scale</p>
                </div>
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                  <MessageSquare className="w-10 h-10 text-violet-600 mb-6" />
                  <p className="text-lg font-bold">Socket Sync</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 relative">
        <div className="container mx-auto px-10 text-center">
          <h2 className="text-6xl md:text-7xl font-black text-slate-900 mb-10 tracking-tight">Ready for a <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Better</span> Workflow?</h2>
          <p className="text-2xl text-slate-500 mb-16 max-w-3xl mx-auto">Join the 10,000+ teams who have upgraded their incident management process.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link to="/register" className="btn-primary px-16 py-6 text-xl shadow-2xl shadow-indigo-200">
              Create Free Workspace
            </Link>
            <p className="text-slate-400 font-bold text-sm">No credit card required. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* Simplified Footer */}
      <footer className="py-20 border-t border-slate-100 bg-white">
        <div className="container mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <span className="text-3xl font-black text-slate-900 tracking-tighter">SmartMS</span>
          </div>
          <div className="flex gap-12 text-sm font-black text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
