import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Maximize, LoaderCircle, Minus, Plus, Search, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { getDocument, createDocumentUrl, fileTypeLabel } from '../lib/api';
import type { DocumentRecord } from '../types';
import { Button, Notice, StatusTag } from '../components/Primitives';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function FilePreviewPage() {
  const { id = '' } = useParams();
  const [file, setFile] = useState<DocumentRecord | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const record = await getDocument(id);
        if (!record) throw new Error('This file does not exist or is not publicly available.');
        if (cancelled) return;
        setFile(record);
        const signed = await createDocumentUrl(record, false);
        if (!cancelled) setUrl(signed);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this file.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const download = async () => {
    if (!file) return;
    setDownloading(true);
    try {
      const signed = await createDocumentUrl(file, true);
      const anchor = document.createElement('a'); anchor.href = signed; anchor.download = file.file_name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch (err) { setError(err instanceof Error ? err.message : 'Download failed.'); }
    finally { setDownloading(false); }
  };

  if (loading) return <div className="viewer-loading"><LoaderCircle className="spinner-icon" size={26}/><span>Preparing document…</span></div>;
  if (error || !file || !url) return <div className="viewer-fallback"><div className="viewer-fallback-card"><FileText size={28}/><h1>Document unavailable</h1><p>{error || 'The original file could not be loaded.'}</p><div className="button-row"><Link className="button button-secondary" to="/files"><ArrowLeft size={14}/>Back to files</Link>{file&&<Button onClick={()=>void download()}><Download size={14}/>Download original</Button>}</div></div></div>;

  const type = fileTypeLabel(file.mime_type, file.file_name);
  return <div className="document-viewer">
    <header className="viewer-toolbar">
      <div className="viewer-file-title"><Link to={`/files/${file.id}`} className="icon-button" aria-label="Back to file details"><ArrowLeft size={17}/></Link><div><strong>{file.title}</strong><small>{file.file_name} · {type} · {formatBytes(file.file_size)}</small></div></div>
      <div className="viewer-toolbar-actions"><StatusTag>{type} preview</StatusTag><Button variant="secondary" onClick={()=>void download()} disabled={downloading}><Download size={14}/>{downloading?'Preparing…':'Download original'}</Button><Link className="button button-quiet button-sm" to="/files">Close <X size={14}/></Link></div>
    </header>
    <main className="viewer-canvas">
      {type === 'PDF' && <PdfCanvas url={url} filename={file.file_name}/>}
      {type === 'Image' && <div className="image-preview-stage"><img src={url} alt={file.title}/></div>}
      {(type === 'XLS' || type === 'XLSX' || type === 'CSV') && <SpreadsheetPreview url={url} filename={file.file_name}/>}
      {!['PDF','Image','XLS','XLSX','CSV'].includes(type) && <div className="viewer-fallback-card"><FileText size={30}/><h2>Preview is not available for this format.</h2><p>The original file is available to download. No preview is shown for unsupported formats.</p><Button onClick={()=>void download()}><Download size={14}/>Download original</Button></div>}
    </main>
  </div>;
}

function PdfCanvas({url,filename}:{url:string;filename:string}) {
  const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [scale,setScale]=useState(1.12);
  const [fit,setFit]=useState<'page'|'width'>('page');
  const [search,setSearch]=useState('');
  const [matches,setMatches]=useState<Array<{page:number;snippet:string}>>([]);
  const [searchBusy,setSearchBusy]=useState(false);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const hostRef=useRef<HTMLDivElement>(null);
  const [rendering,setRendering]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    let disposed=false;let task: ReturnType<typeof pdfjs.getDocument>|null=null;
    setError('');setPdf(null);
    task=pdfjs.getDocument({url});
    task.promise.then(doc=>{if(disposed)return;setPdf(doc);setTotal(doc.numPages);setPage(1);}).catch(err=>{if(!disposed)setError(err instanceof Error?err.message:'The PDF could not be rendered.');});
    return()=>{disposed=true;void task?.destroy();};
  },[url]);

  useEffect(()=>{
    if(!pdf||!canvasRef.current||!hostRef.current)return;
    let cancelled=false;let renderTask: { promise: Promise<void>; cancel: () => void } | null = null;
    setRendering(true);
    pdf.getPage(page).then(async pdfPage=>{
      if(cancelled)return;
      const base=pdfPage.getViewport({scale:1});
      const available=Math.max(320,hostRef.current!.clientWidth-56);
      const widthScale=Math.min(2.2,available/base.width);
      const viewScale=fit==='width'?widthScale:Math.min(widthScale,1.35)*scale;
      const viewport=pdfPage.getViewport({scale:viewScale});
      const canvas=canvasRef.current!;const context=canvas.getContext('2d');if(!context)throw new Error('Canvas rendering is unavailable.');
      const ratio=window.devicePixelRatio||1;canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
      context.setTransform(ratio,0,0,ratio,0,0);
      const activeRenderTask = pdfPage.render({canvas,canvasContext:context,viewport});
      renderTask = activeRenderTask;
      await activeRenderTask.promise;
    }).catch(err=>{if(!cancelled)setError(err instanceof Error?err.message:'PDF page rendering failed.');}).finally(()=>{if(!cancelled)setRendering(false);});
    return()=>{cancelled=true;try{renderTask?.cancel();}catch{}}
  },[pdf,page,scale,fit]);

  const runSearch=async()=>{
    if(!pdf||!search.trim()) {setMatches([]);return;}
    setSearchBusy(true);const found:Array<{page:number;snippet:string}> = [];
    try{
      const term=search.trim().toLowerCase();
      for(let i=1;i<=pdf.numPages;i++){
        const p=await pdf.getPage(i);const content=await p.getTextContent();
        const line = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
        const at=line.toLowerCase().indexOf(term);
        if(at>=0)found.push({page:i,snippet:line.slice(Math.max(0,at-45),Math.min(line.length,at+term.length+65))});
      }
      setMatches(found);if(found[0])setPage(found[0].page);
    }catch(err){setError(err instanceof Error?err.message:'Search within PDF failed.');}
    finally{setSearchBusy(false);}
  };

  return <div className="pdf-reader">
    <div className="pdf-controls">
      <div className="pdf-page-controls"><button className="icon-button" onClick={()=>setPage(x=>Math.max(1,x-1))} disabled={page<=1}><ChevronLeft size={17}/></button><label>Page <input type="number" value={page} min={1} max={total} onChange={e=>setPage(Math.max(1,Math.min(total,Number(e.target.value)||1)))}/><span>of {total||'—'}</span></label><button className="icon-button" onClick={()=>setPage(x=>Math.min(total,x+1))} disabled={page>=total}><ChevronRight size={17}/></button></div>
      <div className="pdf-zoom-controls"><button className="icon-button" onClick={()=>{setFit('page');setScale(x=>Math.max(.55,x-.1));}} title="Zoom out"><Minus size={16}/></button><span>{Math.round(scale*100)}%</span><button className="icon-button" onClick={()=>{setFit('page');setScale(x=>Math.min(2.3,x+.1));}} title="Zoom in"><Plus size={16}/></button><button className={`icon-button ${fit==='width'?'selected':''}`} onClick={()=>setFit('width')} title="Fit to width"><Maximize size={16}/></button><button className={`icon-button ${fit==='page'?'selected':''}`} onClick={()=>{setFit('page');setScale(1);}} title="Fit to page">Fit</button></div>
      <div className="pdf-search"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void runSearch();}} placeholder="Find in document"/><button onClick={()=>void runSearch()} disabled={searchBusy}>{searchBusy?'…':'Find'}</button></div>
    </div>
    {matches.length>0&&<div className="pdf-search-results">{matches.slice(0,5).map((m,i)=><button key={`${m.page}-${i}`} onClick={()=>setPage(m.page)}><strong>Page {m.page}</strong><span>{m.snippet}</span></button>)}</div>}
    {error&&<Notice tone="warning">{error}</Notice>}
    <div className="pdf-document-area" ref={hostRef}><div className="pdf-page-wrap">{rendering&&<span className="pdf-rendering">Rendering page…</span>}<canvas ref={canvasRef} aria-label={`${filename}, page ${page}`}/></div></div>
  </div>;
}

