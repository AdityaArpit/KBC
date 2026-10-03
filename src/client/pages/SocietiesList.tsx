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
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="border-b border-[#a9927d]/20 pb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
            KIIT Student Governance Bodies
          </span>
          <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">University Societies Directory</h1>
          <p className="text-xs text-[#a9927d] mt-1">Official student societies, clubs, and apex bodies under KIIT Student Activity Centre</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-[#a9927d]">
            <Loader2 className="w-5 h-5 animate-spin text-[#a9927d]" />
            Loading societies...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {societies.map((soc) => (
              <div
                key={soc.id}
                className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 p-6 hover:border-[#a9927d]/60 transition-all shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={soc.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
                      alt={soc.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-[#a9927d]/30"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">
                        {soc.category}
                      </span>
                      <h3 className="font-bold text-base text-[#f2f4f3] leading-snug">{soc.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-[#a9927d] leading-relaxed line-clamp-3">{soc.description}</p>
                </div>

                <div className="pt-4 border-t border-[#a9927d]/15 flex items-center justify-between text-xs">
                  <span className="text-[#a9927d] font-medium text-[11px]">
                    {soc.leadNames && soc.leadNames.length > 0 ? `Lead: ${soc.leadNames.join(', ')}` : 'Leads Assigned'}
                  </span>
                  <Link
                    to={`/societies/${soc.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/30 text-[#f2f4f3] text-xs font-bold rounded-xl transition-all shadow"
                  >
                    View Events <ArrowRight className="w-3.5 h-3.5 text-[#a9927d]" />
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
