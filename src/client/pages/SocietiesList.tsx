import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, Loader2 } from 'lucide-react';
import { Society } from '../../shared/types.ts';

export const SocietiesList: React.FC = () => {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/societies');
        if (res.ok) {
          const data = await res.json();
          setSocieties(data.societies || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">University Societies Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Official student societies, clubs, and apex bodies under KIIT Student Activity Centre</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            Loading societies...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {societies.map((soc) => (
              <div
                key={soc.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={soc.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
                      alt={soc.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        {soc.category}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">{soc.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{soc.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {soc.leadNames && soc.leadNames.length > 0 ? `Lead: ${soc.leadNames.join(', ')}` : 'Leads Assigned'}
                  </span>
                  <Link
                    to={`/societies/${soc.id}`}
                    className="flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                  >
                    View Events <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
