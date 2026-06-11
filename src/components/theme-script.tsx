// Applies the saved theme + accent before paint (no flash). The Settings slice
// writes localStorage (and the DB); this just reads it early. (#063)
export function ThemeScript() {
  const code = `(function(){try{
    var t=localStorage.getItem('theme');
    var a=localStorage.getItem('accent');
    var dark = t==='dark' || (t==='system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if(dark) document.documentElement.setAttribute('data-theme','dark');
    if(a) document.documentElement.style.setProperty('--accent', a);
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