function SpreadsheetPreview({url,filename}:{url:string;filename:string}) {
  const [rows,setRows]=useState<unknown[][]>([]);const [sheet,setSheet]=useState('');const [sheets,setSheets]=useState<string[]>([]);const [error,setError]=useState('');
  useEffect(()=>{let active=true;(async()=>{try{const response=await fetch(url);if(!response.ok)throw new Error('Unable to fetch the original file.');const buffer=await response.arrayBuffer();const book=XLSX.read(buffer,{type:'array'});if(!active)return;const names=book.SheetNames;setSheets(names);const first=names[0];setSheet(first);setRows(XLSX.utils.sheet_to_json(book.Sheets[first],{header:1,defval:''}) as unknown[][]);}catch(err){if(active)setError(err instanceof Error?err.message:'Spreadsheet preview failed.');}})();return()=>{active=false;}},[url]);
  const choose=(name:string)=>{setSheet(name);fetch(url).then(r=>r.arrayBuffer()).then(buffer=>{const book=XLSX.read(buffer,{type:'array'});setRows(XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:''}) as unknown[][]);}).catch(err=>setError(err.message));};
  return <div className="sheet-preview"><div className="sheet-preview-heading"><div><strong>{filename}</strong><small>Read-only spreadsheet preview</small></div><div className="sheet-tabs">{sheets.map(s=><button className={sheet===s?'active':''} key={s} onClick={()=>choose(s)}>{s}</button>)}</div></div>{error?<Notice tone="warning">{error}</Notice>:<div className="sheet-table-wrap"><table className="sheet-table"><tbody>{rows.slice(0,250).map((row,i)=><tr key={i}><th>{i+1}</th>{row.map((cell,j)=>i===0?<th key={j}>{String(cell)}</th>:<td key={j}>{String(cell)}</td>)}</tr>)}</tbody></table></div>}<p className="small muted">Preview only · Original workbook remains available through Download original.</p></div>;
}

function formatBytes(bytes:number){if(bytes<1024)return `${bytes} B`;if(bytes<1048576)return `${(bytes/1024).toFixed(0)} KB`;return `${(bytes/1048576).toFixed(1)} MB`;}
