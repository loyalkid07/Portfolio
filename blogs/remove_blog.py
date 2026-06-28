import os
import sys
import re

def main():
    if len(sys.argv) < 2:
        print("Usage: python remove_blog.py <filename_without_extension>")
        print("Example: python remove_blog.py example_blog")
        sys.exit(1)
        
    basename = sys.argv[1].replace('.md', '').replace('.html', '')
    filename = f"{basename}.html"
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Delete the generated HTML file if it exists
    html_path = os.path.join(script_dir, filename)
    if os.path.exists(html_path):
        os.remove(html_path)
        print(f"Deleted {html_path}")
    else:
        print(f"File {html_path} not found.")
        
    # 2. Remove the tile from index.html
    index_path = os.path.join(script_dir, '..', 'index.html')
    if not os.path.exists(index_path):
        print("Error: Could not find index.html")
        sys.exit(1)
        
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Regex to find the block between START BLOG and END BLOG
    pattern = rf"[\s]*<!-- START BLOG: {re.escape(filename)} -->.*?<!-- END BLOG: {re.escape(filename)} -->"
    
    new_content, count = re.subn(pattern, '', content, flags=re.DOTALL)
    
    if count > 0:
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully removed {filename} tile from index.html")
    else:
        print(f"No entry found in index.html for {filename}")

if __name__ == '__main__':
    main()
