import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Users } from 'lucide-react';

const Register = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-in">
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200">
          <div className="bg-[linear-gradient(135deg,#0f172a_0%,#312e81_100%)] p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Workspace Provisioning</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Organizations and admin accounts are created by a platform super admin.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8 p-8 md:p-10">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Platform Security', text: 'Tenant isolation is controlled centrally so organizations cannot see each other.' },
                { icon: Users, title: 'Admin Assignment', text: 'A super admin provisions each organization and assigns its first admin owner.' },
                { icon: Building2, title: 'Brand Ownership', text: 'Admins can later update their own organization branding and manage members.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.75rem] bg-slate-50 p-5">
                  <item.icon className="h-6 w-6 text-indigo-600" />
                  <h2 className="mt-4 text-lg font-black text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50/60 p-6">
              <p className="text-sm font-bold text-indigo-900">
                Need access? Ask your platform super admin or your organization admin to provision your account.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/login" className="btn-primary h-14 min-w-[220px]">
                Sign In
              </Link>
              <Link to="/" className="rounded-2xl border border-slate-200 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-600 hover:border-indigo-200 hover:text-indigo-600">
                Back to Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
