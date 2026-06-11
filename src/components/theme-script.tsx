// Applies the saved theme, accent (+ soft tint) and font before paint (no flash).
// The Settings slice writes localStorage (and the DB); this just reads it early. (#063)
export function ThemeScript() {
  const code = `(function(){try{
    var d=document.documentElement;
    var t=localStorage.getItem('theme');
    var a=localStorage.getItem('accent');
    var f=localStorage.getItem('font');
    var dark = t==='dark' || (t==='system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if(dark) d.setAttribute('data-theme','dark');
    if(a){ d.style.setProperty('--accent', a); d.style.setProperty('--accent-soft', a + '22'); }
    if(f==='system') d.style.setProperty('--font-lato', "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif");
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
