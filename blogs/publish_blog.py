import os
import sys
import re
try:
    import markdown
except ImportError:
    print("Please install markdown: pip install markdown")
    sys.exit(1)

def parse_frontmatter(content):
    frontmatter = {}
    body = content
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            fm_text = parts[1]
            body = parts[2]
            for line in fm_text.strip().split('\n'):
                if ':' in line:
                    key, val = line.split(':', 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    
                    if key == 'tags':
                        # simple array parse e.g. ["Python", "Async"] or Python, Async
                        val = val.strip('[]').replace('"', '').replace("'", "")
                        frontmatter[key] = [v.strip() for v in val.split(',')]
                    else:
                        frontmatter[key] = val
    return frontmatter, body

def create_blog_tile(fm, filename):
    tags_html = "".join([f'<span class="glass-pill px-3 py-1 font-mono text-[9px] uppercase font-bold">{t}</span>' for t in fm.get('tags', [])])
    
    tile = f"""                <!-- START BLOG: {filename} -->
                <a href="blogs/{filename}" class="writing-tile glass-tile p-10 md:p-12 cursor-pointer flex flex-col justify-between group" style="border-radius:16px; text-decoration:none; color:inherit;">
                    <div>
                        <div class="flex justify-between items-start mb-10">
                            <div class="font-mono text-[11px] tracking-[0.2em] font-bold opacity-25 group-hover:opacity-100 transition-opacity">{fm.get('id', 'BLOG_X')}</div>
                            <div class="flex gap-2 flex-wrap justify-end">
                                {tags_html}
                            </div>
                        </div>
                        <h2 class="font-serif text-4xl md:text-5xl font-bold mb-7 tracking-tighter uppercase leading-none">{fm.get('title', 'Untitled')}</h2>
                        <p class="font-sans text-base leading-relaxed font-medium opacity-55 group-hover:opacity-85 transition-opacity max-w-md">{fm.get('subtitle', '')}</p>
                    </div>
                    <div class="flex justify-between items-center mt-10">
                        <span class="font-mono text-[10px] font-black group-hover:text-accent tracking-[0.18em] uppercase transition-colors">READ_MORE →</span>
                        <span class="font-mono text-[9px] opacity-25 uppercase tracking-widest">{fm.get('read_time', '~5 MIN')}</span>
                    </div>
                </a>
                <!-- END BLOG: {filename} -->
"""
    return tile

def main():
    if len(sys.argv) < 2:
        print("Usage: python publish_blog.py <path_to_markdown>")
        sys.exit(1)
        
    md_file = sys.argv[1]
    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found.")
        sys.exit(1)
        
    # Read Markdown
    with open(md_file, 'r', encoding='utf-8') as f:
        raw_content = f.read()
        
    fm, md_body = parse_frontmatter(raw_content)
    
    # Pre-process mermaid blocks
    # Convert ```mermaid ... ``` to <div class="mermaid">...</div>
    def repl_mermaid(m):
        return f'''<div class="my-10 relative mermaid-container p-4 md:p-8" style="background:var(--input-bg); border-radius:12px; border:1px solid var(--outline-color);">
    <div class="absolute top-0 right-0 p-3 md:p-5 flex items-center gap-4 md:gap-6 z-10">
        <button onclick="openMermaidZoom(this)" class="font-mono text-[10px] opacity-40 hover:opacity-100 font-bold uppercase transition-all flex items-center gap-1 hover:text-accent">
            <span class="material-symbols-outlined text-[14px]">zoom_in</span> ZOOM
        </button>
        <div class="font-mono text-[10px] opacity-20 font-bold uppercase pointer-events-none hidden sm:block">DIAGRAM</div>
    </div>
    <div class="mermaid flex justify-center mt-6 md:mt-4">
{m.group(1)}
    </div>
</div>'''
    
    md_body = re.sub(r'```mermaid\n(.*?)\n```', repl_mermaid, md_body, flags=re.DOTALL)
    
    # Pre-process Obsidian Images ![[image.png]]
    import shutil
    def repl_obsidian_img(m):
        img_name = m.group(1).strip()
        src = os.path.join(r"D:\Dev\Shrey's Vault", img_name)
        dst = os.path.join(script_dir, '..', 'assets', img_name)
        if os.path.exists(src) and not os.path.exists(dst):
            try:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                print(f"Auto-copied {img_name} from Obsidian vault to assets directory.")
            except Exception as e:
                print(f"Warning: Could not copy {img_name}: {e}")
        return f'<img src="../assets/{img_name}" alt="{img_name}">'
        
    md_body = re.sub(r'!\[\[(.*?)\]\]', repl_obsidian_img, md_body)

    # Convert to HTML
    html_content = markdown.markdown(md_body, extensions=['fenced_code', 'tables'])
    
    # Post-process HTML for custom styles
    
    # 1. Blockquotes -> <div class="beat">
    html_content = html_content.replace('<blockquote>', '<div class="beat">').replace('</blockquote>', '</div>')
    
    # 2. Numbered Headers -> <h2 class="...">
    def repl_h2(m):
        num = m.group(1).strip()
        title = m.group(2).strip()
        return f'<h2 class="flex items-end gap-4 md:gap-6"><span class="text-5xl md:text-6xl font-black leading-none opacity-50" style="color:var(--accent-color)">{num}</span><span class="pb-2">{title}</span></h2>'
        
    html_content = re.sub(r'<h2>(\d+)\s*--\s*(.*?)</h2>', repl_h2, html_content)
    
    # Read Template
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(script_dir, 'template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
        
    # Inject variables
    # Handle Hero Section
    hero_img = fm.get('hero_image')
    if hero_img:
        hero_section = f'<div class="w-full mb-16"><img src="{hero_img}" class="w-full h-auto rounded-xl border" style="border-color:var(--outline-color);" alt="Hero"></div>'
    else:
        hero_text_big = fm.get('hero_text_big', 'BLOG')
        hero_text_small = fm.get('hero_text_small', 'READING')
        hero_section = f'''<div class="w-full aspect-[21/9] flex items-center justify-center border mb-16 relative overflow-hidden" style="background:var(--input-bg); border-color:var(--outline-color); border-radius: 12px;">
        <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, var(--accent-color) 0, var(--accent-color) 1px, transparent 1px, transparent 10px);"></div>
        <div class="font-serif text-6xl sm:text-8xl md:text-[100px] font-black tracking-tighter opacity-10 uppercase leading-[0.9] text-center px-4 w-full break-words" style="word-break: break-word; color:var(--text-color);">{hero_text_big}</div>
        <div class="absolute font-mono text-[10px] tracking-[0.4em] uppercase font-bold text-center px-4" style="color:var(--accent-color)">{hero_text_small}</div>
    </div>'''

    template = template.replace('{{BLOG_TITLE}}', fm.get('title', 'Untitled'))
    template = template.replace('{{BLOG_SUBTITLE}}', fm.get('subtitle', ''))
    template = template.replace('{{BLOG_DATE}}', fm.get('date', 'DATE'))
    template = template.replace('{{BLOG_ID}}', fm.get('id', 'BLOG_X'))
    template = template.replace('{{HERO_SECTION}}', hero_section)
    template = template.replace('{{BLOG_CONTENT}}', html_content)
    
    # Save the generated HTML
    basename = os.path.splitext(os.path.basename(md_file))[0]
    out_file = os.path.join(script_dir, f"{basename}.html")
    
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(template)
        
    print(f"Successfully generated {out_file}")
    
    # Update index.html
    index_path = os.path.join(script_dir, '..', 'index.html')
    with open(index_path, 'r', encoding='utf-8') as f:
        index_content = f.read()
        
    # We want to insert the new tile before the Ghost tile
    ghost_tile_marker = '<!-- Ghost tile -->'
    if ghost_tile_marker in index_content:
        new_tile = create_blog_tile(fm, f"{basename}.html")
        # Check if it already exists to avoid duplicates
        if f'href="blogs/{basename}.html"' not in index_content:
            index_content = index_content.replace(ghost_tile_marker, new_tile + '\n                ' + ghost_tile_marker)
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(index_content)
            print(f"Successfully injected {basename}.html into index.html")
        else:
            print(f"{basename}.html is already in index.html. Skipping injection.")
    else:
        print("Warning: Could not find '<!-- Ghost tile -->' in index.html. Skipping homepage update.")

if __name__ == '__main__':
    main()
