
import React, { useState, useEffect } from 'react';
import { Plus, Download, Search, FileText, Trash2, ExternalLink, Loader2, Link as LinkIcon, AlertCircle, Info, Sparkles, MessageSquare, ShieldCheck, Key, Menu, X, Layers, Globe, ArrowRight, CheckCircle2, Target, ShoppingBag } from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { SEOArticle, MasterLinkStrategy, GenerationStep, Tone, WritingStyle, StackConfig } from './types';
import { wrapInFullDocument, downloadAsHtml } from './utils/htmlUtils';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [additionalKeywords, setAdditionalKeywords] = useState('');
  const [context, setContext] = useState('');
  
  // Master Link Strategy State
  const [linkStrategy, setLinkStrategy] = useState<MasterLinkStrategy>({
    primaryLink: { url: '', anchorText: '' },
    ctaUrl: '',
    ctaAnchors: ['', '', '', '']
  });

  const [tone, setTone] = useState<Tone>('positive');
  const [style, setStyle] = useState<WritingStyle>('neutral');
  const [includeDisclaimer, setIncludeDisclaimer] = useState(false);
  const [articles, setArticles] = useState<SEOArticle[]>([]);
  const [activeArticle, setActiveArticle] = useState<SEOArticle | null>(null);
  const [step, setStep] = useState<GenerationStep>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCustomKeyActive, setIsCustomKeyActive] = useState(false);

  // Stack Builder State
  const [supportingKeywordsText, setSupportingKeywordsText] = useState('');
  const [stackConfig, setStackConfig] = useState<StackConfig>({
    isActive: false,
    bucketUrl: '',
    supportingKeywords: []
  });

  useEffect(() => {
    const saved = localStorage.getItem('seo_articles');
    if (saved) setArticles(JSON.parse(saved));
    const checkKey = async () => {
      if (window.aistudio) {
        setIsCustomKeyActive(await window.aistudio.hasSelectedApiKey());
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('seo_articles', JSON.stringify(articles));
  }, [articles]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsCustomKeyActive(true);
    }
  };

  const toggleStackMode = () => {
    setStackConfig(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  const updateCtaAnchor = (index: number, val: string) => {
    const newAnchors = [...linkStrategy.ctaAnchors];
    newAnchors[index] = val;
    setLinkStrategy({ ...linkStrategy, ctaAnchors: newAnchors });
  };

  const addCtaAnchor = () => {
    if (linkStrategy.ctaAnchors.length < 6) {
      setLinkStrategy({ ...linkStrategy, ctaAnchors: [...linkStrategy.ctaAnchors, ''] });
    }
  };

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    if (stackConfig.isActive) {
      await generateStack();
    } else {
      await generateSingle();
    }
  };

  const generateSingle = async () => {
    setStep('writing');
    setStatusMessage('Engineering 2026 Master Page...');
    try {
      const gemini = new GeminiService();
      const result = await gemini.generateSEOArticle({
        keyword, additionalKeywords, context, linkStrategy, tone, style, includeDisclaimer
      }, setStatusMessage);

      const newArt: SEOArticle = {
        id: crypto.randomUUID(),
        keyword,
        filename: 'index.html',
        title: result.title,
        content: result.html,
        metaDescription: result.meta,
        status: 'completed',
        createdAt: Date.now(),
        sources: result.sources,
        tone, style, includeDisclaimer,
        isStackMaster: true
      };

      setArticles(prev => [newArt, ...prev]);
      setActiveArticle(newArt);
      setStep('idle');
    } catch (e) {
      setStep('idle');
      alert('Generation failed. Check API key.');
    }
  };

  const generateStack = async () => {
    const supporting = supportingKeywordsText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    setStep('stacking');
    setStatusMessage('Initializing SEO Stack Architecture...');
    const gemini = new GeminiService();
    const moneyPageUrl = stackConfig.bucketUrl ? `${stackConfig.bucketUrl.replace(/\/$/, '')}/index.html` : 'index.html';

    try {
      // 1. Generate Money Page
      setStatusMessage(`Building Money Page: ${keyword}...`);
      const masterResult = await gemini.generateSEOArticle({
        keyword, additionalKeywords, context, linkStrategy, tone, style, includeDisclaimer
      }, setStatusMessage);

      const masterArt: SEOArticle = {
        id: crypto.randomUUID(),
        keyword,
        filename: 'index.html',
        title: masterResult.title,
        content: masterResult.html,
        metaDescription: masterResult.meta,
        status: 'completed',
        createdAt: Date.now(),
        sources: masterResult.sources,
        tone, style, includeDisclaimer,
        isStackMaster: true
      };

      const newStack = [masterArt];

      // 2. Generate Supporting Pages
      for (const [idx, sKey] of supporting.entries()) {
        setStatusMessage(`Building Semantic Support ${idx + 1}/${supporting.length}: ${sKey}...`);
        const subResult = await gemini.generateSEOArticle({
          keyword: sKey,
          additionalKeywords: keyword, 
          context: `Semantic silo support for ${keyword}. Focus deeply on ${sKey}. No cannibalization.`,
          tone, style, includeDisclaimer,
          isSupportingPage: true,
          moneyPageUrl,
          moneyPageKeyword: keyword
        }, setStatusMessage);

        const subArt: SEOArticle = {
          id: crypto.randomUUID(),
          keyword: sKey,
          filename: `${slugify(sKey)}.html`,
          title: subResult.title,
          content: subResult.html,
          metaDescription: subResult.meta,
          status: 'completed',
          createdAt: Date.now(),
          sources: subResult.sources,
          tone, style, includeDisclaimer,
          isStackMaster: false
        };
        newStack.push(subArt);
      }

      setArticles(prev => [...newStack, ...prev]);
      setActiveArticle(masterArt);
      setStep('idle');
    } catch (e) {
      setStep('idle');
      alert('Stack generation failed.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Library
          </h2>
          <button onClick={() => {setActiveArticle(null); setStep('idle');}} className="text-xs text-blue-600 font-bold hover:underline">NEW</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => setActiveArticle(article)}
              className={`p-3 mb-2 rounded-lg cursor-pointer transition-all group ${activeArticle?.id === article.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-100 border-transparent border'}`}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-gray-900 truncate flex-1 uppercase tracking-tight">{article.title}</h3>
                <button onClick={(e) => {e.stopPropagation(); setArticles(articles.filter(a => a.id !== article.id));}} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[8px] font-black px-1 py-0.5 rounded ${article.isStackMaster ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {article.isStackMaster ? 'MONEY' : 'CLOUD'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{article.filename}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-md">
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-black tracking-tighter text-gray-900 italic uppercase">Ghostwriter <span className="text-blue-600">v2</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleOpenKeyDialog} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${isCustomKeyActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200'}`}>
               <Key className="w-4 h-4" /> {isCustomKeyActive ? 'Key Active' : 'Select Key'}
             </button>
             {activeArticle && (
               <button onClick={() => downloadAsHtml(activeArticle.filename, wrapInFullDocument(activeArticle.content, activeArticle.title, activeArticle.metaDescription))} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-200">
                 <Download className="w-4 h-4" /> Download {activeArticle.filename}
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {step === 'idle' && !activeArticle && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-center mb-8">
                <button 
                  onClick={toggleStackMode}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black transition-all border-2 ${stackConfig.isActive ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'}`}
                >
                  <Layers className="w-6 h-6" />
                  {stackConfig.isActive ? 'STACK BUILDER MODE ACTIVE' : 'SWITCH TO STACK BUILDER'}
                </button>
              </div>

              <section className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">Money Page Keyword (Master Pillar)</label>
                      <input 
                        type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                        placeholder="e.g. Best Solar Generators 2026"
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-xl"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 block">LSI Keywords (Bulk Paste)</label>
                      <textarea 
                        value={additionalKeywords} onChange={e => setAdditionalKeywords(e.target.value)} 
                        placeholder="One per line..."
                        className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold custom-scrollbar"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 block">Notes/Context</label>
                      <textarea 
                        value={context} onChange={e => setContext(e.target.value)} 
                        placeholder="e.g. focus on off-grid tech"
                        className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold custom-scrollbar"
                      />
                    </div>
                  </div>

                  {/* MASTER LINK STRATEGY */}
                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-6">
                      <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-widest">
                        <Target className="w-4 h-4" /> 1. Primary SEO "Do-Follow" Link
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" placeholder="URL (Destination)" value={linkStrategy.primaryLink.url}
                          onChange={e => setLinkStrategy({...linkStrategy, primaryLink: {...linkStrategy.primaryLink, url: e.target.value}})}
                          className="px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none text-sm font-mono"
                        />
                        <input 
                          type="text" placeholder="Anchor Text" value={linkStrategy.primaryLink.anchorText}
                          onChange={e => setLinkStrategy({...linkStrategy, primaryLink: {...linkStrategy.primaryLink, anchorText: e.target.value}})}
                          className="px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none text-sm font-bold"
                        />
                      </div>
                      <p className="text-[10px] text-blue-400 font-bold italic">* This link will be engineered into the first 100 words with <strong> highlight.</p>
                    </div>

                    <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-700 font-black text-xs uppercase tracking-widest">
                          <ShoppingBag className="w-4 h-4" /> 2. Sponsored CTA Group (No-Follow)
                        </div>
                        <button onClick={addCtaAnchor} className="text-[9px] bg-purple-600 text-white px-3 py-1 rounded-full font-black">
                          + ADD ANCHOR
                        </button>
                      </div>
                      <input 
                        type="text" placeholder="CTA Shared URL (e.g. Amazon Affiliate link)" value={linkStrategy.ctaUrl}
                        onChange={e => setLinkStrategy({...linkStrategy, ctaUrl: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl outline-none text-sm font-mono"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        {linkStrategy.ctaAnchors.map((anchor, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-purple-300 w-3">{idx+1}</span>
                            <input 
                              type="text" value={anchor} onChange={e => updateCtaAnchor(idx, e.target.value)}
                              placeholder="e.g. Check Price on Amazon"
                              className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg outline-none text-xs font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {stackConfig.isActive && (
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-200 space-y-4">
                      <div className="flex items-center gap-2 text-gray-700 font-black text-xs uppercase tracking-widest">
                        <Globe className="w-4 h-4" /> Bucket Deployment Config
                      </div>
                      <input 
                        type="text" value={stackConfig.bucketUrl} onChange={e => setStackConfig({...stackConfig, bucketUrl: e.target.value})}
                        placeholder="https://my-seo-bucket.s3.amazonaws.com"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-sm font-mono"
                      />
                      <p className="text-[10px] text-gray-400 font-bold">Cloud articles will link back to index.html at this URL.</p>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 border-l border-gray-100 pl-8 space-y-6">
                  {stackConfig.isActive ? (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Supporting Cloud Keywords (Bulk)</label>
                      <textarea 
                        value={supportingKeywordsText}
                        onChange={e => setSupportingKeywordsText(e.target.value)}
                        placeholder="One keyword per line..."
                        className="w-full h-80 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none text-xs font-bold leading-relaxed focus:border-blue-500 transition-all custom-scrollbar"
                      />
                      <p className="text-[9px] text-blue-500 font-black uppercase italic">Internal links back to Pillar included automatically.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Single Page Config</h3>
                      <div className="flex gap-2">
                        {['positive', 'neutral', 'negative'].map(t => (
                          <button key={t} onClick={() => setTone(t as Tone)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${tone === t ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['authoritative', 'friendly', 'witty'].map(s => (
                          <button key={s} onClick={() => setStyle(s as WritingStyle)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${style === s ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setIncludeDisclaimer(!includeDisclaimer)} className={`w-full p-3 rounded-xl border text-[10px] font-black uppercase flex justify-between items-center transition-all ${includeDisclaimer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        Affiliate Disclaimer {includeDisclaimer ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  
                  <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                    <h4 className="text-[10px] font-black text-yellow-700 uppercase mb-1 flex items-center gap-1"><Info className="w-3 h-3"/> Bulk Workflow</h4>
                    <p className="text-[10px] text-yellow-600 leading-relaxed italic">
                      Paste your entire LSI list and Supporting Keyword list directly from your research sheet.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate} disabled={!keyword.trim()}
                  className="lg:col-span-12 w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black text-xl shadow-2xl shadow-blue-200 disabled:opacity-50 transition-all flex items-center justify-center gap-4"
                >
                  {stackConfig.isActive ? <Layers className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  {stackConfig.isActive ? `GENERATE SEMANTIC STACK` : 'GENERATE MASTER PILLAR PAGE'}
                </button>
              </section>
            </div>
          )}

          {step !== 'idle' && (
             <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full space-y-8 pt-20">
               <div className="relative">
                  <div className="w-24 h-24 border-8 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Layers className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
               </div>
               <div className="text-center space-y-4">
                 <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase tracking-tighter">AI Architecting</h2>
                 <div className="px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest animate-pulse">
                   {statusMessage}
                 </div>
                 <p className="text-gray-400 text-sm font-bold italic">Building semantic silos and mapping internal link flows...</p>
               </div>
             </div>
          )}

          {step === 'idle' && activeArticle && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-700">
               <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                 <div className="p-6 bg-gray-900 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded ${activeArticle.isStackMaster ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                        {activeArticle.isStackMaster ? 'MONEY PAGE' : 'SUPPORT CLOUD'}
                      </span>
                      <h2 className="text-white font-bold truncate max-w-md italic">{activeArticle.title}</h2>
                    </div>
                    <button onClick={() => setActiveArticle(null)} className="text-gray-400 hover:text-white transition-colors"><X/></button>
                 </div>
                 
                 <div className="p-8 md:p-12 prose prose-blue max-w-none">
                    <div className="mb-10 p-6 bg-blue-50 border-l-8 border-blue-500 rounded-r-2xl font-bold text-blue-900 text-lg italic shadow-sm">
                       <span className="block text-[10px] uppercase font-black tracking-widest text-blue-400 mb-2 not-italic">Search Snippet & Meta</span>
                       "{activeArticle.metaDescription}"
                    </div>
                    
                    <div dangerouslySetInnerHTML={{ __html: activeArticle.content }} className="seo-content-preview" />

                    {activeArticle.sources.length > 0 && (
                      <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-100">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                           <Globe className="w-4 h-4"/> 2026 Grounding Sources
                         </h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeArticle.sources.map((s, i) => (
                              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 flex items-center justify-between group transition-all">
                                <span className="text-sm font-bold text-gray-700 truncate">{s.title}</span>
                                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                              </a>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>
               </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .seo-content-preview h1 { font-size: 2.75rem; font-weight: 900; margin-bottom: 2rem; color: #111827; line-height: 1.1; letter-spacing: -0.05em; }
        .seo-content-preview h2 { font-size: 1.85rem; font-weight: 800; margin-top: 3.5rem; margin-bottom: 1.5rem; color: #1f2937; border-left: 6px solid #2563eb; padding-left: 1rem; }
        .seo-content-preview h3 { font-size: 1.45rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #374151; }
        .seo-content-preview p { font-size: 1.15rem; line-height: 1.9; margin-bottom: 1.75rem; color: #4b5563; }
        .seo-content-preview strong { color: #111827; font-weight: 800; }
        .seo-content-preview a { color: #2563eb; font-weight: 700; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
        .seo-content-preview ul { margin-bottom: 2rem; list-style: square; padding-left: 1.5rem; }
        .seo-content-preview li { margin-bottom: 0.8rem; font-size: 1.1rem; color: #4b5563; }
        .seo-content-preview table { width: 100%; border-radius: 1rem; overflow: hidden; border-collapse: separate; border-spacing: 0; border: 2px solid #f3f4f6; margin: 3rem 0; }
        .seo-content-preview th { background: #f9fafb; padding: 1.25rem; text-align: left; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; color: #6b7280; letter-spacing: 0.1em; }
        .seo-content-preview td { padding: 1.25rem; border-top: 1px solid #f3f4f6; color: #374151; font-weight: 500; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
